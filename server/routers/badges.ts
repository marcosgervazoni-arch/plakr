import { router, protectedProcedure, adminProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { createAdminLog } from "../db";
import logger from "../logger";

const CRITERION_TYPES = [
  // Precisão
  "exact_scores_career",
  "exact_scores_in_pool",
  // Ranking
  "first_place_pools",
  "first_place_margin",
  "first_place_large_pool",
  "rank_jump",
  "rank_hold_1st",
  // Zebra
  "zebra_scores_career",
  "zebra_in_pool",
  "zebra_exact_score",
  // Comunidade
  "first_bet",
  "all_bets_in_pool",
  "created_pool",
  "pool_members_via_invite",
  "organized_pools",
  "early_bet",
  "participated_pools",
  // Exclusivo
  "manual",
  "early_user",
  // Legados
  "top3_pools",
  "accuracy_in_pool",
  "complete_pool_no_blank",
  "consecutive_correct",
  "referrals_count",
] as const;

export const badgesRouter = router({
  // ─── ADMIN: listar todos os badges ───────────────────────────────────────
  list: adminProcedure.query(async () => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) throw new Error("DB not available");
    const { badges } = await import("../../drizzle/schema");
    const { asc } = await import("drizzle-orm");
    return db.select().from(badges).orderBy(asc(badges.category), asc(badges.id));
  }),

  // ─── ADMIN: criar badge ───────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        emoji: z.string().max(8).optional(),
        category: z.string().max(64).optional(),
        description: z.string().min(1).max(500),
        iconUrl: z.string().url().optional(),
        criterionType: z.enum(CRITERION_TYPES),
        criterionValue: z.number().int().min(0),
        rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]).default("common"),
        isRetroactive: z.boolean().default(true),
        isManual: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges } = await import("../../drizzle/schema");

      const [result] = await db.insert(badges).values({
        name: input.name,
        emoji: input.emoji,
        category: input.category,
        description: input.description,
        iconUrl: input.iconUrl,
        criterionType: input.criterionType,
        criterionValue: input.criterionValue,
        rarity: input.rarity,
        isRetroactive: input.isRetroactive,
        isManual: input.isManual,
        isActive: input.isActive,
      });

      const badgeId = result.insertId;
      await createAdminLog(ctx.user.id, "badges.create", "badge", badgeId, { name: input.name });

      if (input.isRetroactive && !input.isManual) {
        const { assignBadgeRetroactively } = await import("../badges");
        assignBadgeRetroactively(badgeId).catch((e: unknown) =>
          logger.error({ err: e }, "[Badges] Erro na atribuição retroativa")
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
        emoji: z.string().max(8).optional(),
        category: z.string().max(64).optional(),
        description: z.string().min(1).max(500).optional(),
        iconUrl: z.string().url().optional(),
        criterionType: z.enum(CRITERION_TYPES).optional(),
        criterionValue: z.number().int().min(0).optional(),
        rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]).optional(),
        isRetroactive: z.boolean().optional(),
        isManual: z.boolean().optional(),
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

      await db.delete(userBadges).where(eq(userBadges.badgeId, input.id));
      await db.delete(badges).where(eq(badges.id, input.id));
      await createAdminLog(ctx.user.id, "badges.delete", "badge", input.id, {});
      return { success: true };
    }),

  // ─── ADMIN: atribuir badge manualmente a um usuário ───────────────────────
  assignManual: adminProcedure
    .input(z.object({ userId: z.number(), badgeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { assignBadgeManually } = await import("../badges");
      const result = await assignBadgeManually(input.userId, input.badgeId);
      await createAdminLog(ctx.user.id, "badges.assignManual", "user_badge", input.userId, {
        badgeId: input.badgeId,
        alreadyHad: result.alreadyHad,
      });
      return result;
    }),

  // ─── ADMIN: revogar badge de um usuário ──────────────────────────────────
  revoke: adminProcedure
    .input(z.object({ userId: z.number(), badgeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { revokeBadge } = await import("../badges");
      const success = await revokeBadge(input.userId, input.badgeId);
      await createAdminLog(ctx.user.id, "badges.revoke", "user_badge", input.userId, {
        badgeId: input.badgeId,
      });
      return { success };
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

  // ─── USUÁRIO: progresso completo de conquistas ──────────────────────────
  myProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) throw new Error("DB not available");
    const { badges, userBadges, bets, games, poolMemberStats, referrals, users, pools, poolMembers, x1Challenges } =
      await import("../../drizzle/schema");
    const { eq, and, sql, desc, ne } = await import("drizzle-orm");
    const userId = ctx.user.id;

    const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));

    const earned = await db
      .select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    // ── Precisão ──
    const [exactRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")));
    const exactScoresCareer = Number(exactRow?.count ?? 0);

    // ── Zebra ──
    const [zebraRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(
        and(
          eq(bets.userId, userId),
          eq(games.isZebraResult, true),
          sql`${bets.resultType} IN ('exact', 'correct_result')`
        )
      );
    const zebraScoresCareer = Number(zebraRow?.count ?? 0);

    // ── Ranking ──
    const [firstRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMemberStats)
      .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));
    const firstPlacePools = Number(firstRow?.count ?? 0);

    // ── Palpites ──
    const [totalBetsRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .where(eq(bets.userId, userId));
    const totalBets = Number(totalBetsRow?.count ?? 0);

    // ── Participação em bolões ──
    const [poolsRow] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${bets.poolId})` })
      .from(bets)
      .where(eq(bets.userId, userId));
    const participatedPools = Number(poolsRow?.count ?? 0);

    // ── Indicações ──
    const [refRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(eq(referrals.inviterId, userId), sql`${referrals.registeredAt} IS NOT NULL`));
    const referralsCount = Number(refRow?.count ?? 0);

    // ── Bolões criados ──
    const [createdPoolRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(pools)
      .where(eq(pools.ownerId, userId));
    const createdPools = Number(createdPoolRow?.count ?? 0);

    // ── Bolões organizados ──
    const [organizedRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMembers)
      .where(and(eq(poolMembers.userId, userId), eq(poolMembers.role, "organizer")));
    const organizedPools = Number(organizedRow?.count ?? 0);

    // ── Palpites antecipados (>= 24h antes do jogo) ──
    const earlyBetsData = await db
      .select({ betCreatedAt: bets.createdAt, matchDate: games.matchDate })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(eq(bets.userId, userId));
    const earlyBetsCount = earlyBetsData.filter((b) => {
      const betTime = new Date(b.betCreatedAt).getTime();
      const matchTime = new Date(b.matchDate).getTime();
      return matchTime - betTime >= 24 * 60 * 60 * 1000;
    }).length;

    // ── Membros trazidos via convite (máximo em um único bolão) ──
    const organizerPools = await db
      .select({ poolId: poolMembers.poolId })
      .from(poolMembers)
      .where(and(eq(poolMembers.userId, userId), eq(poolMembers.role, "organizer")));
    let maxInviteMembers = 0;
    for (const op of organizerPools) {
      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMembers)
        .where(and(eq(poolMembers.poolId, op.poolId), sql`${poolMembers.joinSource} = 'link'`));
      const cnt = Number(countRow?.count ?? 0);
      if (cnt > maxInviteMembers) maxInviteMembers = cnt;
    }

    // ── X1: vitórias na carreira ──
    const [x1WinsRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(and(eq(x1Challenges.status, "concluded"), eq(x1Challenges.winnerId, userId)));
    const x1WinsCareer = Number(x1WinsRow?.count ?? 0);

    // ── X1: desafios enviados ──
    const [x1SentRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(eq(x1Challenges.challengerId, userId));
    const x1ChallengesSent = Number(x1SentRow?.count ?? 0);

    // ── X1: vitórias contra o líder ──
    const [x1VsLeaderRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(
        and(
          eq(x1Challenges.status, "concluded"),
          eq(x1Challenges.winnerId, userId),
          sql`${x1Challenges.opponentRankAtStart} = 1`
        )
      );
    const x1WinsVsLeader = Number(x1VsLeaderRow?.count ?? 0);

    // ── X1: vitórias contra ranking superior ──
    const [x1VsHigherRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(
        and(
          eq(x1Challenges.status, "concluded"),
          eq(x1Challenges.winnerId, userId),
          sql`${x1Challenges.opponentRankAtStart} < ${x1Challenges.challengerRankAtStart}`
        )
      );
    const x1WinsVsHigher = Number(x1VsHigherRow?.count ?? 0);

    const [totalUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const totalUsers = Number(totalUsersRow?.count ?? 1);

    const platformStats = await db
      .select({
        badgeId: userBadges.badgeId,
        holders: sql<number>`COUNT(DISTINCT ${userBadges.userId})`,
      })
      .from(userBadges)
      .groupBy(userBadges.badgeId);
    const platformStatsMap = new Map(platformStats.map((s) => [s.badgeId, Number(s.holders)]));

    // ── progressMap completo ──
    // early_user: critério binário (userId <= criterionValue) — não usar userId como progresso.
    const progressMap: Record<string, number> = {
      // Precisão
      exact_scores_career: exactScoresCareer,
      exact_scores_in_pool: exactScoresCareer,
      // Zebra
      zebra_scores_career: zebraScoresCareer,
      zebra_in_pool: zebraScoresCareer,
      zebra_exact_score: zebraScoresCareer,
      // Ranking
      first_place_pools: firstPlacePools,
      top3_pools: firstPlacePools,
      // Palpites
      first_bet: totalBets,
      // Participação
      participated_pools: participatedPools,
      // Indicações
      referrals_count: referralsCount,
      // Comunidade
      created_pool: createdPools,
      organized_pools: organizedPools,
      early_bet: earlyBetsCount,
      pool_members_via_invite: maxInviteMembers,
      all_bets_in_pool: totalBets > 0 ? 1 : 0, // binário: 1 se já apostou em todos de algum bolão
      // X1
      x1_wins_career: x1WinsCareer,
      x1_challenges_sent: x1ChallengesSent,
      x1_win_vs_leader: x1WinsVsLeader,
      x1_win_vs_higher_rank: x1WinsVsHigher,
      // Binários (sem progresso numérico útil)
      early_user: 0,
      manual: 0,
      first_place_margin: firstPlacePools,
      first_place_large_pool: firstPlacePools,
      rank_jump: 0,
      rank_hold_1st: firstPlacePools,
      accuracy_in_pool: exactScoresCareer,
      complete_pool_no_blank: totalBets > 0 ? 1 : 0,
      consecutive_correct: exactScoresCareer,
    };

    const badgesWithProgress = allBadges.map((badge) => {
      const isEarned = earnedMap.has(badge.id);
      const currentProgress = progressMap[badge.criterionType] ?? 0;
      const holders = platformStatsMap.get(badge.id) ?? 0;
      const platformPercent = totalUsers > 0 ? Math.round((holders / totalUsers) * 100) : 0;
      return {
        id: badge.id,
        name: badge.name,
        emoji: badge.emoji,
        category: badge.category,
        description: badge.description,
        iconUrl: badge.iconUrl,
        criterionType: badge.criterionType,
        criterionValue: badge.criterionValue,
        isManual: badge.isManual,
        rarity: badge.rarity ?? "common",
        earned: isEarned,
        earnedAt: earnedMap.get(badge.id) ?? null,
        currentProgress,
        progressPercent: isEarned
          ? 100
          : badge.criterionValue > 0
          ? Math.min(99, Math.round((currentProgress / badge.criterionValue) * 100))
          : 0,
        platformPercent,
        holders,
      };
    });

    const timeline = badgesWithProgress
      .filter((b) => b.earned && b.earnedAt)
      .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime());

    return {
      badges: badgesWithProgress,
      timeline,
      totalEarned: timeline.length,
      totalBadges: allBadges.length,
      totalUsers,
    };
  }),

  // ─── PÚBLICO: badges de um usuário ───────────────────────────────────────
  userBadges: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("../../server/db")).getDb();
      if (!db) throw new Error("DB not available");
      const { badges, userBadges } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));

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

  // ─── USUÁRIO: próximas conquistas (top 3 por % de progresso) ─────────────
  nearestBadges: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) return [];
    const { badges, userBadges, bets, games, poolMemberStats, referrals, pools, poolMembers, x1Challenges } =
      await import("../../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const userId = ctx.user.id;

    // Buscar badges ativos não-manuais ainda não conquistados
    const allBadges = await db
      .select()
      .from(badges)
      .where(and(eq(badges.isActive, true), eq(badges.isManual, false)));

    const earned = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const earnedIds = new Set(earned.map((e) => e.badgeId));

    const pending = allBadges.filter((b) => !earnedIds.has(b.id) && b.criterionValue > 0);
    if (pending.length === 0) return [];

    // ── Precisão ──
    const [exactRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")));
    const exactScoresCareer = Number(exactRow?.count ?? 0);

    // ── Zebra ──
    const [zebraRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(
        and(
          eq(bets.userId, userId),
          eq(games.isZebraResult, true),
          sql`${bets.resultType} IN ('exact', 'correct_result')`
        )
      );
    const zebraScoresCareer = Number(zebraRow?.count ?? 0);

    // ── Ranking ──
    const [firstRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMemberStats)
      .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));
    const firstPlacePools = Number(firstRow?.count ?? 0);

    // ── Palpites ──
    const [totalBetsRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .where(eq(bets.userId, userId));
    const totalBets = Number(totalBetsRow?.count ?? 0);

    // ── Participação ──
    const [poolsRow] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${bets.poolId})` })
      .from(bets)
      .where(eq(bets.userId, userId));
    const participatedPools = Number(poolsRow?.count ?? 0);

    // ── Indicações ──
    const [refRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(eq(referrals.inviterId, userId), sql`${referrals.registeredAt} IS NOT NULL`));
    const referralsCount = Number(refRow?.count ?? 0);

    // ── Bolões criados ──
    const [createdPoolRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(pools)
      .where(eq(pools.ownerId, userId));
    const createdPools = Number(createdPoolRow?.count ?? 0);

    // ── Bolões organizados ──
    const [organizedRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMembers)
      .where(and(eq(poolMembers.userId, userId), eq(poolMembers.role, "organizer")));
    const organizedPools = Number(organizedRow?.count ?? 0);

    // ── Palpites antecipados ──
    const earlyBetsData = await db
      .select({ betCreatedAt: bets.createdAt, matchDate: games.matchDate })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(eq(bets.userId, userId));
    const earlyBetsCount = earlyBetsData.filter((b) => {
      const betTime = new Date(b.betCreatedAt).getTime();
      const matchTime = new Date(b.matchDate).getTime();
      return matchTime - betTime >= 24 * 60 * 60 * 1000;
    }).length;

    // ── Membros via convite (máximo em um único bolão) ──
    const organizerPools = await db
      .select({ poolId: poolMembers.poolId })
      .from(poolMembers)
      .where(and(eq(poolMembers.userId, userId), eq(poolMembers.role, "organizer")));
    let maxInviteMembers = 0;
    for (const op of organizerPools) {
      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMembers)
        .where(and(eq(poolMembers.poolId, op.poolId), sql`${poolMembers.joinSource} = 'link'`));
      const cnt = Number(countRow?.count ?? 0);
      if (cnt > maxInviteMembers) maxInviteMembers = cnt;
    }

    // ── X1 ──
    const [x1WinsRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(and(eq(x1Challenges.status, "concluded"), eq(x1Challenges.winnerId, userId)));
    const x1WinsCareer = Number(x1WinsRow?.count ?? 0);

    const [x1SentRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(eq(x1Challenges.challengerId, userId));
    const x1ChallengesSent = Number(x1SentRow?.count ?? 0);

    const [x1VsLeaderRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(
        and(
          eq(x1Challenges.status, "concluded"),
          eq(x1Challenges.winnerId, userId),
          sql`${x1Challenges.opponentRankAtStart} = 1`
        )
      );
    const x1WinsVsLeader = Number(x1VsLeaderRow?.count ?? 0);

    const [x1VsHigherRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(x1Challenges)
      .where(
        and(
          eq(x1Challenges.status, "concluded"),
          eq(x1Challenges.winnerId, userId),
          sql`${x1Challenges.opponentRankAtStart} < ${x1Challenges.challengerRankAtStart}`
        )
      );
    const x1WinsVsHigher = Number(x1VsHigherRow?.count ?? 0);

    // ── progressMap completo ──
    const progressMap: Record<string, number> = {
      exact_scores_career: exactScoresCareer,
      exact_scores_in_pool: exactScoresCareer,
      zebra_scores_career: zebraScoresCareer,
      zebra_in_pool: zebraScoresCareer,
      zebra_exact_score: zebraScoresCareer,
      first_place_pools: firstPlacePools,
      top3_pools: firstPlacePools,
      first_bet: totalBets,
      participated_pools: participatedPools,
      referrals_count: referralsCount,
      created_pool: createdPools,
      organized_pools: organizedPools,
      early_bet: earlyBetsCount,
      pool_members_via_invite: maxInviteMembers,
      all_bets_in_pool: totalBets > 0 ? 1 : 0,
      x1_wins_career: x1WinsCareer,
      x1_challenges_sent: x1ChallengesSent,
      x1_win_vs_leader: x1WinsVsLeader,
      x1_win_vs_higher_rank: x1WinsVsHigher,
      early_user: 0,
      manual: 0,
      first_place_margin: firstPlacePools,
      first_place_large_pool: firstPlacePools,
      rank_jump: 0,
      rank_hold_1st: firstPlacePools,
      accuracy_in_pool: exactScoresCareer,
      complete_pool_no_blank: totalBets > 0 ? 1 : 0,
      consecutive_correct: exactScoresCareer,
    };

    // Calcular % de progresso e ordenar pelos mais próximos
    const withProgress = pending
      .map((badge) => {
        const current = progressMap[badge.criterionType] ?? 0;
        const pct = Math.min(99, Math.round((current / badge.criterionValue) * 100));
        return {
          id: badge.id,
          name: badge.name,
          emoji: badge.emoji,
          category: badge.category,
          description: badge.description,
          iconUrl: badge.iconUrl,
          criterionType: badge.criterionType,
          criterionValue: badge.criterionValue,
          rarity: badge.rarity ?? "common",
          isManual: badge.isManual,
          earned: false as const,
          earnedAt: null,
          currentProgress: current,
          progressPercent: pct,
        };
      })
      // Ordenar: primeiro os que têm progresso > 0 (mais próximos), depois por raridade
      .sort((a, b) => {
        if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 1) -
               (rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 1);
      })
      .slice(0, 3);

    return withProgress;
  }),

  // ─── Admin: recalcular badges de todos os usuários (retroativo) ──────────
  recalculateAll: adminProcedure.mutation(async () => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) return { processed: 0, totalNewBadges: 0 };
    const { users } = await import("../../drizzle/schema");
    const { calculateAndAssignBadges } = await import("../badges");
    const allUsers = await db.select({ id: users.id }).from(users);
    let totalNewBadges = 0;
    for (const user of allUsers) {
      const newBadges = await calculateAndAssignBadges(user.id);
      totalNewBadges += newBadges.length;
    }
    logger.info({ processed: allUsers.length, totalNewBadges }, "[Badges] Recálculo retroativo concluído");
    return { processed: allUsers.length, totalNewBadges };
  }),

  // ─── Badges recém-desbloqueados não notificados ──────────────────────────
  getNewlyUnlocked: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) return [];
    const { badges, userBadges } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    const unnotified = await db
      .select({
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
        name: badges.name,
        emoji: badges.emoji,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(and(eq(userBadges.userId, ctx.user.id), eq(userBadges.notified, false)));

    if (unnotified.length === 0) return [];

    await db
      .update(userBadges)
      .set({ notified: true })
      .where(and(eq(userBadges.userId, ctx.user.id), eq(userBadges.notified, false)));

    logger.info({ userId: ctx.user.id, count: unnotified.length }, "[Badges] Marked as notified");
    return unnotified.map((b) => ({
      badgeId: b.badgeId,
      name: b.name,
      emoji: b.emoji,
      earnedAt: b.earnedAt,
    }));
  }),

  /**
   * Vitrine pública de badges para a landing page.
   * Retorna até 6 badges curados priorizando raridades mais altas,
   * com distribuição por categoria para variedade visual.
   */
  getShowcase: publicProcedure.query(async () => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) return [];
    const { badges } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const rarityOrder: Record<string, number> = {
      legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
    };

    const allBadges = await db
      .select({
        id: badges.id,
        name: badges.name,
        emoji: badges.emoji,
        category: badges.category,
        description: badges.description,
        rarity: badges.rarity,
        iconUrl: badges.iconUrl,
        criterionType: badges.criterionType,
        criterionValue: badges.criterionValue,
      })
      .from(badges)
      .where(eq(badges.isActive, true));

    // Distribui por categoria para variedade visual
    const byCategory: Record<string, typeof allBadges> = {
      precisao: [], ranking: [], zebra: [], comunidade: [], exclusivo: [],
    };
    for (const b of allBadges) {
      const cat = b.category ?? "comunidade";
      if (byCategory[cat]) byCategory[cat].push(b);
      else byCategory["comunidade"].push(b);
    }
    // Ordena cada categoria por raridade decrescente
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].sort((a, b) => (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0));
    }
    // Monta seleção curada: 2 precisao, 2 ranking, 1 zebra, 1 exclusivo/comunidade
    const showcase = [
      ...byCategory["precisao"].slice(0, 2),
      ...byCategory["ranking"].slice(0, 2),
      ...byCategory["zebra"].slice(0, 1),
      ...(byCategory["exclusivo"].length > 0
        ? byCategory["exclusivo"].slice(0, 1)
        : byCategory["comunidade"].slice(0, 1)),
    ];
    // Preenche até 6 com os mais raros restantes
    if (showcase.length < 6) {
      const usedIds = new Set(showcase.map((b) => b.id));
      const remaining = allBadges
        .filter((b) => !usedIds.has(b.id))
        .sort((a, b) => (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0));
      showcase.push(...remaining.slice(0, 6 - showcase.length));
    }
    return showcase.slice(0, 6);
  }),
});
