/**
 * ApostAI — Router de Usuários
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  anonymizeUser,
  countUnreadNotifications,
  createAdminLog,
  createNotification,
  getAllUsers,
  getPoolsByUser,
  getUserById,
  getUserPlan,
  updateUserBlocked,
  updateUserRole,
} from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    const plan = await getUserPlan(ctx.user.id);
    const unread = await countUnreadNotifications(ctx.user.id);
    return { user, plan, unreadNotifications: unread };
  }),

  myPools: protectedProcedure.query(async ({ ctx }) => {
    const basePools = await getPoolsByUser(ctx.user.id);
    if (!basePools || basePools.length === 0) return basePools;
    const db = await (await import("../db")).getDb();
    if (!db) return basePools;
    const { eq, and, sql } = await import("drizzle-orm");
    const { poolMemberStats, games, bets, poolScoringRules } = await import("../../drizzle/schema");
    const enriched = await Promise.all(
      basePools.map(async ({ pool, member }) => {
        const rankRows = await db
          .select({ userId: poolMemberStats.userId, totalPoints: poolMemberStats.totalPoints })
          .from(poolMemberStats)
          .where(eq(poolMemberStats.poolId, pool.id))
          .orderBy(sql`${poolMemberStats.totalPoints} DESC`);
        const rankPosition = rankRows.findIndex((r) => r.userId === ctx.user.id) + 1;
        const totalMembers = rankRows.length;
        const deadlineRow = await db
          .select({ bettingDeadlineMinutes: poolScoringRules.bettingDeadlineMinutes })
          .from(poolScoringRules)
          .where(eq(poolScoringRules.poolId, pool.id))
          .limit(1);
        const deadlineMinutes = deadlineRow[0]?.bettingDeadlineMinutes ?? 60;
        const openGames = await db
          .select({ id: games.id })
          .from(games)
          .where(and(
            eq(games.tournamentId, pool.tournamentId),
            eq(games.status, "scheduled"),
            sql`${games.matchDate} > DATE_ADD(NOW(), INTERVAL ${deadlineMinutes} MINUTE)`
          ));
        let pendingBetsCount = 0;
        if (openGames.length > 0) {
          const openGameIds = openGames.map((g) => g.id);
          const existingBets = await db
            .select({ gameId: bets.gameId })
            .from(bets)
            .where(and(
              eq(bets.userId, ctx.user.id),
              eq(bets.poolId, pool.id),
              sql`${bets.gameId} IN (${sql.join(openGameIds.map((id) => sql`${id}`), sql`, `)})`
            ));
          const bettedGameIds = new Set(existingBets.map((b) => b.gameId));
          pendingBetsCount = openGameIds.filter((id) => !bettedGameIds.has(id)).length;
        }
        return {
          pool,
          member,
          rankPosition: rankPosition > 0 ? rankPosition : null,
          totalMembers,
          pendingBetsCount,
        };
      })
    );
    return enriched;
  }),

  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (!db) return { totalPoints: 0, exactScores: 0, poolsCount: 0, totalBets: 0, pointsHistory: [], radarData: [] };
    const { sql, eq, and } = await import("drizzle-orm");
    const { poolMemberStats, bets, games, pools: poolsT } = await import("../../drizzle/schema");
    const statsRows = await db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`totalPoints\`), 0)`,
        exactScores: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`exactScoreCount\`), 0)`,
        correctResults: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`correctResultCount\`), 0)`,
        zebraCount: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`zebraCount\`), 0)`,
        landslideCount: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`landslideCount\`), 0)`,
        goalDiffCount: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`goalDiffCount\`), 0)`,
        totalBets: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`totalBets\`), 0)`,
        poolsCount: sql<number>`COUNT(DISTINCT \`pool_member_stats\`.\`poolId\`)`,
      })
      .from(poolMemberStats)
      .where(eq(poolMemberStats.userId, ctx.user.id));
    const stats = statsRows[0] ?? { totalPoints: 0, exactScores: 0, correctResults: 0, zebraCount: 0, landslideCount: 0, goalDiffCount: 0, totalBets: 0, poolsCount: 0 };
    const tb = Math.max(Number(stats.totalBets), 1);
    const { ne } = await import("drizzle-orm");
    const history = await db
      .select({ matchDate: games.matchDate, pointsEarned: bets.pointsEarned })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .innerJoin(poolsT, and(eq(poolsT.id, bets.poolId), ne(poolsT.status, "deleted")))
      .where(and(eq(bets.userId, ctx.user.id), sql`${bets.pointsEarned} IS NOT NULL`))
      .orderBy(games.matchDate)
      .limit(20);
    const radarData = [
      { subject: "Placar Exato", value: Math.round((Number(stats.exactScores) / tb) * 100), fullMark: 100 },
      { subject: "Resultado", value: Math.round((Number(stats.correctResults) / tb) * 100), fullMark: 100 },
      { subject: "Zebra", value: Math.min(100, Math.round((Number(stats.zebraCount) / tb) * 200)), fullMark: 100 },
      { subject: "Goleada", value: Math.min(100, Math.round((Number(stats.landslideCount) / tb) * 200)), fullMark: 100 },
      { subject: "Dif. Gols", value: Math.min(100, Math.round((Number(stats.goalDiffCount) / tb) * 150)), fullMark: 100 },
    ];
    return {
      totalPoints: Number(stats.totalPoints),
      exactScores: Number(stats.exactScores),
      poolsCount: Number(stats.poolsCount),
      totalBets: Number(stats.totalBets),
      pointsHistory: history.map((h) => ({
        label: new Date(h.matchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        points: Number(h.pointsEarned ?? 0),
      })),
      radarData,
    };
  }),

  myStatsByPool: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { totalPoints: 0, exactScores: 0, rank: null, totalMembers: 0, pointsHistory: [] };
      const { sql, eq, and } = await import("drizzle-orm");
      const { poolMemberStats, poolMembers, bets, games } = await import("../../drizzle/schema");
      const statsRows = await db
        .select({
          totalPoints: poolMemberStats.totalPoints,
          exactScores: poolMemberStats.exactScoreCount,
          correctResults: poolMemberStats.correctResultCount,
          zebraCount: poolMemberStats.zebraCount,
          landslideCount: poolMemberStats.landslideCount,
          goalDiffCount: poolMemberStats.goalDiffCount,
          totalBets: poolMemberStats.totalBets,
          rank: poolMemberStats.rankPosition,
        })
        .from(poolMemberStats)
        .where(and(eq(poolMemberStats.userId, ctx.user.id), eq(poolMemberStats.poolId, input.poolId)))
        .limit(1);
      const stats = statsRows[0] ?? { totalPoints: 0, exactScores: 0, correctResults: 0, zebraCount: 0, landslideCount: 0, goalDiffCount: 0, totalBets: 0, rank: null };
      const tb = Math.max(Number(stats.totalBets), 1);
      const membersRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMembers)
        .where(eq(poolMembers.poolId, input.poolId));
      const totalMembers = Number(membersRows[0]?.count ?? 0);
      const history = await db
        .select({ matchDate: games.matchDate, pointsEarned: bets.pointsEarned })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(and(
          eq(bets.userId, ctx.user.id),
          eq(bets.poolId, input.poolId),
          sql`${bets.pointsEarned} IS NOT NULL`
        ))
        .orderBy(games.matchDate)
        .limit(20);
      const radarData = [
        { subject: "Placar Exato", value: Math.round((Number(stats.exactScores) / tb) * 100), fullMark: 100 },
        { subject: "Resultado", value: Math.round((Number(stats.correctResults) / tb) * 100), fullMark: 100 },
        { subject: "Zebra", value: Math.min(100, Math.round((Number(stats.zebraCount) / tb) * 200)), fullMark: 100 },
        { subject: "Goleada", value: Math.min(100, Math.round((Number(stats.landslideCount) / tb) * 200)), fullMark: 100 },
        { subject: "Dif. Gols", value: Math.min(100, Math.round((Number(stats.goalDiffCount) / tb) * 150)), fullMark: 100 },
      ];
      return {
        totalPoints: Number(stats.totalPoints ?? 0),
        exactScores: Number(stats.exactScores ?? 0),
        rank: stats.rank ? Number(stats.rank) : null,
        totalMembers,
        totalBets: Number(stats.totalBets ?? 0),
        pointsHistory: history.map((h) => ({
          label: new Date(h.matchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          points: Number(h.pointsEarned ?? 0),
        })),
        radarData,
      };
    }),

  recentBets: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { eq, and, isNotNull, desc, ne } = await import("drizzle-orm");
    const { bets, games, pools: poolsT } = await import("../../drizzle/schema");
    const rows = await db
      .select({ bet: bets, game: games })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .innerJoin(poolsT, and(eq(poolsT.id, bets.poolId), ne(poolsT.status, "deleted")))
      .where(and(eq(bets.userId, ctx.user.id), isNotNull(games.scoreA)))
      .orderBy(desc(games.matchDate))
      .limit(5);
    return rows.map(({ bet, game }) => {
      const realA = game.scoreA ?? 0;
      const realB = game.scoreB ?? 0;
      const betA = bet.predictedScoreA ?? 0;
      const betB = bet.predictedScoreB ?? 0;
      const realResult = realA > realB ? "A" : realA < realB ? "B" : "D";
      const betResult = betA > betB ? "A" : betA < betB ? "B" : "D";
      const isExact = realA === betA && realB === betB;
      const isCorrect = !isExact && realResult === betResult;
      return {
        gameId: game.id,
        teamAName: game.teamAName ?? "Time A",
        teamBName: game.teamBName ?? "Time B",
        realScoreA: realA,
        realScoreB: realB,
        betScoreA: betA,
        betScoreB: betB,
        pointsEarned: bet.pointsEarned ?? 0,
        result: isExact ? "exact" : isCorrect ? "correct" : "wrong",
        matchDate: game.matchDate,
      };
    });
  }),

  // Admin: listar todos os usuários com paginação cursor-based [T3]
  list: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const rows = await getAllUsers(input.limit + 1, input.cursor);
      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;
      return { items, nextCursor, hasMore };
    }),

  blockUser: adminProcedure
    .input(z.object({ userId: z.number(), isBlocked: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await updateUserBlocked(input.userId, input.isBlocked);
      await createAdminLog(ctx.user.id, input.isBlocked ? "block_user" : "unblock_user", "user", input.userId);
      return { success: true };
    }),

  promoteToAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await updateUserRole(input.userId, "admin");
      await createAdminLog(ctx.user.id, "promote_admin", "user", input.userId);
      return { success: true };
    }),

  demoteFromAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se rebaixar." });
      await updateUserRole(input.userId, "user");
      await createAdminLog(ctx.user.id, "demote_admin", "user", input.userId);
      return { success: true };
    }),

  removeUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode remover a si mesmo." });
      await anonymizeUser(input.userId);
      await createAdminLog(ctx.user.id, "remove_user", "user", input.userId);
      return { success: true };
    }),

  sendNotification: adminProcedure
    .input(z.object({
      userId: z.number(),
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      await createNotification({ userId: input.userId, type: "system", title: input.title, message: input.message });
      await createAdminLog(ctx.user.id, "send_notification", "user", input.userId, { title: input.title });
      return { success: true };
    }),

  // Perfil público — acessível sem login
  getPublicProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { eq, sql, desc, and } = await import("drizzle-orm");
      const { users: usersT, poolMembers, poolMemberStats, pools: poolsT, userPlans, badges: badgesT, userBadges } = await import("../../drizzle/schema");
      const userRows = await db.select({
        id: usersT.id,
        name: usersT.name,
        avatarUrl: usersT.avatarUrl,
        createdAt: usersT.createdAt,
        whatsappLink: usersT.whatsappLink,
        telegramLink: usersT.telegramLink,
      }).from(usersT).where(eq(usersT.id, input.userId)).limit(1);
      if (!userRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      const user = userRows[0];
      const planRows = await db.select().from(userPlans).where(eq(userPlans.userId, input.userId)).limit(1);
      const plan = planRows[0] ?? null;
      const statsRows = await db.select({
        totalPoints: sql<number>`COALESCE(SUM(${poolMemberStats.totalPoints}), 0)`,
        exactScores: sql<number>`COALESCE(SUM(${poolMemberStats.exactScoreCount}), 0)`,
        poolsCount: sql<number>`COUNT(DISTINCT ${poolMemberStats.poolId})`,
        correctScores: sql<number>`COALESCE(SUM(${poolMemberStats.correctResultCount}), 0)`,
        totalBets: sql<number>`COALESCE(SUM(${poolMemberStats.totalBets}), 0)`,
      }).from(poolMemberStats).where(eq(poolMemberStats.userId, input.userId));
      const stats = statsRows[0] ?? { totalPoints: 0, exactScores: 0, poolsCount: 0, correctScores: 0, totalBets: 0 };
      const recentPools = await db.select({
        poolId: poolsT.id,
        poolName: poolsT.name,
        poolSlug: poolsT.slug,
        logoUrl: poolsT.logoUrl,
        totalPoints: poolMemberStats.totalPoints,
        rank: poolMemberStats.rankPosition,
      }).from(poolMembers)
        .innerJoin(poolsT, eq(poolMembers.poolId, poolsT.id))
        .leftJoin(poolMemberStats, eq(poolMemberStats.userId, poolMembers.userId))
        .where(and(eq(poolMembers.userId, input.userId), sql`${poolsT.status} != 'deleted'`))
        .orderBy(desc(poolsT.createdAt))
        .limit(5);
      return {
        user,
        plan,
        stats: {
          totalPoints: Number(stats.totalPoints),
          exactScores: Number(stats.exactScores),
          poolsCount: Number(stats.poolsCount),
          correctScores: Number(stats.correctScores),
          totalBets: Number(stats.totalBets),
          accuracy: Number(stats.totalBets) > 0
            ? Math.round(((Number(stats.exactScores) + Number(stats.correctScores)) / Number(stats.totalBets)) * 100)
            : 0,
        },
        recentPools,
        badges: await (async () => {
          const allBadges = await db.select().from(badgesT).where(eq(badgesT.isActive, true));
          const earned = await db.select({
            badgeId: userBadges.badgeId,
            earnedAt: userBadges.earnedAt,
          }).from(userBadges).where(eq(userBadges.userId, input.userId));
          const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));
          return allBadges.map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            iconUrl: b.iconUrl,
            criterionType: b.criterionType,
            criterionValue: b.criterionValue,
            earnedAt: earnedMap.get(b.id) ?? null,
          }));
        })(),
      };
    }),

  // Ranking global — top apostadores em todos os bolões
  globalRanking: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { eq, sql, desc } = await import("drizzle-orm");
      const { users: usersT, poolMemberStats } = await import("../../drizzle/schema");
      const rows = await db.select({
        userId: usersT.id,
        name: usersT.name,
        avatarUrl: usersT.avatarUrl,
        totalPoints: sql<number>`COALESCE(SUM(${poolMemberStats.totalPoints}), 0)`,
        exactScores: sql<number>`COALESCE(SUM(${poolMemberStats.exactScoreCount}), 0)`,
        poolsCount: sql<number>`COUNT(DISTINCT ${poolMemberStats.poolId})`,
      }).from(usersT)
        .leftJoin(poolMemberStats, eq(poolMemberStats.userId, usersT.id))
        .groupBy(usersT.id, usersT.name, usersT.avatarUrl)
        .orderBy(desc(sql`COALESCE(SUM(${poolMemberStats.totalPoints}), 0)`))
        .limit(input.limit);
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: r.name,
        avatarUrl: r.avatarUrl,
        totalPoints: Number(r.totalPoints),
        exactScores: Number(r.exactScores),
        poolsCount: Number(r.poolsCount),
      }));
    }),

  // Admin: buscar atividade de um usuário
  getUserActivity: adminProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { logs: [], adminActions: [], bets: [], pools: [], lastSignedIn: null, createdAt: null };
      const { eq, desc, and, sql } = await import("drizzle-orm");
      const { adminLogs, bets, games, pools: poolsT, poolMembers, poolMemberStats, users: usersT } = await import("../../drizzle/schema");
      const [userRow] = await db.select({ lastSignedIn: usersT.lastSignedIn, createdAt: usersT.createdAt })
        .from(usersT).where(eq(usersT.id, input.userId)).limit(1);
      const logsAboutUser = await db.select().from(adminLogs)
        .where(and(eq(adminLogs.entityType, "user"), eq(adminLogs.entityId, input.userId)))
        .orderBy(desc(adminLogs.createdAt))
        .limit(30);
      const adminActions = await db.select().from(adminLogs)
        .where(eq(adminLogs.adminId, input.userId))
        .orderBy(desc(adminLogs.createdAt))
        .limit(input.limit);
      const recentBets = await db
        .select({ bet: bets, game: games })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .innerJoin(poolsT, and(eq(poolsT.id, bets.poolId), sql`${poolsT.status} != 'deleted'`))
        .where(eq(bets.userId, input.userId))
        .orderBy(desc(games.matchDate))
        .limit(20);
      const userPools = await db
        .select({
          poolId: poolsT.id,
          poolName: poolsT.name,
          poolSlug: poolsT.slug,
          totalPoints: poolMemberStats.totalPoints,
          rank: poolMemberStats.rankPosition,
          joinedAt: poolMembers.joinedAt,
        })
        .from(poolMembers)
        .innerJoin(poolsT, eq(poolMembers.poolId, poolsT.id))
        .leftJoin(poolMemberStats, and(eq(poolMemberStats.userId, poolMembers.userId), eq(poolMemberStats.poolId, poolMembers.poolId)))
        .where(and(eq(poolMembers.userId, input.userId), sql`${poolsT.status} != 'deleted'`))
        .orderBy(desc(poolMembers.joinedAt))
        .limit(20);
      return {
        logs: logsAboutUser,
        adminActions,
        lastSignedIn: userRow?.lastSignedIn ?? null,
        createdAt: userRow?.createdAt ?? null,
        bets: recentBets.map(({ bet, game }) => ({
          gameId: game.id,
          teamAName: game.teamAName ?? "Time A",
          teamBName: game.teamBName ?? "Time B",
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
          realScoreA: game.scoreA,
          realScoreB: game.scoreB,
          pointsEarned: bet.pointsEarned,
          matchDate: game.matchDate,
        })),
        pools: userPools,
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      avatarUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { eq } = await import("drizzle-orm");
      const { users: usersT } = await import("../../drizzle/schema");
      const updateData: Record<string, unknown> = {};
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
      if (Object.keys(updateData).length === 0) return { success: true };
      await db.update(usersT).set(updateData).where(eq(usersT.id, ctx.user.id));
      return { success: true };
    }),

  // ─── PROGRAMA DE CONVITES (MEMBER-GET-MEMBER) ─────────────────────────────
  getMyInviteCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { eq, and, isNull } = await import("drizzle-orm");
    const { referrals } = await import("../../drizzle/schema");
    const existing = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.inviterId, ctx.user.id), isNull(referrals.inviteeId)))
      .limit(1);
    if (existing[0]) return { inviteCode: existing[0].inviteCode };
    const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const conflict = await db.select({ id: referrals.id }).from(referrals).where(eq(referrals.inviteCode, code)).limit(1);
      if (!conflict[0]) break;
      code = generateCode();
      attempts++;
    }
    await db.insert(referrals).values({ inviteCode: code, inviterId: ctx.user.id });
    return { inviteCode: code };
  }),

  getMyReferralStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { eq, and, isNotNull } = await import("drizzle-orm");
    const { referrals, users: usersT } = await import("../../drizzle/schema");
    const accepted = await db
      .select({
        registeredAt: referrals.registeredAt,
        inviteeName: usersT.name,
      })
      .from(referrals)
      .leftJoin(usersT, eq(usersT.id, referrals.inviteeId))
      .where(and(eq(referrals.inviterId, ctx.user.id), isNotNull(referrals.registeredAt)));
    return {
      totalAccepted: accepted.length,
      goal: 5,
      referrals: accepted.map((r) => ({
        registeredAt: r.registeredAt,
        inviteeName: r.inviteeName ?? "Usuário",
      })),
    };
  }),

  useInviteCode: publicProcedure
    .input(z.object({ inviteCode: z.string().min(1), newUserId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { success: false };
      const { eq, and, isNull } = await import("drizzle-orm");
      const { referrals } = await import("../../drizzle/schema");
      const [invite] = await db
        .select()
        .from(referrals)
        .where(and(eq(referrals.inviteCode, input.inviteCode), isNull(referrals.inviteeId)))
        .limit(1);
      if (!invite) return { success: false };
      if (invite.inviterId === input.newUserId) return { success: false };
      await db
        .update(referrals)
        .set({ inviteeId: input.newUserId, registeredAt: new Date() })
        .where(eq(referrals.id, invite.id));
      const { calculateAndAssignBadges } = await import("../badges");
      await calculateAndAssignBadges(invite.inviterId).catch(() => {});
      try {
        const { isNotNull, count } = await import("drizzle-orm");
        const [{ total }] = await db
          .select({ total: count() })
          .from(referrals)
          .where(and(eq(referrals.inviterId, invite.inviterId), isNotNull(referrals.registeredAt)));
        const REFERRAL_GOAL = 5;
        const totalAccepted = Number(total);
        if (totalAccepted === REFERRAL_GOAL) {
          await createNotification({
            userId: invite.inviterId,
            type: "system",
            title: "🏆 Você conquistou o badge Líder de Torcida!",
            message: `Parabéns! Você convidou ${REFERRAL_GOAL} amigos que se cadastraram na plataforma. O badge exclusivo "Líder de Torcida" foi adicionado ao seu perfil.`,
            actionUrl: "/profile/me",
            actionLabel: "Ver meu perfil",
            priority: "high",
            category: "badge_unlocked",
          });
        } else if (totalAccepted < REFERRAL_GOAL) {
          const remaining = REFERRAL_GOAL - totalAccepted;
          await createNotification({
            userId: invite.inviterId,
            type: "system",
            title: "Novo amigo cadastrado! 🎉",
            message: `Um amigo seu acabou de se cadastrar via seu link de convite. Faltam ${remaining} cadastro${remaining !== 1 ? "s" : ""} para você conquistar o badge "Líder de Torcida".`,
            actionUrl: "/my-profile",
            actionLabel: "Ver progresso",
            priority: "normal",
            category: "referral_progress",
          });
        }
      } catch (err) {
        console.error("[Referral] Erro ao enviar notificação de progresso:", err);
      }
      return { success: true };
    }),
});
