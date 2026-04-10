/**
 * pools-sponsor-badges.ts
 * Procedures para gerenciamento e atribuição de badges patrocinados.
 * Todas as mutations de configuração são restritas ao Super Admin.
 * A atribuição automática é disparada pelos gatilhos de scoring/archival.
 */
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import logger from "../logger";
import {
  poolSponsorBadges,
  userSponsorBadges,
  poolSponsors,
  pools,
  SPONSOR_BADGE_RARITY,
  type SponsorBadgeDynamic,
} from "../../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna a raridade fixa para uma dinâmica */
export function getRarityForDynamic(dynamic: SponsorBadgeDynamic): string {
  return SPONSOR_BADGE_RARITY[dynamic] ?? "rare";
}

/** Verifica se o badge ainda está dentro da janela de tempo */
function isWithinWindow(badge: typeof poolSponsorBadges.$inferSelect): boolean {
  const now = new Date();
  if (badge.availableFrom && now < badge.availableFrom) return false;
  if (badge.availableUntil && now > badge.availableUntil) return false;
  return true;
}

/** Atribui um badge patrocinado a um usuário (idempotente) */
export async function awardSponsorBadge(
  userId: number,
  sponsorBadgeId: number,
  poolId: number,
  awardedByAdminId?: number
): Promise<boolean> {
  try {
    const { getDb, createNotification } = await import("../db");
    const db = await getDb();
    if (!db) return false;
    // Verifica se já tem o badge
    const [existing] = await db
      .select({ id: userSponsorBadges.id })
      .from(userSponsorBadges)
      .where(
        and(
          eq(userSponsorBadges.userId, userId),
          eq(userSponsorBadges.sponsorBadgeId, sponsorBadgeId),
          eq(userSponsorBadges.poolId, poolId)
        )
      )
      .limit(1);

    if (existing) return false; // já tem — idempotente

    // Busca dados do badge para a notificação
    const [badge] = await db
      .select({
        badgeName: poolSponsorBadges.badgeName,
        dynamic: poolSponsorBadges.dynamic,
        sponsorName: poolSponsors.sponsorName,
        sponsorLogoUrl: poolSponsors.sponsorLogoUrl,
        poolName: pools.name,
      })
      .from(poolSponsorBadges)
      .innerJoin(poolSponsors, eq(poolSponsorBadges.sponsorId, poolSponsors.id))
      .innerJoin(pools, eq(poolSponsorBadges.poolId, pools.id))
      .where(eq(poolSponsorBadges.id, sponsorBadgeId))
      .limit(1);

    // Insere a conquista
    await db.insert(userSponsorBadges).values({
      userId,
      sponsorBadgeId,
      poolId,
      awardedByAdminId,
    });

    // Notificação in-app com logo do patrocinador
    if (badge) {
      const rarity = getRarityForDynamic(badge.dynamic as SponsorBadgeDynamic);
      const rarityLabel: Record<string, string> = {
        common: "Comum",
        uncommon: "Incomum",
        rare: "Raro",
        epic: "Épico",
        legendary: "Lendário",
      };
      await createNotification({
        userId,
        poolId,
        type: "badge_unlocked",
        title: `🏅 Badge conquistado — ${badge.badgeName}`,
        message: `Você conquistou o badge "${badge.badgeName}" (${rarityLabel[rarity] ?? rarity}) patrocinado por ${badge.sponsorName} no bolão ${badge.poolName}!`,
        actionUrl: `/profile`,
        actionLabel: "Ver conquistas",
        priority: "normal",
        category: "badge_unlocked",
      });
    }

    logger.info({ userId, sponsorBadgeId, poolId }, "[SponsorBadge] Badge atribuído");
    return true;
  } catch (err) {
    logger.error({ userId, sponsorBadgeId, poolId, err }, "[SponsorBadge] Erro ao atribuir badge");
    return false;
  }
}

/**
 * Dispara os gatilhos automáticos de badges patrocinados para um bolão.
 * Deve ser chamado após scoring, archival e eventos relevantes.
 */
export async function triggerSponsorBadges(
  poolId: number,
  trigger: SponsorBadgeDynamic,
  userIds: number[]
): Promise<void> {
  if (!userIds.length) return;
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    // Busca badges ativos para esse bolão e dinâmica
    const badges = await db
      .select()
      .from(poolSponsorBadges)
      .where(
        and(
          eq(poolSponsorBadges.poolId, poolId),
          eq(poolSponsorBadges.dynamic, trigger),
          eq(poolSponsorBadges.isActive, true)
        )
      );

    for (const badge of badges) {
      if (!isWithinWindow(badge)) continue;
      for (const userId of userIds) {
        await awardSponsorBadge(userId, badge.id, poolId);
      }
    }
  } catch (err) {
    logger.warn({ poolId, trigger, err }, "[SponsorBadge] Erro ao disparar gatilho (não crítico)");
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const poolsSponsorBadgesRouter = router({
  /** Lista todos os badges configurados para um bolão (admin) */
  badgeList: adminProcedure
    .input(z.object({ poolId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return [];
      const badges = await db
        .select()
        .from(poolSponsorBadges)
        .where(eq(poolSponsorBadges.poolId, input.poolId))
        .orderBy(poolSponsorBadges.dynamic);

      return badges.map((b: typeof poolSponsorBadges.$inferSelect) => ({
        ...b,
        rarity: getRarityForDynamic(b.dynamic as SponsorBadgeDynamic),
      }));
    }),

  /** Cria ou atualiza um badge patrocinado para uma dinâmica específica */
  badgeUpsert: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(), // se presente, atualiza
        poolId: z.number().int().positive(),
        sponsorId: z.number().int().positive(),
        dynamic: z.enum([
          "participation", "faithful_bettor", "podium", "exact_score",
          "zebra_detector", "champion", "perfect_round", "veteran", "manual",
        ]),
        badgeName: z.string().min(1).max(255),
        svgUrl: z.string().url().optional().nullable(),
        availableFrom: z.string().datetime().optional().nullable(),
        availableUntil: z.string().datetime().optional().nullable(),
        isActive: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, availableFrom, availableUntil, ...rest } = input;
      const data = {
        ...rest,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
      };

      if (id) {
        await db.update(poolSponsorBadges).set(data).where(eq(poolSponsorBadges.id, id));
        return { id };
      } else {
        const [result] = await db.insert(poolSponsorBadges).values(data);
        return { id: (result as any).insertId };
      }
    }),

  /** Ativa ou desativa um badge */
  badgeToggle: adminProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(poolSponsorBadges)
        .set({ isActive: input.isActive })
        .where(eq(poolSponsorBadges.id, input.id));
      return { success: true };
    }),

  /** Remove um badge patrocinado (e todas as conquistas associadas) */
  badgeRemove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(poolSponsorBadges).where(eq(poolSponsorBadges.id, input.id));
      return { success: true };
    }),

  /** Atribuição manual de badge a um ou mais usuários */
  badgeAwardManual: adminProcedure
    .input(
      z.object({
        sponsorBadgeId: z.number().int().positive(),
        poolId: z.number().int().positive(),
        userIds: z.array(z.number().int().positive()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let awarded = 0;
      for (const userId of input.userIds) {
        const ok = await awardSponsorBadge(userId, input.sponsorBadgeId, input.poolId, ctx.user.id);
        if (ok) awarded++;
      }
      return { awarded };
    }),

  /** Badges conquistados por um usuário (público — para exibir no perfil) */
  badgeMyBadges: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return [];
    const badges = await db
      .select({
        id: userSponsorBadges.id,
        awardedAt: userSponsorBadges.awardedAt,
        badgeName: poolSponsorBadges.badgeName,
        svgUrl: poolSponsorBadges.svgUrl,
        dynamic: poolSponsorBadges.dynamic,
        sponsorName: poolSponsors.sponsorName,
        sponsorLogoUrl: poolSponsors.sponsorLogoUrl,
        poolName: pools.name,
        poolSlug: pools.slug,
      })
      .from(userSponsorBadges)
      .innerJoin(poolSponsorBadges, eq(userSponsorBadges.sponsorBadgeId, poolSponsorBadges.id))
      .innerJoin(poolSponsors, eq(poolSponsorBadges.sponsorId, poolSponsors.id))
      .innerJoin(pools, eq(userSponsorBadges.poolId, pools.id))
      .where(eq(userSponsorBadges.userId, ctx.user.id))
      .orderBy(userSponsorBadges.awardedAt);

    return badges.map((b: any) => ({
      ...b,
      rarity: getRarityForDynamic(b.dynamic as SponsorBadgeDynamic),
    }));
  }),

  /** Badges de um usuário público (para perfil público) */
  badgeUserBadges: publicProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return [];
      const badges = await db
        .select({
          id: userSponsorBadges.id,
          awardedAt: userSponsorBadges.awardedAt,
          badgeName: poolSponsorBadges.badgeName,
          svgUrl: poolSponsorBadges.svgUrl,
          dynamic: poolSponsorBadges.dynamic,
          sponsorName: poolSponsors.sponsorName,
          sponsorLogoUrl: poolSponsors.sponsorLogoUrl,
          poolName: pools.name,
        })
        .from(userSponsorBadges)
        .innerJoin(poolSponsorBadges, eq(userSponsorBadges.sponsorBadgeId, poolSponsorBadges.id))
        .innerJoin(poolSponsors, eq(poolSponsorBadges.sponsorId, poolSponsors.id))
        .innerJoin(pools, eq(userSponsorBadges.poolId, pools.id))
        .where(eq(userSponsorBadges.userId, input.userId))
        .orderBy(userSponsorBadges.awardedAt);

      return badges.map((b: any) => ({
        ...b,
        rarity: getRarityForDynamic(b.dynamic as SponsorBadgeDynamic),
      }));
    }),

  /** Contagem de portadores de um badge (para exibir raridade real) */
  badgeHolderCount: publicProcedure
    .input(z.object({ sponsorBadgeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { count: 0 };
      const rows = await db
        .select({ userId: userSponsorBadges.userId })
        .from(userSponsorBadges)
        .where(eq(userSponsorBadges.sponsorBadgeId, input.sponsorBadgeId));
      return { count: rows.length };
    }),
});
