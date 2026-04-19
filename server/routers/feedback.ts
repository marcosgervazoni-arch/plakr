import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { feedbackResponses } from "../../drizzle/schema";
import { eq, and, gte, desc, sql, count, avg } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Contextos válidos de feedback
const VALID_CONTEXTS = [
  "create_pool",
  "first_bet",
  "invite_member",
  "accept_invite",
  "pool_ended",
  "game_result",
] as const;

// Janela de silêncio: 30 dias entre feedbacks do mesmo tipo+contexto por usuário
const SILENCE_WINDOW_DAYS = 30;

export const feedbackRouter = router({
  // ─── submitFeedback ────────────────────────────────────────────────────────
  // Salva uma resposta de feedback (CES ou CSAT) do usuário autenticado.
  // Respeita janela de silêncio de 30 dias por tipo+contexto.
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ces", "csat"]),
        context: z.enum(VALID_CONTEXTS),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
        poolId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const userId = ctx.user.id;

      // Verificar janela de silêncio: não coletar se já respondeu nos últimos 30 dias
      const silenceDate = new Date();
      silenceDate.setDate(silenceDate.getDate() - SILENCE_WINDOW_DAYS);

      const recent = await db
        .select({ id: feedbackResponses.id })
        .from(feedbackResponses)
        .where(
          and(
            eq(feedbackResponses.userId, userId),
            eq(feedbackResponses.type, input.type),
            eq(feedbackResponses.context, input.context),
            gte(feedbackResponses.createdAt, silenceDate)
          )
        )
        .limit(1);

      if (recent.length > 0) {
        // Silêncio ativo — não retornar erro, apenas ignorar silenciosamente
        return { saved: false, reason: "silence_window" };
      }

      await db.insert(feedbackResponses).values({
        userId,
        type: input.type,
        context: input.context,
        score: input.score,
        comment: input.comment ?? null,
        poolId: input.poolId ?? null,
      });

      return { saved: true };
    }),

  // ─── getFeedbackStats (admin) ──────────────────────────────────────────────
  // Retorna estatísticas agregadas de feedback para o painel admin.
  getStats: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
        type: z.enum(["ces", "csat", "all"]).default("all"),
        context: z.enum([...VALID_CONTEXTS, "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      // Filtros dinâmicos
      const conditions = [gte(feedbackResponses.createdAt, since)];
      if (input.type !== "all") {
        conditions.push(eq(feedbackResponses.type, input.type));
      }
      if (input.context !== "all") {
        conditions.push(eq(feedbackResponses.context, input.context as typeof VALID_CONTEXTS[number]));
      }

      // Score médio geral
      const [overall] = await db
        .select({
          avgScore: avg(feedbackResponses.score),
          total: count(feedbackResponses.id),
        })
        .from(feedbackResponses)
        .where(and(...conditions));

      // Score médio por contexto
      const byContext = await db
        .select({
          context: feedbackResponses.context,
          type: feedbackResponses.type,
          avgScore: avg(feedbackResponses.score),
          total: count(feedbackResponses.id),
        })
        .from(feedbackResponses)
        .where(and(...conditions))
        .groupBy(feedbackResponses.context, feedbackResponses.type)
        .orderBy(feedbackResponses.context);

      // Distribuição de scores (1-5)
      const distribution = await db
        .select({
          score: feedbackResponses.score,
          total: count(feedbackResponses.id),
        })
        .from(feedbackResponses)
        .where(and(...conditions))
        .groupBy(feedbackResponses.score)
        .orderBy(feedbackResponses.score);

      // Comentários recentes (notas baixas: CES ≤2 ou CSAT ≤3)
      const comments = await db
        .select({
          id: feedbackResponses.id,
          type: feedbackResponses.type,
          context: feedbackResponses.context,
          score: feedbackResponses.score,
          comment: feedbackResponses.comment,
          createdAt: feedbackResponses.createdAt,
        })
        .from(feedbackResponses)
        .where(
          and(
            gte(feedbackResponses.createdAt, since),
            sql`${feedbackResponses.comment} IS NOT NULL AND ${feedbackResponses.comment} != ''`
          )
        )
        .orderBy(desc(feedbackResponses.createdAt))
        .limit(50);

      // Evolução diária (últimos N dias)
      const dailyTrend = await db
        .select({
          date: sql<string>`DATE(${feedbackResponses.createdAt})`,
          type: feedbackResponses.type,
          avgScore: avg(feedbackResponses.score),
          total: count(feedbackResponses.id),
        })
        .from(feedbackResponses)
        .where(and(...conditions))
        .groupBy(sql`DATE(${feedbackResponses.createdAt})`, feedbackResponses.type)
        .orderBy(sql`DATE(${feedbackResponses.createdAt})`);

      // Alerta: CSAT < 3 em >20% das respostas
      const csatTotal = distribution
        .filter((d: { score: number; total: unknown }) => d.score !== undefined)
        .reduce((acc: number, d: { score: number; total: unknown }) => acc + Number(d.total), 0);
      const csatLow = distribution
        .filter((d: { score: number; total: unknown }) => d.score <= 3)
        .reduce((acc: number, d: { score: number; total: unknown }) => acc + Number(d.total), 0);
      const csatLowPct = csatTotal > 0 ? (csatLow / csatTotal) * 100 : 0;
      const hasAlert = csatLowPct > 20 && csatTotal >= 10;

      return {
        overall: {
          avgScore: overall?.avgScore ? Number(Number(overall.avgScore).toFixed(2)) : null,
          total: Number(overall?.total ?? 0),
        },
        byContext,
        distribution,
        comments,
        dailyTrend,
        alert: hasAlert
          ? {
              message: `⚠️ ${csatLowPct.toFixed(0)}% das respostas recentes têm nota ≤3. Atenção à experiência do usuário.`,
              pct: csatLowPct,
            }
          : null,
      };
    }),

  // ─── getRecentComments (admin) ─────────────────────────────────────────────
  // Lista os comentários mais recentes com filtros.
  getComments: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
        type: z.enum(["ces", "csat", "all"]).default("all"),
        maxScore: z.number().int().min(1).max(5).default(5),
        limit: z.number().int().min(1).max(200).default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const conditions = [
        gte(feedbackResponses.createdAt, since),
        sql`${feedbackResponses.comment} IS NOT NULL AND ${feedbackResponses.comment} != ''`,
      ];
      if (input.type !== "all") {
        conditions.push(eq(feedbackResponses.type, input.type));
      }
      if (input.maxScore < 5) {
        conditions.push(sql`${feedbackResponses.score} <= ${input.maxScore}`);
      }

      const rows = await db
        .select({
          id: feedbackResponses.id,
          type: feedbackResponses.type,
          context: feedbackResponses.context,
          score: feedbackResponses.score,
          comment: feedbackResponses.comment,
          createdAt: feedbackResponses.createdAt,
        })
        .from(feedbackResponses)
        .where(and(...conditions))
        .orderBy(desc(feedbackResponses.createdAt))
        .limit(input.limit);

      return rows;
    }),
});
