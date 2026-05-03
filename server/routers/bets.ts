/**
 * Plakr! — Router de Palpites (Bets)
 * [T1] Modularizado a partir de server/routers.ts
 * [T3] myBets com paginação cursor-based
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import logger from "../logger";
import {
  getGameById,
  getPoolById,
  getPoolMember,
  getPoolScoringRules,
  upsertBet,
  recalculateMemberStats,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr, TournamentErr, UserErr } from "../errors";

export const betsRouter = router({
  // [T3] paginação cursor-based adicionada
  myBets: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      limit: z.number().min(1).max(200).default(200),
      cursor: z.number().optional(), // ID do último bet retornado
    }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member) throw Err.forbidden();
      // [SEC] Bloquear acesso de membros com pagamento pendente ou rejeitado
      if (member.memberStatus && member.memberStatus !== "active") throw Err.forbidden();

      const db = await (await import("../db")).getDb();
      if (!db) return { items: [], nextCursor: undefined, hasMore: false };

      const { bets: betsT } = await import("../../drizzle/schema");
      const { eq, and, lt, desc } = await import("drizzle-orm");

      const conditions = [
        eq(betsT.poolId, input.poolId),
        eq(betsT.userId, ctx.user.id),
      ];
      if (input.cursor) {
        conditions.push(lt(betsT.id, input.cursor));
      }

      const rows = await db
        .select()
        .from(betsT)
        .where(and(...conditions))
        .orderBy(desc(betsT.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor, hasMore };
    }),

  placeBet: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      gameId: z.number(),
      predictedScoreA: z.number().min(0).max(99),
      predictedScoreB: z.number().min(0).max(99),
    }))
    .mutation(async ({ input, ctx }) => {
      // Helper para gravar auditoria sem bloquear o fluxo principal
      const auditBet = async (action: "create" | "update" | "error", extra?: { errorCode?: string; errorMessage?: string }) => {
        try {
          const db = await (await import("../db")).getDb();
          if (!db) return;
          const { betAuditLog } = await import("../../drizzle/schema");
          const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? ctx.req.ip ?? null;
          const ua = (ctx.req.headers["user-agent"] as string)?.slice(0, 512) ?? null;
          await db.insert(betAuditLog).values({
            userId: ctx.user.id,
            poolId: input.poolId,
            gameId: input.gameId,
            action,
            predictedScoreA: input.predictedScoreA,
            predictedScoreB: input.predictedScoreB,
            errorCode: extra?.errorCode ?? null,
            errorMessage: extra?.errorMessage ?? null,
            ipAddress: ip,
            userAgent: ua,
          });
        } catch (e) {
          logger.warn({ err: e }, "[BetAudit] Falha ao gravar auditoria");
        }
      };

      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || member.isBlocked) {
        await auditBet("error", { errorCode: "FORBIDDEN", errorMessage: "Membro bloqueado ou não encontrado" });
        throw Err.forbidden();
      }
      // [SEC] Bloquear palpites de membros com pagamento pendente ou rejeitado
      if (member.memberStatus && member.memberStatus !== "active") {
        const msg = member.memberStatus === "pending_approval"
          ? "Sua inscrição está aguardando aprovação do organizador. Você poderá fazer palpites após a confirmação do pagamento."
          : "Sua inscrição foi recusada. Você não pode fazer palpites neste bolão.";
        await auditBet("error", { errorCode: "PAYMENT_PENDING", errorMessage: msg });
        throw new TRPCError({ code: "FORBIDDEN", message: msg });
      }

      const game = await getGameById(input.gameId);
      if (!game) {
        await auditBet("error", { errorCode: "NOT_FOUND", errorMessage: "Jogo não encontrado" });
        throw Err.notFound("Recurso");
      }
      // [S9] Validar que o jogo pertence ao torneio do bolão
      const pool = await getPoolById(input.poolId);
      if (!pool || game.tournamentId !== pool.tournamentId) {
        await auditBet("error", { errorCode: "GAME_NOT_IN_POOL", errorMessage: "Jogo não pertence ao torneio do bolão" });
        throw PoolErr.gameNotInPool();
      }
      // [SEC] Bloquear palpites em bolões encerrados ou aguardando conclusão
      if (pool.status !== "active") {
        await auditBet("error", { errorCode: "POOL_CLOSED", errorMessage: "Bolão encerrado" });
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Este bolão já foi encerrado. Não é possível fazer novos palpites.",
        });
      }
      if (game.status === "finished" || game.status === "live") {
        await auditBet("error", { errorCode: "GAME_STARTED", errorMessage: `Jogo já iniciado ou encerrado (status=${game.status})` });
        throw PoolErr.gameStarted();
      }

      // Verificar prazo
      const rules = await getPoolScoringRules(input.poolId);
      const deadlineMinutes = rules?.bettingDeadlineMinutes ?? 60;
      const deadline = new Date(game.matchDate.getTime() - deadlineMinutes * 60 * 1000);
      if (new Date() > deadline) {
        await auditBet("error", { errorCode: "DEADLINE_PASSED", errorMessage: `Prazo encerrado (deadline=${deadline.toISOString()})` });
        throw Err.badRequest("Prazo para palpites encerrado.");
      }

      // Verificar se é criação ou atualização
      const { getDb } = await import("../db");
      const db = await getDb();
      const isUpdate = db ? await (async () => {
        const { bets: betsT } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const existing = await db.select({ id: betsT.id }).from(betsT)
          .where(and(eq(betsT.poolId, input.poolId), eq(betsT.userId, ctx.user.id), eq(betsT.gameId, input.gameId)))
          .limit(1);
        return existing.length > 0;
      })() : false;

      await upsertBet({
        poolId: input.poolId,
        userId: ctx.user.id,
        gameId: input.gameId,
        predictedScoreA: input.predictedScoreA,
        predictedScoreB: input.predictedScoreB,
      });

      // [Audit] Registrar sucesso
      await auditBet(isUpdate ? "update" : "create");

      // [Stats] Atualizar pool_member_stats imediatamente após palpite
      // Garante que o ranking mostre "X palpites" em vez de "Ainda não fez palpites"
      await recalculateMemberStats(input.poolId, ctx.user.id).catch((e: unknown) =>
        logger.warn({ err: e }, "[Stats] Erro ao recalcular stats após palpite")
      );

      // [Badges] Verificar e conceder badges após palpite (ex: Boas-Vindas)
      import("../badges")
        .then(({ calculateAndAssignBadges }) =>
          calculateAndAssignBadges(ctx.user.id).catch((e: unknown) =>
            logger.warn({ err: e }, "[Badges] Erro ao calcular badges após palpite")
          )
        )
        .catch(() => {});

      return { success: true };
    }),
});
