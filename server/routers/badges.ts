import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { createAdminLog } from "../db";

export const badgesRouter = router({
  // ─── ADMIN: listar todos os badges ───────────────────────────────────────
  list: adminProcedure.query(async () => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) throw new Error("DB not available");
    const { badges } = await import("../../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    return db.select().from(badges).orderBy(desc(badges.createdAt));
  }),

  // ─── ADMIN: criar badge ───────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        iconUrl: z.string().url(),
        criterionType: z.enum([
          "accuracy_rate",
          "exact_score_career",
          "zebra_correct",
          "top3_pools",
          "first_place_pools",
          "complete_pool_no_blank",
          "consecutive_correct",
        ]),
        criterionValue: z.number().int().positive(),
        isRetroactive: z.boolean().default(true),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges } = await import("../../drizzle/schema");

      const [result] = await db.insert(badges).values({
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        criterionType: input.criterionType,
        criterionValue: input.criterionValue,
        isRetroactive: input.isRetroactive,
        isActive: input.isActive,
      });

      const badgeId = result.insertId;
      await createAdminLog(ctx.user.id, "badges.create", "badge", badgeId, { name: input.name });

      // Se retroativo, disparar atribuição em background para todos os usuários
      if (input.isRetroactive) {
        const { assignBadgeRetroactively } = await import("../badges");
        assignBadgeRetroactively(badgeId).catch((e: unknown) =>
          console.error("[Badges] Erro na atribuição retroativa:", e)
        );
      }

      return { success: true, badgeId };
    }),

  // ─── ADMIN: atualizar badge ───────────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        iconUrl: z.string().url().optional(),
        criterionType: z
          .enum([
            "accuracy_rate",
            "exact_score_career",
            "zebra_correct",
            "top3_pools",
            "first_place_pools",
            "complete_pool_no_blank",
            "consecutive_correct",
          ])
          .optional(),
        criterionValue: z.number().int().positive().optional(),
        isRetroactive: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const { id, ...updates } = input;
      await db
        .update(badges)
        .set(updates as Record<string, unknown>)
        .where(eq(badges.id, id));
      await createAdminLog(ctx.user.id, "badges.update", "badge", id, { updates });
      return { success: true };
    }),

  // ─── ADMIN: deletar badge ─────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges, userBadges } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Remove atribuições antes de deletar o badge
      await db.delete(userBadges).where(eq(userBadges.badgeId, input.id));
      await db.delete(badges).where(eq(badges.id, input.id));
      await createAdminLog(ctx.user.id, "badges.delete", "badge", input.id, {});
      return { success: true };
    }),

  // ─── ADMIN: upload de ícone SVG ───────────────────────────────────────────
  uploadIcon: adminProcedure
    .input(
      z.object({
        filename: z.string().regex(/\.svg$/i, "Apenas arquivos .svg são permitidos"),
        contentBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const randomSuffix = () => Math.random().toString(36).slice(2, 10);
      const key = `badges/${Date.now()}-${randomSuffix()}.svg`;
      const buffer = Buffer.from(input.contentBase64, "base64");

      if (buffer.byteLength > 200 * 1024) {
        throw new Error("Arquivo SVG muito grande. Máximo: 200KB.");
      }

      const { url } = await storagePut(key, buffer, "image/svg+xml");
      return { url };
    }),

  // ─── PÚBLICO: badges de um usuário ───────────────────────────────────────
  userBadges: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges, userBadges } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Todos os badges ativos
      const allBadges = await db
        .select()
        .from(badges)
        .where(eq(badges.isActive, true));

      // Badges conquistados pelo usuário
      const earned = await db
        .select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt })
        .from(userBadges)
        .where(eq(userBadges.userId, input.userId));

      const earnedSet = new Set(earned.map((e) => e.badgeId));
      const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

      return allBadges.map((badge) => ({
        ...badge,
        earned: earnedSet.has(badge.id),
        earnedAt: earnedMap.get(badge.id) ?? null,
      }));
    }),
});
