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

  // ─── USUÁRIO: progresso completo de conquistas ──────────────────────────
  myProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../../server/db")).getDb();
    if (!db) throw new Error("DB not available");
    const { badges, userBadges, bets, games, poolMemberStats, referrals, users } = await import("../../drizzle/schema");
    const { eq, and, sql, desc } = await import("drizzle-orm");
    const userId = ctx.user.id;

    // 1. Todos os badges ativos
    const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));

    // 2. Badges conquistados pelo usuário (com data)
    const earned = await db
      .select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    // 3. Calcular progresso atual por critério
    // 3a. Placares exatos na carreira
    const [exactRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")));
    const exactScoresCareer = Number(exactRow?.count ?? 0);

    // 3b. Zebras acertadas
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

    // 3c. Top 3 em bolões
    const [top3Row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMemberStats)
      .where(
        and(
          eq(poolMemberStats.userId, userId),
          sql`${poolMemberStats.rankPosition} <= 3`,
          sql`${poolMemberStats.rankPosition} IS NOT NULL`
        )
      );
    const top3Pools = Number(top3Row?.count ?? 0);

    // 3d. 1º lugar em bolões
    const [firstRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poolMemberStats)
      .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));
    const firstPlacePools = Number(firstRow?.count ?? 0);

    // 3e. Convites aceitos
    const [refRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(eq(referrals.inviterId, userId), sql`${referrals.registeredAt} IS NOT NULL`));
    const referralsCount = Number(refRow?.count ?? 0);

    // 3f. Sequência máxima de acertos consecutivos
    const betRows = await db
      .select({ resultType: bets.resultType, matchDate: games.matchDate })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(and(eq(bets.userId, userId), sql`${games.status} = 'finished'`))
      .orderBy(desc(games.matchDate));
    let maxStreak = 0;
    let currentStreak = 0;
    for (const bet of betRows) {
      if (bet.resultType === "exact" || bet.resultType === "correct_result") {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    const consecutiveCorrect = maxStreak;

    // 3g. Bolões completos sem branco (aproximação: totalBets >= 5 e nenhum pendente)
    const statsRows = await db
      .select({ totalBets: poolMemberStats.totalBets, poolId: poolMemberStats.poolId })
      .from(poolMemberStats)
      .where(and(eq(poolMemberStats.userId, userId), sql`${poolMemberStats.totalBets} >= 5`));
    const { pools } = await import("../../drizzle/schema");
    const completedNoBlanks = await Promise.all(
      statsRows.map(async (s) => {
        const [poolRow] = await db
          .select({ tournamentId: pools.tournamentId })
          .from(pools)
          .where(eq(pools.id, s.poolId))
          .limit(1);
        if (!poolRow) return false;
        const [pendingRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(bets)
          .innerJoin(games, eq(bets.gameId, games.id))
          .where(
            and(
              eq(bets.userId, userId),
              eq(games.tournamentId, poolRow.tournamentId),
              eq(bets.resultType, "pending")
            )
          );
        return Number(pendingRow?.count ?? 0) === 0;
      })
    );
    const completePoolNoBlank = completedNoBlanks.filter(Boolean).length;

    // 3h. Taxa de acerto máxima em um bolão (mín. 10 jogos)
    const allStats = await db
      .select({
        totalBets: poolMemberStats.totalBets,
        exactScoreCount: poolMemberStats.exactScoreCount,
        correctResultCount: poolMemberStats.correctResultCount,
      })
      .from(poolMemberStats)
      .where(and(eq(poolMemberStats.userId, userId), sql`${poolMemberStats.totalBets} >= 10`));
    const accuracyInPool = allStats.reduce((max, s) => {
      const total = Number(s.totalBets);
      const correct = Number(s.exactScoreCount) + Number(s.correctResultCount);
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
      return Math.max(max, rate);
    }, 0);

    const progressMap: Record<string, number> = {
      exact_scores_career: exactScoresCareer,
      zebra_scores_career: zebraScoresCareer,
      top3_pools: top3Pools,
      first_place_pools: firstPlacePools,
      referrals_count: referralsCount,
      consecutive_correct: consecutiveCorrect,
      complete_pool_no_blank: completePoolNoBlank,
      accuracy_in_pool: accuracyInPool,
    };

    // 4. Estatísticas da plataforma (% de usuários com cada badge)
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

    // 5. Montar resposta
    const badgesWithProgress = allBadges.map((badge) => {
      const isEarned = earnedMap.has(badge.id);
      const currentProgress = progressMap[badge.criterionType] ?? 0;
      const holders = platformStatsMap.get(badge.id) ?? 0;
      const platformPercent = totalUsers > 0 ? Math.round((holders / totalUsers) * 100) : 0;
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        criterionType: badge.criterionType,
        criterionValue: badge.criterionValue,
        earned: isEarned,
        earnedAt: earnedMap.get(badge.id) ?? null,
        currentProgress,
        progressPercent: isEarned
          ? 100
          : Math.min(99, Math.round((currentProgress / badge.criterionValue) * 100)),
        platformPercent,
        holders,
      };
    });

    // 6. Histórico de conquistas (ordenado por data)
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
