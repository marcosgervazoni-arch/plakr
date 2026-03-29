/**
 * Plakr! — Sub-router: Bolões (Retrospectiva)
 * Procedures: getRetrospective, adminGetRetrospectives, adminReprocessRetrospective,
 *             getRetrospectiveConfig, updateRetrospectiveConfig, uploadRetrospectiveTemplate,
 *             generateTestVideo
 */
import { z } from "zod";
import {
  createAdminLog,
  getPoolById,
  getDb,
} from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { Err } from "../errors";

export const poolsRetrospectiveRouter = router({
  // ── Buscar retrospectiva do usuário no bolão ───────────────────────────────
  getRetrospective: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolRetrospectives, userShareCards, retrospectiveConfig, pools: poolsT } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Bloquear acesso se o bolão estiver arquivado ou deletado — retrospectiva some junto
      const [pool] = await db
        .select({ status: poolsT.status })
        .from(poolsT)
        .where(eq(poolsT.id, input.poolId))
        .limit(1);
      if (!pool || pool.status === "archived" || pool.status === "deleted") return null;

      const [retro] = await db
        .select()
        .from(poolRetrospectives)
        .where(and(eq(poolRetrospectives.poolId, input.poolId), eq(poolRetrospectives.userId, ctx.user.id)))
        .limit(1);

      if (!retro) return null;

      const [card] = await db
        .select()
        .from(userShareCards)
        .where(and(eq(userShareCards.poolId, input.poolId), eq(userShareCards.userId, ctx.user.id)))
        .limit(1);

      // Buscar templates de fundo configurados pelo admin
      const [config] = await db.select().from(retrospectiveConfig).limit(1);
      // Resolver URLs de fundo para cada slide (slide1 é fallback universal)
      const fallback = config?.slide1Url ?? null;
      const templates = {
        slide1Url: config?.slide1Url ?? null,
        slide2Url: config?.slide2Url ?? fallback,
        slide3Url: config?.slide3Url ?? fallback,
        slide4Url: config?.slide4Url ?? fallback,
        slide5Url: config?.slide5Url ?? fallback,
        cardPodiumUrl: config?.cardPodiumUrl ?? null,
        cardParticipantUrl: config?.cardParticipantUrl ?? null,
        closingCtaText: config?.closingCtaText ?? null,
        closingCtaUrl: config?.closingCtaUrl ?? null,
      };

      return { ...retro, shareCard: card ?? null, templates };
    }),

  // ── Admin: listar retrospectivas de todos os bolões concluídos ─────────────
  adminGetRetrospectives: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { pools, poolRetrospectives, userShareCards, users } = await import("../../drizzle/schema");
      const { eq, and, like, desc, count } = await import("drizzle-orm");

      const offset = (input.page - 1) * input.limit;

      // Buscar bolões concluídos
      const whereClause = input.search
        ? and(eq(pools.status, "concluded"), like(pools.name, `%${input.search}%`))
        : eq(pools.status, "concluded");

      const poolList = await db
        .select({
          id: pools.id,
          name: pools.name,
          slug: pools.slug,
          concludedAt: pools.concludedAt,
          concludedBy: pools.concludedBy,
          ownerId: pools.ownerId,
        })
        .from(pools)
        .where(whereClause)
        .orderBy(desc(pools.concludedAt))
        .limit(input.limit)
        .offset(offset);

      // Para cada bolão, contar retrospectivas e cards gerados
      const enriched = await Promise.all(poolList.map(async (pool) => {
        const [retroCount] = await db
          .select({ count: count() })
          .from(poolRetrospectives)
          .where(eq(poolRetrospectives.poolId, pool.id));

        const [cardCount] = await db
          .select({ count: count() })
          .from(userShareCards)
          .where(eq(userShareCards.poolId, pool.id));

        // Contar participantes do bolão (via poolRetrospectives como proxy)
        const totalExpected = retroCount?.count ?? 0;
        const totalCards = cardCount?.count ?? 0;

        // Buscar nome do organizador
        let ownerName = "Desconhecido";
        if (pool.ownerId) {
          const [owner] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, pool.ownerId))
            .limit(1);
          if (owner) ownerName = owner.name ?? "Desconhecido";
        }

        const status = totalExpected === 0
          ? "pending"
          : totalCards >= totalExpected
          ? "complete"
          : "partial";

        return {
          ...pool,
          ownerName,
          totalRetrospectives: totalExpected,
          totalCards,
          status,
        };
      }));

      const [{ total }] = await db
        .select({ total: count() })
        .from(pools)
        .where(whereClause);

      return {
        items: enriched,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // ── Admin: reprocessar geração de retrospectiva para um bolão ─────────────
  adminReprocessRetrospective: adminProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (pool.status !== "concluded") {
        throw Err.precondition("Apenas bolões concluídos podem ter retrospectiva reprocessada.");
      }

      // Reprocessar retrospectiva para todos os membros do bolão
      const { generateAndUploadRetrospective } = await import("../retrospective");
      const db2 = await (await import("../db")).getDb();
      if (!db2) throw Err.internal();
      const { poolMembers } = await import("../../drizzle/schema");
      const { eq: eq2 } = await import("drizzle-orm");
      const members = await db2
        .select({ userId: poolMembers.userId })
        .from(poolMembers)
        .where(eq2(poolMembers.poolId, input.poolId));
      await Promise.all(members.map((m) => generateAndUploadRetrospective(input.poolId, m.userId)));

      await createAdminLog(ctx.user.id, "pool.reprocessRetrospective", "pool", input.poolId, {});

      return { success: true };
    }),

  // ── Configuração de Retrospectiva (Admin) ─────────────────────────────────
  getRetrospectiveConfig: adminProcedure.query(async () => {
    const db2 = await getDb();
    if (!db2) throw Err.internal();
    const { retrospectiveConfig } = await import("../../drizzle/schema");
    const [config] = await db2.select().from(retrospectiveConfig).limit(1);
    return config ?? null;
  }),

  updateRetrospectiveConfig: adminProcedure
    .input(z.object({
      autoCloseDays: z.number().min(1).max(30).optional(),
      closingCtaText: z.string().max(128).optional(),
      closingCtaUrl: z.string().optional().nullable(),
      enableSlides: z.boolean().optional(),
      enableVideo: z.boolean().optional(),
      videoQuality: z.enum(["low", "medium", "high"]).optional(),
      slide1Url: z.string().optional().nullable(),
      slide1Key: z.string().optional().nullable(),
      slide2Url: z.string().optional().nullable(),
      slide2Key: z.string().optional().nullable(),
      slide3Url: z.string().optional().nullable(),
      slide3Key: z.string().optional().nullable(),
      slide4Url: z.string().optional().nullable(),
      slide4Key: z.string().optional().nullable(),
      slide5Url: z.string().optional().nullable(),
      slide5Key: z.string().optional().nullable(),
      cardPodiumUrl: z.string().optional().nullable(),
      cardPodiumKey: z.string().optional().nullable(),
      cardParticipantUrl: z.string().optional().nullable(),
      cardParticipantKey: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db2 = await getDb();
      if (!db2) throw Err.internal();
      const { retrospectiveConfig } = await import("../../drizzle/schema");
      const updateData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined) updateData[k] = v;
      }
      const existing = await db2.select({ id: retrospectiveConfig.id }).from(retrospectiveConfig).limit(1);
      if (existing.length === 0) {
        await db2.insert(retrospectiveConfig).values({ id: 1, autoCloseDays: 3, ...updateData });
      } else {
        const { eq } = await import("drizzle-orm");
        await db2.update(retrospectiveConfig).set(updateData).where(eq(retrospectiveConfig.id, 1));
      }
      await createAdminLog(ctx.user.id, "retrospectiveConfig.update", "platform", 1, updateData);
      return { success: true };
    }),

  // ── Admin: gerar vídeo de teste (dados fictícios) ─────────────────────────
  // Roda em background para evitar timeout HTTP (renderização leva 2-5 min)
  generateTestVideo: adminProcedure
    .mutation(async ({ ctx }) => {
      const adminUserId = ctx.user.id;
      // Disparar em background sem await — responde imediatamente
      setImmediate(async () => {
        try {
          const { generateTestVideo } = await import("../retrospective-video");
          const result = await generateTestVideo();
          const { createNotification } = await import("../db");
          if (result?.videoUrl) {
            // Salvar URL no banco para exibir na página Admin
            const db2 = await getDb();
            if (db2) {
              const { retrospectiveConfig } = await import("../../drizzle/schema");
              const { eq: eqFn } = await import("drizzle-orm");
              await db2.update(retrospectiveConfig)
                .set({ testVideoUrl: result.videoUrl })
                .where(eqFn(retrospectiveConfig.id, 1));
            }
            await createNotification({
              userId: adminUserId,
              type: "system",
              title: "🎬 Vídeo teste gerado!",
              message: `Seu vídeo de retrospectiva de teste está pronto. Acesse Admin → Retrospectivas para assistir.`,
              actionUrl: "/admin/retrospectivas",
            });
          } else {
            await createNotification({
              userId: adminUserId,
              type: "system",
              title: "❌ Falha ao gerar vídeo teste",
              message: "Ocorreu um erro ao gerar o vídeo de teste. Verifique os logs do servidor.",
            });
          }
        } catch (err) {
          const logger = (await import("../logger")).default;
          logger.error({ err }, "[Video] Background test video generation failed");
        }
      });
      return { queued: true, message: "Gerando vídeo em background. Você receberá uma notificação quando estiver pronto (2-5 minutos)." };
    }),

  uploadRetrospectiveTemplate: adminProcedure
    .input(z.object({
      slot: z.enum(["slide1", "slide2", "slide3", "slide4", "slide5", "cardPodium", "cardParticipant"]),
      fileBase64: z.string(),
      mimeType: z.enum(["image/png", "image/jpeg"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `retrospective-templates/${input.slot}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const db2 = await getDb();
      if (!db2) throw Err.internal();
      const { retrospectiveConfig } = await import("../../drizzle/schema");
      const urlField = `${input.slot}Url`;
      const keyField = `${input.slot}Key`;
      const updateData = { [urlField]: url, [keyField]: key };
      const existing = await db2.select({ id: retrospectiveConfig.id }).from(retrospectiveConfig).limit(1);
      if (existing.length === 0) {
        await db2.insert(retrospectiveConfig).values({ id: 1, autoCloseDays: 3, ...updateData });
      } else {
        const { eq } = await import("drizzle-orm");
        await db2.update(retrospectiveConfig).set(updateData).where(eq(retrospectiveConfig.id, 1));
      }
      await createAdminLog(ctx.user.id, "retrospectiveConfig.uploadTemplate", "platform", 1, { slot: input.slot, key });
      return { url, key };
    }),
});
