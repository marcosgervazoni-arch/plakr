import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  addPoolMember,
  countActivePoolsByOwner,
  countPoolMembers,
  countUnreadNotifications,
  createAdminLog,
  createGame,
  createNotification,
  createPool,
  createTeam,
  createTournament,
  enqueueEmail,
  getAllUsers,
  getActiveAds,
  getBetByPoolUserGame,
  getBetsByPool,
  getGameById,
  getGamesByTournament,
  getGlobalTournaments,
  getPlatformSettings,
  getPoolById,
  getPoolByInviteCode,
  getPoolByInviteToken,
  getPoolBySlug,
  getPoolMember,
  getPoolMembers,
  getPoolRanking,
  getPoolScoringRules,
  getPoolsByUser,
  getTeamsByTournament,
  getTournamentById,
  getTournamentPhases,
  getUserById,
  getUserNotifications,
  getUserPlan,
  markAllNotificationsRead,
  markNotificationRead,
  removePoolMember,
  updateGameResult,
  updatePool,
  updatePoolMemberRole,
  updatePlatformSettings,
  updateTournament,
  updateUserBlocked,
  updateUserRole,
  upsertBet,
  upsertPoolMemberStats,
  upsertPoolScoringRules,
  upsertUserPlan,
  anonymizeUser,
  getOldestMember,
  getPoolsWhereOnlyOrganizer,
  getBetsByGameAllPools,
  getPoolsByTournament,
  getGamesByPool,
  recalculateMemberStats,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { calculateBetScore, calculateZebraContext, type ScoringRules } from "./scoring";

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

const organizerProcedure = protectedProcedure.use(async ({ ctx, input, next }) => {
  const inp = input as { poolId?: number };
  if (!inp?.poolId) return next({ ctx });
  const member = await getPoolMember(inp.poolId, ctx.user.id);
  if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode realizar esta ação." });
  }
  return next({ ctx });
});

// ─── SCORING HELPER ───────────────────────────────────────────────────────────
// calculateBetScore, calculateZebraContext e ScoringRules importados de ./scoring

// Helper local: monta ScoringRules a partir das regras do bolão + defaults da plataforma
function buildEffectiveRules(rules: Awaited<ReturnType<typeof getPoolScoringRules>>, defaultSettings: Awaited<ReturnType<typeof getPlatformSettings>>): ScoringRules {
  return {
    exactScorePoints:    rules?.exactScorePoints    ?? defaultSettings?.defaultScoringExact          ?? 10,
    correctResultPoints: rules?.correctResultPoints ?? defaultSettings?.defaultScoringCorrect         ?? 5,
    totalGoalsPoints:    rules?.totalGoalsPoints    ?? defaultSettings?.defaultScoringBonusGoals      ?? 3,
    goalDiffPoints:      rules?.goalDiffPoints      ?? defaultSettings?.defaultScoringBonusDiff       ?? 3,
    oneTeamGoalsPoints:  rules?.oneTeamGoalsPoints  ?? defaultSettings?.defaultScoringBonusOneTeam    ?? 2,
    landslidePoints:     rules?.landslidePoints     ?? defaultSettings?.defaultScoringBonusLandslide  ?? 5,
    landslideMinDiff:    (rules as any)?.landslideMinDiff ?? (defaultSettings as any)?.defaultLandslideMinDiff ?? 4,
    zebraPoints:         rules?.zebraPoints         ?? defaultSettings?.defaultScoringBonusUpset      ?? 1,
    zebraThreshold:      rules?.zebraThreshold      ?? (defaultSettings as any)?.defaultZebraThreshold ?? 75,
    zebraCountDraw:      rules?.zebraCountDraw      ?? false,
    zebraEnabled:        rules?.zebraEnabled        ?? true,
  };
}

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── USERS ─────────────────────────────────────────────────────────────────
  users: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const plan = await getUserPlan(ctx.user.id);
      const unread = await countUnreadNotifications(ctx.user.id);
      return { user, plan, unreadNotifications: unread };
    }),

    myPools: protectedProcedure.query(async ({ ctx }) => {
      return getPoolsByUser(ctx.user.id);
    }),

    myStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await (await import("./db")).getDb();
      if (!db) return { totalPoints: 0, exactScores: 0, poolsCount: 0, pointsHistory: [] };
      const { sql, eq, and } = await import("drizzle-orm");
      const { poolMembers, poolMemberStats, bets, games } = await import("../drizzle/schema");

      // Total stats across all pools
      const statsRows = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`totalPoints\`), 0)`,
          exactScores: sql<number>`COALESCE(SUM(\`pool_member_stats\`.\`exactScoreCount\`), 0)`,
          poolsCount: sql<number>`COUNT(DISTINCT \`pool_member_stats\`.\`poolId\`)`,
        })
        .from(poolMemberStats)
        .where(eq(poolMemberStats.userId, ctx.user.id));

      const stats = statsRows[0] ?? { totalPoints: 0, exactScores: 0, poolsCount: 0 };

      // Points history: last 10 scored bets ordered by game date
      const history = await db
        .select({
          matchDate: games.matchDate,
          pointsEarned: bets.pointsEarned,
        })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(and(eq(bets.userId, ctx.user.id), sql`${bets.pointsEarned} IS NOT NULL`))
        .orderBy(games.matchDate)
        .limit(20);

      return {
        totalPoints: Number(stats.totalPoints),
        exactScores: Number(stats.exactScores),
        poolsCount: Number(stats.poolsCount),
        pointsHistory: history.map((h, i) => ({
          label: new Date(h.matchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          points: Number(h.pointsEarned ?? 0),
          cumulative: 0, // will be computed client-side
        })),
      };
    }),

    myStatsByPool: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { totalPoints: 0, exactScores: 0, rank: null, totalMembers: 0, pointsHistory: [] };
        const { sql, eq, and } = await import("drizzle-orm");
        const { poolMemberStats, poolMembers, bets, games } = await import("../drizzle/schema");

        // Stats for this specific pool
        const statsRows = await db
          .select({
            totalPoints: poolMemberStats.totalPoints,
            exactScores: poolMemberStats.exactScoreCount,
            rank: poolMemberStats.rankPosition,
          })
          .from(poolMemberStats)
          .where(and(eq(poolMemberStats.userId, ctx.user.id), eq(poolMemberStats.poolId, input.poolId)))
          .limit(1);

        const stats = statsRows[0] ?? { totalPoints: 0, exactScores: 0, rank: null };

        // Total members in pool
        const membersRows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(poolMembers)
          .where(eq(poolMembers.poolId, input.poolId));
        const totalMembers = Number(membersRows[0]?.count ?? 0);

        // Points history filtered by this pool
        const history = await db
          .select({
            matchDate: games.matchDate,
            pointsEarned: bets.pointsEarned,
          })
          .from(bets)
          .innerJoin(games, eq(bets.gameId, games.id))
          .where(and(
            eq(bets.userId, ctx.user.id),
            eq(bets.poolId, input.poolId),
            sql`${bets.pointsEarned} IS NOT NULL`
          ))
          .orderBy(games.matchDate)
          .limit(20);

        return {
          totalPoints: Number(stats.totalPoints ?? 0),
          exactScores: Number(stats.exactScores ?? 0),
          rank: stats.rank ? Number(stats.rank) : null,
          totalMembers,
          pointsHistory: history.map((h) => ({
            label: new Date(h.matchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            points: Number(h.pointsEarned ?? 0),
          })),
        };
      }),

    recentBets: protectedProcedure.query(async ({ ctx }) => {
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const { eq, and, isNotNull, desc } = await import("drizzle-orm");
      const { bets, games } = await import("../drizzle/schema");

      const rows = await db
        .select({ bet: bets, game: games })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
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

    // Admin: listar todos os usuários
    list: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return getAllUsers(input.limit, input.offset);
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

    // Public profile — accessible without login
    getPublicProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq, sql, desc } = await import("drizzle-orm");
        const { users: usersT, poolMembers, poolMemberStats, pools: poolsT, userPlans } = await import("../drizzle/schema");
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
          .where(eq(poolMembers.userId, input.userId))
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
        };
      }),

    // Global ranking — top bettors across all pools
    globalRanking: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { eq, sql, desc } = await import("drizzle-orm");
        const { users: usersT, poolMemberStats } = await import("../drizzle/schema");
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
    // Admin: buscar atividade de um usuário (logs de auditoria + palpites recentes)
    getUserActivity: adminProcedure
      .input(z.object({ userId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { logs: [], adminActions: [], bets: [], pools: [], lastSignedIn: null, createdAt: null };
        const { eq, desc, and, or } = await import("drizzle-orm");
        const { adminLogs, bets, games, pools: poolsT, poolMembers, poolMemberStats, users: usersT } = await import("../drizzle/schema");
        // Dados básicos do usuário (lastSignedIn, createdAt)
        const [userRow] = await db.select({ lastSignedIn: usersT.lastSignedIn, createdAt: usersT.createdAt })
          .from(usersT).where(eq(usersT.id, input.userId)).limit(1);
        // Logs onde o usuário é o ALVO (ações de admin sobre este usuário)
        const logsAboutUser = await db.select().from(adminLogs)
          .where(and(eq(adminLogs.entityType, "user"), eq(adminLogs.entityId, input.userId)))
          .orderBy(desc(adminLogs.createdAt))
          .limit(30);
        // Ações do próprio usuário como admin
        const adminActions = await db.select().from(adminLogs)
          .where(eq(adminLogs.adminId, input.userId))
          .orderBy(desc(adminLogs.createdAt))
          .limit(input.limit);
        // Palpites recentes
        const recentBets = await db
          .select({ bet: bets, game: games })
          .from(bets)
          .innerJoin(games, eq(bets.gameId, games.id))
          .where(eq(bets.userId, input.userId))
          .orderBy(desc(games.matchDate))
          .limit(20);
        // Bolões participando
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
          .where(eq(poolMembers.userId, input.userId))
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
        whatsappLink: z.string().max(255).optional().nullable(),
        telegramLink: z.string().max(255).optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq } = await import("drizzle-orm");
        const { users: usersT } = await import("../drizzle/schema");
        const updateData: Record<string, unknown> = {};
        if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
        if (input.whatsappLink !== undefined) updateData.whatsappLink = input.whatsappLink;
        if (input.telegramLink !== undefined) updateData.telegramLink = input.telegramLink;
        if (Object.keys(updateData).length === 0) return { success: true };
        await db.update(usersT).set(updateData).where(eq(usersT.id, ctx.user.id));
        return { success: true };
      }),
  }),
  // ─── TOURNAMENTS ────────────────────────────────────────────────────────────
  tournaments: router({
    listGlobal: publicProcedure.query(async () => {
      return getGlobalTournaments();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const t = await getTournamentById(input.id);
        if (!t) throw new TRPCError({ code: "NOT_FOUND" });
        const phases = await getTournamentPhases(input.id);
        const teamList = await getTeamsByTournament(input.id);
        const gameList = await getGamesByTournament(input.id);
        return { tournament: t, phases, teams: teamList, games: gameList };
      }),

    list: adminProcedure.query(async () => {
      return getGlobalTournaments();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(3),
        slug: z.string().min(3),
        isGlobal: z.boolean().default(true),
        logoUrl: z.string().optional(),
        country: z.string().optional(),
        season: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createTournament({ ...input, createdBy: ctx.user.id });
        await createAdminLog(ctx.user.id, "create_tournament", "tournament", id);
        return { id };
      }),
    // Importar jogos via CSV
    importGames: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        csvData: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const lines = input.csvData.trim().split("\n").slice(1); // skip header
        let imported = 0;
        for (const line of lines) {
          const parts = line.split(",").map((p) => p.trim());
          if (parts.length < 4) continue;
          const [teamAName, teamBName, matchDateStr, deadlineStr, phase, venue] = parts;
          if (!teamAName || !teamBName || !matchDateStr) continue;
          try {
            await createGame({
              tournamentId: input.tournamentId,
              teamAName: teamAName.replace(/"/g, ""),
              teamBName: teamBName.replace(/"/g, ""),
              matchDate: new Date(matchDateStr.replace(/"/g, "")),
              phase: (phase ?? "Fase de Grupos").replace(/"/g, ""),
              venue: venue?.replace(/"/g, "") || undefined,
            });
            imported++;
          } catch (err) {
            console.warn("[importGames] Skipping invalid row:", line, err);
          }
        }
        await createAdminLog(ctx.user.id, "import_games", "tournament", input.tournamentId, { imported });
        return { imported };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["active", "finished", "archived"]).optional(),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateTournament(id, data);
        await createAdminLog(ctx.user.id, "update_tournament", "tournament", id);
        return { success: true };
      }),

    // Admin: adicionar jogo
    addGame: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        teamAName: z.string(),
        teamBName: z.string(),
        phase: z.string(),
        matchDate: z.number(), // timestamp ms
        venue: z.string().optional(),
        groupName: z.string().optional(),
        matchNumber: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createGame({
          ...input,
          matchDate: new Date(input.matchDate),
        });
        await createAdminLog(ctx.user.id, "add_game", "game", id, { tournamentId: input.tournamentId });
        return { id };
      }),

    // Admin: registrar resultado
    setResult: adminProcedure
      .input(z.object({
        gameId: z.number(),
        scoreA: z.number().min(0),
        scoreB: z.number().min(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const game = await getGameById(input.gameId);
        if (!game) throw new TRPCError({ code: "NOT_FOUND" });
        await updateGameResult(input.gameId, input.scoreA, input.scoreB, false);
        await createAdminLog(ctx.user.id, "set_result", "game", input.gameId, {
          scoreA: input.scoreA, scoreB: input.scoreB,
        });

        // Recalcular pontos de todos os palpites deste jogo (retroativo)
        const allBets = await getBetsByGameAllPools(input.gameId);
        const affectedPoolsSet = new Set(allBets.map((b) => b.poolId));
        const affectedPools = Array.from(affectedPoolsSet);
        const defaultSettings = await getPlatformSettings();

        for (const poolId of affectedPools) {
          const rulesRow = await getPoolScoringRules(poolId);
          const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);
          const poolBets = allBets.filter((b) => b.poolId === poolId);

          // Calcular contexto zebra automaticamente a partir dos palpites
          const zebraCtx = calculateZebraContext(poolBets, input.scoreA, input.scoreB);

          const affectedUsersSet = new Set<number>();
          for (const bet of poolBets) {
            const breakdown = calculateBetScore(
              bet.predictedScoreA, bet.predictedScoreB,
              input.scoreA, input.scoreB,
              effectiveRules, zebraCtx
            );
            await (await import("./db")).updateBetScore(bet.id, {
              pointsEarned: breakdown.total,
              pointsExactScore: breakdown.pointsExactScore,
              pointsCorrectResult: breakdown.pointsCorrectResult,
              pointsTotalGoals: breakdown.pointsTotalGoals,
              pointsGoalDiff: breakdown.pointsGoalDiff,
              pointsZebra: breakdown.pointsZebra,
              resultType: breakdown.resultType,
            });
            affectedUsersSet.add(bet.userId);
          }
          const affectedUsers = Array.from(affectedUsersSet);
          for (const userId of affectedUsers) {
            await recalculateMemberStats(poolId, userId);
          }
        }
        return { success: true, affectedBets: allBets.length };
      }),

    addTeam: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        name: z.string(),
        code: z.string().optional(),
        flagUrl: z.string().optional(),
        groupName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createTeam(input);
        return { id };
      }),
    // Admin: recalcular pontuação de todos os membros de todos os bolões de um torneio
    recalculatePool: adminProcedure
      .input(z.object({ tournamentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { pools: poolsT, poolMembers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        // Find all pools for this tournament
        const pools = await db.select({ id: poolsT.id }).from(poolsT).where(eq(poolsT.tournamentId, input.tournamentId));
        let totalRecalculated = 0;
        for (const pool of pools) {
          const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, pool.id));
          for (const member of members) {
            await recalculateMemberStats(pool.id, member.userId);
            totalRecalculated++;
          }
        }
        await createAdminLog(ctx.user.id, "recalculate_scores", "tournament", input.tournamentId, { totalRecalculated });
        return { success: true, totalRecalculated };
      }),
    // Admin/Criador: excluir campeonato
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tournaments, pools: poolsT, poolMembers, games: gamesT, teams: teamsT, tournamentPhases } = await import("../drizzle/schema");
        const { eq, inArray } = await import("drizzle-orm");
        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, input.id)).limit(1);
        if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Campeonato não encontrado." });
        const isAdmin = ctx.user.role === "admin";
        const isCreator = tournament.createdBy === ctx.user.id;
        if (!isAdmin && !isCreator) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o criador ou um administrador pode excluir este campeonato." });
        // Buscar bolões vinculados
        const linkedPools = await db.select({ id: poolsT.id, ownerId: poolsT.ownerId, name: poolsT.name })
          .from(poolsT).where(eq(poolsT.tournamentId, input.id));
        if (linkedPools.length > 0) {
          const poolIds = linkedPools.map(p => p.id);
          const ownerIds = Array.from(new Set(linkedPools.map(p => p.ownerId).filter(id => id !== ctx.user.id)));
          for (const ownerId of ownerIds) {
            await createNotification({ userId: ownerId, type: "system", title: "Campeonato excluído",
              message: `O campeonato "${tournament.name}" foi excluído pela administração. Os bolões vinculados foram encerrados.` });
          }
          const members = await db.select({ userId: poolMembers.userId }).from(poolMembers)
            .where(inArray(poolMembers.poolId, poolIds));
          const notifiedIds = new Set([ctx.user.id, ...ownerIds]);
          for (const m of members) {
            if (notifiedIds.has(m.userId)) continue;
            await createNotification({ userId: m.userId, type: "system", title: "Campeonato excluído",
              message: `O campeonato "${tournament.name}" foi excluído. Seu bolão vinculado foi encerrado.` });
            notifiedIds.add(m.userId);
          }
          await db.update(poolsT).set({ status: "deleted" }).where(inArray(poolsT.id, poolIds));
        }
        // Deletar na ordem correta para respeitar FK constraints:
        // 1. Jogos (FK para tournaments)
        // 2. Times (FK para tournaments)
        // 3. Fases (FK para tournaments com ON DELETE NO ACTION — causa o erro de FK se não deletadas antes)
        // 4. Torneio
        await db.delete(gamesT).where(eq(gamesT.tournamentId, input.id));
        await db.delete(teamsT).where(eq(teamsT.tournamentId, input.id));
        await db.delete(tournamentPhases).where(eq(tournamentPhases.tournamentId, input.id));
        await db.delete(tournaments).where(eq(tournaments.id, input.id));
        await createAdminLog(ctx.user.id, "delete_tournament", "tournament", input.id, { name: tournament.name, linkedPools: linkedPools.length });
        return { success: true };
      }),
    // Admin: excluir jogo individual
    deleteGame: adminProcedure
      .input(z.object({ gameId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { games: gamesT } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [game] = await db.select().from(gamesT).where(eq(gamesT.id, input.gameId)).limit(1);
        if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "Jogo não encontrado." });
        await db.delete(gamesT).where(eq(gamesT.id, input.gameId));
        await createAdminLog(ctx.user.id, "delete_game", "game", input.gameId, { teamAName: game.teamAName, teamBName: game.teamBName });
        return { success: true };
      }),
    // Admin: excluir time individual
    deleteTeam: adminProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teams: teamsT } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [team] = await db.select().from(teamsT).where(eq(teamsT.id, input.teamId)).limit(1);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Time não encontrado." });
        await db.delete(teamsT).where(eq(teamsT.id, input.teamId));
        await createAdminLog(ctx.user.id, "delete_team", "team", input.teamId, { name: team.name });
        return { success: true };
      }),
    // Admin: importar jogos via Google Sheets (URL pública)
    importFromSheets: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        sheetsUrl: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Convert Google Sheets URL to CSV export URL
        let csvUrl = input.sheetsUrl;
        const editMatch = csvUrl.match(/\/spreadsheets\/d\/([^/]+)/);
        const gidMatch = csvUrl.match(/[?&]gid=(\d+)/);
        if (editMatch) {
          const sheetId = editMatch[1];
          const gid = gidMatch ? gidMatch[1] : "0";
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        }
        const response = await fetch(csvUrl);
        if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível acessar a planilha. Verifique se ela é pública." });
        const csvData = await response.text();
        const lines = csvData.trim().split("\n").slice(1); // skip header
        let imported = 0;
        let skipped = 0;
        for (const line of lines) {
          const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
          if (parts.length < 3) { skipped++; continue; }
          const [teamAName, teamBName, matchDateStr, , phase] = parts;
          if (!teamAName || !teamBName || !matchDateStr) { skipped++; continue; }
          try {
            await createGame({
              tournamentId: input.tournamentId,
              teamAName,
              teamBName,
              matchDate: new Date(matchDateStr),
              phase: phase || "Fase de Grupos",
            });
            imported++;
          } catch (err) {
            console.warn("[importFromSheets] Skipping row:", line, err);
            skipped++;
          }
        }
        await createAdminLog(ctx.user.id, "import_from_sheets", "tournament", input.tournamentId, { imported, skipped, sheetsUrl: input.sheetsUrl });
        return { imported, skipped };
      }),

    // Adicionar fase ao campeonato
    addPhase: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        key: z.string(),
        label: z.string(),
        order: z.number(),
        slots: z.number().default(2),
        isKnockout: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        const { tournamentPhases } = await import("../drizzle/schema");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [phase] = await db.insert(tournamentPhases).values({
          tournamentId: input.tournamentId,
          key: input.key,
          label: input.label,
          order: input.order,
          slots: input.slots,
          isKnockout: input.isKnockout,
          enabled: true,
          updatedAt: new Date(),
        }).$returningId();
        await createAdminLog(ctx.user.id, "add_phase", "tournament", input.tournamentId, { key: input.key, label: input.label });
        return { id: phase.id };
      }),

    // Atualizar fase
    updatePhase: adminProcedure
      .input(z.object({
        phaseId: z.number(),
        label: z.string().optional(),
        order: z.number().optional(),
        slots: z.number().optional(),
        isKnockout: z.boolean().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        const { tournamentPhases } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (input.label !== undefined) updates.label = input.label;
        if (input.order !== undefined) updates.order = input.order;
        if (input.slots !== undefined) updates.slots = input.slots;
        if (input.isKnockout !== undefined) updates.isKnockout = input.isKnockout ? 1 : 0;
        if (input.enabled !== undefined) updates.enabled = input.enabled ? 1 : 0;
        await db.update(tournamentPhases).set(updates).where(eq(tournamentPhases.id, input.phaseId));
        await createAdminLog(ctx.user.id, "update_phase", "tournament_phase", input.phaseId, updates);
        return { ok: true };
      }),

    // Excluir fase
    deletePhase: adminProcedure
      .input(z.object({ phaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        const { tournamentPhases } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.delete(tournamentPhases).where(eq(tournamentPhases.id, input.phaseId));
        await createAdminLog(ctx.user.id, "delete_phase", "tournament_phase", input.phaseId, {});
        return { ok: true };
      }),

    // Atualizar jogo (edit inline)
    updateGame: adminProcedure
      .input(z.object({
        gameId: z.number(),
        teamAName: z.string().optional(),
        teamBName: z.string().optional(),
        matchDate: z.date().optional(),
        venue: z.string().optional(),
        phase: z.string().optional(),
        status: z.enum(["scheduled", "live", "finished", "cancelled"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        const { games } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { gameId, ...updates } = input;
        const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (updates.teamAName !== undefined) cleanUpdates.teamAName = updates.teamAName;
        if (updates.teamBName !== undefined) cleanUpdates.teamBName = updates.teamBName;
        if (updates.matchDate !== undefined) cleanUpdates.matchDate = updates.matchDate;
        if (updates.venue !== undefined) cleanUpdates.venue = updates.venue;
        if (updates.phase !== undefined) cleanUpdates.phase = updates.phase;
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        await db.update(games).set(cleanUpdates).where(eq(games.id, gameId));
        await createAdminLog(ctx.user.id, "update_game", "game", gameId, cleanUpdates);
        return { ok: true };
      }),

    // Atualização em lote de jogos por fase
    batchUpdateGames: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        phase: z.string(),
        updates: z.array(z.object({
          gameId: z.number(),
          teamAName: z.string().optional(),
          teamBName: z.string().optional(),
          matchDate: z.date().optional(),
          venue: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        const { games } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        let updated = 0;
        for (const upd of input.updates) {
          const { gameId, ...fields } = upd;
          const cleanFields: Record<string, unknown> = { updatedAt: new Date() };
          if (fields.teamAName !== undefined) cleanFields.teamAName = fields.teamAName;
          if (fields.teamBName !== undefined) cleanFields.teamBName = fields.teamBName;
          if (fields.matchDate !== undefined) cleanFields.matchDate = fields.matchDate;
          if (fields.venue !== undefined) cleanFields.venue = fields.venue;
          await db.update(games).set(cleanFields).where(eq(games.id, gameId));
          updated++;
        }
        await createAdminLog(ctx.user.id, "batch_update_games", "tournament", input.tournamentId, { phase: input.phase, updated });
        return { updated };
      }),

    // Gerar próxima fase automaticamente a partir da classificação
    generateNextPhase: adminProcedure
      .input(z.object({
        tournamentId: z.number(),
        currentPhase: z.string(), // key da fase atual (ex: "group_a")
        nextPhase: z.string(),    // key da próxima fase (ex: "round_of_32")
        nextPhaseLabel: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar jogos da fase atual com resultado
        const db = await (await import("./db")).getDb();
        const { games } = await import("../drizzle/schema");
        const { eq, and, isNotNull } = await import("drizzle-orm");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const finishedGames = await db.select().from(games)
          .where(and(eq(games.tournamentId, input.tournamentId), eq(games.phase, input.currentPhase), isNotNull(games.scoreA)));
        // Coletar times classificados (vencedores ou por pontos)
        const teamSet = new Set<string>();
        for (const g of finishedGames) {
          if (g.scoreA !== null && g.scoreB !== null) {
            if (g.scoreA > g.scoreB && g.teamAName) teamSet.add(g.teamAName);
            else if (g.scoreB > g.scoreA && g.teamBName) teamSet.add(g.teamBName);
          }
        }
        const qualifiedTeams = Array.from(teamSet);
        // Criar jogos TBD para a próxima fase
        let created = 0;
        for (let i = 0; i < Math.floor(qualifiedTeams.length / 2); i++) {
          await createGame({
            tournamentId: input.tournamentId,
            teamAName: qualifiedTeams[i * 2] ?? "A Definir",
            teamBName: qualifiedTeams[i * 2 + 1] ?? "A Definir",
            matchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
            phase: input.nextPhaseLabel,
          });
          created++;
        }
        await createAdminLog(ctx.user.id, "generate_next_phase", "tournament", input.tournamentId, { currentPhase: input.currentPhase, nextPhase: input.nextPhase, created });
        return { created, qualifiedTeams };
      }),
  }),

  // ─── POOLS ─────────────────────────────────────────────────────────────────
  pools: router({
    // Admin: listar todos os bolões
    adminList: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { pools: poolsTable, poolMembers } = await import("../drizzle/schema");
        const { desc, sql } = await import("drizzle-orm");
        const rows = await db
          .select({
            id: poolsTable.id,
            name: poolsTable.name,
            slug: poolsTable.slug,
            status: poolsTable.status,
            accessType: poolsTable.accessType,
            plan: poolsTable.plan,
            logoUrl: poolsTable.logoUrl,
            createdAt: poolsTable.createdAt,
            ownerId: poolsTable.ownerId,
            tournamentId: poolsTable.tournamentId,
            description: poolsTable.description,
            planExpiresAt: poolsTable.planExpiresAt,
            stripeSubscriptionId: poolsTable.stripeSubscriptionId,
            memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = pools.id AND pm.\`isBlocked\` = 0)`,
          })
          .from(poolsTable)
          .orderBy(desc(poolsTable.createdAt))
          .limit(input.limit);
        return rows.map(r => ({ ...r, memberCount: Number(r.memberCount) }));
      }),
    adminUpdatePool: adminProcedure
      .input(z.object({
        poolId: z.number(),
        status: z.enum(["active", "finished", "deleted"]).optional(),
        accessType: z.enum(["public", "private_code", "private_link"]).optional(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { pools: poolsTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updates: Record<string, unknown> = {};
        if (input.status !== undefined) updates.status = input.status;
        if (input.accessType !== undefined) updates.accessType = input.accessType;
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        await db.update(poolsTable).set(updates).where(eq(poolsTable.id, input.poolId));
        await createAdminLog(ctx.user.id, "update_pool", "pool", input.poolId, updates);
        return { success: true };
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3).max(100),
        tournamentId: z.number(),
        accessType: z.enum(["public", "private_code", "private_link"]).default("private_link"),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar limite do plano gratuito
        const settings = await getPlatformSettings();
        const freeMax = settings?.freeMaxPools ?? 2;
        const activeCount = await countActivePoolsByOwner(ctx.user.id);
        const userPlan = await getUserPlan(ctx.user.id);
        const isPro = userPlan?.plan === "pro" && userPlan.isActive;

        if (!isPro && activeCount >= freeMax) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Limite de ${freeMax} bolões ativos no plano gratuito. Faça upgrade para o Plano Pro.`,
          });
        }

        const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(6)}`;
        const inviteToken = nanoid(32);
        const inviteCode = nanoid(8).toUpperCase();

        const poolId = await createPool({
          ...input,
          slug,
          inviteToken,
          inviteCode,
          ownerId: ctx.user.id,
        });

        // Adicionar criador como organizador
        await addPoolMember(poolId, ctx.user.id, "organizer");

        // Criar regras de pontuação padrão
        await upsertPoolScoringRules(poolId, {}, ctx.user.id);

        return { poolId, slug, inviteToken };
      }),

    getBySlug: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input, ctx }) => {
        const pool = await getPoolBySlug(input.slug);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        const member = await getPoolMember(pool.id, ctx.user.id);
        if (!member && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não é membro deste bolão." });
        }
        const tournament = await getTournamentById(pool.tournamentId);
        const gameList = await getGamesByTournament(pool.tournamentId);
        const rules = await getPoolScoringRules(pool.id);
        const memberCount = await countPoolMembers(pool.id);
        return { pool, tournament, games: gameList, rules, memberCount, myRole: member?.role };
      }),

    listPublic: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        tournamentId: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { pools: [], total: 0 };
        const { sql, eq, and, like, desc } = await import("drizzle-orm");
        const { pools: poolsTable, tournaments, users: usersTable } = await import("../drizzle/schema");

        const conditions = [
          eq(poolsTable.status, "active"),
          eq(poolsTable.accessType, "public"),
        ];
        if (input.search) {
          conditions.push(like(poolsTable.name, `%${input.search}%`));
        }
        if (input.tournamentId) {
          conditions.push(eq(poolsTable.tournamentId, input.tournamentId));
        }

        const rows = await db
          .select({
            pool: poolsTable,
            tournamentName: tournaments.name,
            ownerName: usersTable.name,
            memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.pool_id = ${poolsTable.id})`,
          })
          .from(poolsTable)
          .leftJoin(tournaments, eq(poolsTable.tournamentId, tournaments.id))
          .leftJoin(usersTable, eq(poolsTable.ownerId, usersTable.id))
          .where(and(...conditions))
          .orderBy(desc(poolsTable.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          pools: rows.map((r) => ({
            id: r.pool.id,
            slug: r.pool.slug,
            name: r.pool.name,
            logoUrl: r.pool.logoUrl,
            plan: r.pool.plan,
            tournamentName: r.tournamentName ?? null,
            ownerName: r.ownerName ?? null,
            memberCount: Number(r.memberCount),
          })),
          total: rows.length,
        };
      }),

    previewByToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input, ctx }) => {
        const pool = await getPoolByInviteToken(input.token);
        if (!pool || pool.status !== "active") return null;
        const tournament = await getTournamentById(pool.tournamentId);
        const owner = await getUserById(pool.ownerId);
        const memberCount = await countPoolMembers(pool.id);
        return {
          slug: pool.slug,
          name: pool.name,
          logoUrl: pool.logoUrl,
          tournament: tournament ? { name: tournament.name } : null,
          memberCount,
          ownerName: owner?.name ?? null,
          plan: pool.plan,
        };
      }),

    searchByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const pool = await getPoolByInviteCode(input.code);
        if (!pool || pool.status !== "active") return null;
        const tournament = await getTournamentById(pool.tournamentId);
        const owner = await getUserById(pool.ownerId);
        const memberCount = await countPoolMembers(pool.id);
        const existing = await getPoolMember(pool.id, ctx.user.id);
        return {
          slug: pool.slug,
          name: pool.name,
          logoUrl: pool.logoUrl,
          tournament: tournament ? { name: tournament.name } : null,
          memberCount,
          ownerName: owner?.name ?? null,
          plan: pool.plan,
          alreadyMember: !!existing,
        };
      }),

    joinByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const pool = await getPoolByInviteCode(input.code);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND", message: "Código de convite inválido." });
        if (pool.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Este bolão não está mais ativo." });

        const existing = await getPoolMember(pool.id, ctx.user.id);
        if (existing) return { poolId: pool.id, slug: pool.slug, alreadyMember: true };

        const settings = await getPlatformSettings();
        const freeMax = settings?.freeMaxParticipants ?? 50;
        const memberCount = await countPoolMembers(pool.id);
        if (pool.plan === "free" && memberCount >= freeMax) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Este bolão atingiu o limite de ${freeMax} participantes.` });
        }

        await addPoolMember(pool.id, ctx.user.id, "participant");
        await createNotification({
          userId: pool.ownerId,
          poolId: pool.id,
          type: "system",
          title: "Novo participante",
          message: `${ctx.user.name ?? "Um usuário"} entrou no bolão "${pool.name}".`,
        });
        return { poolId: pool.id, slug: pool.slug, alreadyMember: false };
      }),

    joinByToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const pool = await getPoolByInviteToken(input.token);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND", message: "Link de convite inválido ou expirado." });
        if (pool.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Este bolão não está mais ativo." });

        const existing = await getPoolMember(pool.id, ctx.user.id);
        if (existing) return { poolId: pool.id, slug: pool.slug, alreadyMember: true };

        // Verificar limite de participantes
        const settings = await getPlatformSettings();
        const freeMax = settings?.freeMaxParticipants ?? 50;
        const memberCount = await countPoolMembers(pool.id);
        if (pool.plan === "free" && memberCount >= freeMax) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Este bolão atingiu o limite de ${freeMax} participantes do plano gratuito.`,
          });
        }

        await addPoolMember(pool.id, ctx.user.id, "participant");
        await createNotification({
          userId: pool.ownerId,
          poolId: pool.id,
          type: "system",
          title: "Novo participante",
          message: `${ctx.user.name ?? "Um usuário"} entrou no bolão "${pool.name}".`,
        });

        return { poolId: pool.id, slug: pool.slug, alreadyMember: false };
      }),

    update: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        accessType: z.enum(["public", "private_code", "private_link"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { poolId, ...data } = input;
        const member = await getPoolMember(poolId, ctx.user.id);
        if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updatePool(poolId, data);
        return { success: true };
      }),

    getMembers: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getPoolMembers(input.poolId);
      }),

    removeMember: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        userId: z.number(),
        anonymize: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const targetMember = await getPoolMember(input.poolId, input.userId);
        if (!targetMember) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado." });

        // Se o membro removido é organizador, transferir automaticamente
        if (targetMember.role === "organizer") {
          const oldest = await getOldestMember(input.poolId, input.userId);
          if (oldest) {
            await updatePoolMemberRole(input.poolId, oldest.userId, "organizer");
            await updatePool(input.poolId, { ownerId: oldest.userId });
            // Notificar novo organizador
            await createNotification({
              userId: oldest.userId,
              type: "system",
              title: "Você é o novo organizador",
              message: "A propriedade do bolão foi transferida para você automaticamente.",
            });
          } else {
            // Sem outros participantes — encerrar bolão
            await updatePool(input.poolId, { status: "finished" });
          }
        }

        await removePoolMember(input.poolId, input.userId);

        // Anonimizar dados globais se solicitado (apenas Super Admin)
        if (input.anonymize && ctx.user.role === "admin") {
          // Verificar se usuário tem outros bolões; se não, anonimizar globalmente
          const otherPools = await getPoolsByUser(input.userId);
          if (otherPools.length === 0) {
            await anonymizeUser(input.userId);
          }
        }

        return { success: true };
      }),

    transferOwnership: protectedProcedure
      .input(z.object({ poolId: z.number(), newOwnerId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") throw new TRPCError({ code: "FORBIDDEN" });
        await updatePoolMemberRole(input.poolId, ctx.user.id, "participant");
        await updatePoolMemberRole(input.poolId, input.newOwnerId, "organizer");
        await updatePool(input.poolId, { ownerId: input.newOwnerId });
        return { success: true };
      }),

    updateScoringRules: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        exactScorePoints: z.number().min(0).max(50).optional(),
        correctResultPoints: z.number().min(0).max(50).optional(),
        totalGoalsPoints: z.number().min(0).max(50).optional(),
        goalDiffPoints: z.number().min(0).max(50).optional(),
        oneTeamGoalsPoints: z.number().min(0).max(50).optional(),
        landslidePoints: z.number().min(0).max(50).optional(),
        landslideMinDiff: z.number().min(1).max(10).optional(),
        zebraPoints: z.number().min(0).max(50).optional(),
        zebraThreshold: z.number().min(50).max(100).optional(),
        zebraEnabled: z.boolean().optional(),
        zebraCountDraw: z.boolean().optional(),
        bettingDeadlineMinutes: z.number().optional(),
        tiebreakOrder: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { poolId, ...data } = input;
        const member = await getPoolMember(poolId, ctx.user.id);
        if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Verificar se o plano é Pro
        const pool = await getPoolById(poolId);
        if (pool?.plan !== "pro") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Regras de pontuação customizadas são exclusivas do Plano Pro.",
          });
        }
        await upsertPoolScoringRules(poolId, data, ctx.user.id);
        return { success: true };
      }),

    // Listar jogos do bolão (para tela de palpites e resultados)
    getGames: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getGamesByPool(input.poolId);
      }),

    // Registrar resultado de jogo — exclusivo Organizador Pro (campeonato personalizado)
    setGameResult: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        gameId: z.number(),
        scoreA: z.number().min(0).max(99),
        scoreB: z.number().min(0).max(99),
      }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode registrar resultados." });
        }
        // Verificar plano Pro
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        if (pool.plan !== "pro" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Registro de resultados pelo organizador é exclusivo do Plano Pro.",
          });
        }
        // Verificar que o jogo pertence ao campeonato do bolão
        const game = await getGameById(input.gameId);
        if (!game || game.tournamentId !== pool.tournamentId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Jogo não encontrado neste bolão." });
        }
        await updateGameResult(input.gameId, input.scoreA, input.scoreB, false);
        await createAdminLog(ctx.user.id, "set_result", "game", input.gameId, {
          poolId: input.poolId, scoreA: input.scoreA, scoreB: input.scoreB,
        });
        // Recalcular pontos de todos os palpites deste jogo neste bolão
        const allBets = await getBetsByGameAllPools(input.gameId);
        const poolBets = allBets.filter((b) => b.poolId === input.poolId);
        const rulesRow = await getPoolScoringRules(input.poolId);
        const defaultSettings = await getPlatformSettings();
        const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);

        // Calcular contexto zebra automaticamente a partir dos palpites
        const zebraCtx = calculateZebraContext(poolBets, input.scoreA, input.scoreB);

        const affectedUsersSet = new Set<number>();
        for (const bet of poolBets) {
          const breakdown = calculateBetScore(
            bet.predictedScoreA, bet.predictedScoreB,
            input.scoreA, input.scoreB,
            effectiveRules, zebraCtx
          );
          await (await import("./db")).updateBetScore(bet.id, {
            pointsEarned: breakdown.total,
            pointsExactScore: breakdown.pointsExactScore,
            pointsCorrectResult: breakdown.pointsCorrectResult,
            pointsTotalGoals: breakdown.pointsTotalGoals,
            pointsGoalDiff: breakdown.pointsGoalDiff,
            pointsZebra: breakdown.pointsZebra,
            resultType: breakdown.resultType,
          });
          affectedUsersSet.add(bet.userId);
        }
        const affectedUsers = Array.from(affectedUsersSet);
        for (const userId of affectedUsers) {
          await recalculateMemberStats(input.poolId, userId);
        }
        // Notificar membros que o resultado foi registrado
        const members = await getPoolMembers(input.poolId);
        for (const m of members) {
          await createNotification({
            userId: m.member.userId,
            type: "result_available",
            title: "Resultado registrado",
            message: `O resultado do jogo foi registrado: ${input.scoreA} × ${input.scoreB}. Confira sua pontuação!`,
          });
        }
        return { success: true, affectedBets: poolBets.length };
      }),

    sendInviteEmail: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        email: z.string().email(),
        inviteeName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") throw new TRPCError({ code: "FORBIDDEN" });
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        const { templatePoolInvite } = await import("./email");
        const inviteUrl = `https://apostai-bolao-djv8mgeh.manus.space/join/${pool.inviteToken}`;
        const { subject, html } = templatePoolInvite({
          inviteeName: input.inviteeName ?? "Amigo",
          organizerName: ctx.user.name ?? "Organizador",
          poolName: pool.name,
          tournamentName: "Copa",
          memberCount: 0,
          inviteUrl,
        });
        const db = await (await import("./db")).getDb();
        if (db) {
          const { emailQueue } = await import("../drizzle/schema");
          await db.insert(emailQueue).values({
            userId: ctx.user.id,
            toEmail: input.email,
            subject,
            htmlBody: html,
            status: "pending",
          });
        }
        return { success: true };
      }),

    // ─── PERFIL CONTEXTUAL POR BOLÃO ─────────────────────────────────────────
    getMemberProfile: protectedProcedure
      .input(z.object({ poolId: z.number(), userId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq, desc, and } = await import("drizzle-orm");
        const { users: usersT, poolMemberStats, bets: betsT, games: gamesT, userPlans } = await import("../drizzle/schema");
        // Verificar se o solicitante é membro ou admin
        const requester = await getPoolMember(input.poolId, ctx.user.id);
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        if (!requester && ctx.user.role !== "admin" && pool.accessType !== "public") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Dados do usuário
        const userRows = await db.select({
          id: usersT.id, name: usersT.name, avatarUrl: usersT.avatarUrl,
          createdAt: usersT.createdAt, whatsappLink: usersT.whatsappLink, telegramLink: usersT.telegramLink,
        }).from(usersT).where(eq(usersT.id, input.userId)).limit(1);
        if (!userRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
        const user = userRows[0];
        // Plano
        const planRows = await db.select().from(userPlans).where(eq(userPlans.userId, input.userId)).limit(1);
        const plan = planRows[0] ?? null;
        // Stats deste bolão
        const statsRows = await db.select().from(poolMemberStats)
          .where(and(eq(poolMemberStats.poolId, input.poolId), eq(poolMemberStats.userId, input.userId))).limit(1);
        const stats = statsRows[0] ?? null;
        // Ranking neste bolão
        const rankRows = await db.select({ userId: poolMemberStats.userId, totalPoints: poolMemberStats.totalPoints })
          .from(poolMemberStats).where(eq(poolMemberStats.poolId, input.poolId)).orderBy(desc(poolMemberStats.totalPoints));
        const rankPosition = rankRows.findIndex((r) => r.userId === input.userId) + 1;
        // Histórico de pontos acumulados (jogos finalizados)
        const betsHistory = await db.select({
          pointsEarned: betsT.pointsEarned, matchDate: gamesT.matchDate,
          teamAName: gamesT.teamAName, teamBName: gamesT.teamBName,
        }).from(betsT).innerJoin(gamesT, eq(betsT.gameId, gamesT.id))
          .where(and(eq(betsT.poolId, input.poolId), eq(betsT.userId, input.userId), eq(gamesT.status, "finished")))
          .orderBy(gamesT.matchDate);
        let cumulative = 0;
        const pointsHistory = betsHistory.map((b) => {
          cumulative += Number(b.pointsEarned ?? 0);
          return { label: `${b.teamAName ?? "?"} × ${b.teamBName ?? "?"}`, matchDate: b.matchDate, points: Number(b.pointsEarned ?? 0), cumulative };
        });
        // Últimos 10 palpites com breakdown
        const recentBets = await db.select({
          gameId: betsT.gameId, predictedScoreA: betsT.predictedScoreA, predictedScoreB: betsT.predictedScoreB,
          pointsEarned: betsT.pointsEarned, pointsExactScore: betsT.pointsExactScore,
          pointsCorrectResult: betsT.pointsCorrectResult, pointsGoalDiff: betsT.pointsGoalDiff,
          pointsZebra: betsT.pointsZebra, isZebra: betsT.isZebra,
          teamAName: gamesT.teamAName, teamBName: gamesT.teamBName,
          realScoreA: gamesT.scoreA, realScoreB: gamesT.scoreB,
          matchDate: gamesT.matchDate, gameStatus: gamesT.status, phase: gamesT.phase,
        }).from(betsT).innerJoin(gamesT, eq(betsT.gameId, gamesT.id))
          .where(and(eq(betsT.poolId, input.poolId), eq(betsT.userId, input.userId)))
          .orderBy(desc(gamesT.matchDate)).limit(10);
        return {
          user, plan,
          pool: { id: pool.id, name: pool.name, slug: pool.slug, logoUrl: pool.logoUrl },
          stats: stats ? {
            totalPoints: Number(stats.totalPoints), exactScoreCount: Number(stats.exactScoreCount),
            correctResultCount: Number(stats.correctResultCount), totalBets: Number(stats.totalBets),
            zebraCount: Number(stats.zebraCount), rankPosition, totalMembers: rankRows.length,
            accuracy: Number(stats.totalBets) > 0
              ? Math.round(((Number(stats.exactScoreCount) + Number(stats.correctResultCount)) / Number(stats.totalBets)) * 100) : 0,
          } : null,
          pointsHistory,
          recentBets: recentBets.map((b) => ({
            ...b,
            pointsEarned: Number(b.pointsEarned ?? 0), pointsExactScore: Number(b.pointsExactScore ?? 0),
            pointsCorrectResult: Number(b.pointsCorrectResult ?? 0), pointsGoalDiff: Number(b.pointsGoalDiff ?? 0),
            pointsZebra: Number(b.pointsZebra ?? 0),
          })),
        };
      }),

    // Organizador/Admin: excluir bolão com notificação aos membros
    delete: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { pools: poolsT, poolMembers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [pool] = await db.select().from(poolsT).where(eq(poolsT.id, input.poolId)).limit(1);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
        const isAdmin = ctx.user.role === "admin";
        const isOwner = pool.ownerId === ctx.user.id;
        if (!isAdmin && !isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador ou um administrador pode excluir este bolão." });
        // Notificar todos os membros
        const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
        for (const member of members) {
          if (member.userId === ctx.user.id) continue;
          await createNotification({ userId: member.userId, type: "system", title: "Bolão excluído",
            message: `O bolão "${pool.name}" foi excluído pelo organizador. Todos os seus palpites foram removidos.` });
        }
        // Soft-delete: marcar como deleted
        await db.update(poolsT).set({ status: "deleted" }).where(eq(poolsT.id, input.poolId));
        await createAdminLog(ctx.user.id, "delete_pool", "pool", input.poolId, { name: pool.name, memberCount: members.length });
        return { success: true };
      }),

    // Admin: criar bolão diretamente
    adminCreate: adminProcedure
      .input(z.object({
        name: z.string().min(3).max(100),
        tournamentId: z.number(),
        accessType: z.enum(["public", "private_code", "private_link"]).default("public"),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const slug = `${input.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`;
        const inviteToken = nanoid(32);
        const inviteCode = nanoid(8).toUpperCase();
        const poolId = await createPool({
          name: input.name,
          tournamentId: input.tournamentId,
          accessType: input.accessType,
          description: input.description,
          slug,
          inviteToken,
          inviteCode,
          ownerId: ctx.user.id,
        });
        await addPoolMember(poolId, ctx.user.id, "organizer");
        await upsertPoolScoringRules(poolId, {}, ctx.user.id);
        await createAdminLog(ctx.user.id, "admin_create_pool", "pool", poolId, { name: input.name });
        return { poolId, slug, inviteToken };
      }),

    // ─── REGRAS PÚBLICAS DO BOLÃO ─────────────────────────────────────────────────────
    getScoringRulesPublic: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        if (!member && ctx.user.role !== "admin" && pool.accessType !== "public") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getPoolScoringRules(input.poolId);
      }),

    // ─── BRACKET / CHAVEAMENTO ────────────────────────────────────────────────────────────
    getBracket: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        if (!member && ctx.user.role !== "admin" && pool.accessType !== "public") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const phases = await getTournamentPhases(pool.tournamentId);
        const games = await getGamesByTournament(pool.tournamentId);
        // Agrupar jogos por fase
        // Agrupar jogos por fase (campo phase = string key)
        const phaseKeyMap = new Map<string, typeof games>();
        for (const game of games) {
          const key = game.phase ?? "group_stage";
          if (!phaseKeyMap.has(key)) phaseKeyMap.set(key, []);
          phaseKeyMap.get(key)!.push(game);
        }
        const result = phases.map((phase) => ({
          phase,
          games: (phaseKeyMap.get(phase.key) ?? []).sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)),
        }));
        // Jogos sem fase configurada
        const knownKeys = new Set(phases.map((p) => p.key));
        const orphanGames = games.filter((g) => !knownKeys.has(g.phase ?? ""));
        if (orphanGames.length > 0) {
          result.unshift({ phase: { id: 0, tournamentId: pool.tournamentId, key: "group_stage", label: "Fase de Grupos", enabled: true, order: 0, slots: null, isKnockout: false, updatedAt: new Date() }, games: orphanGames });
        }
        return result;
      }),
  }),
  // ─── BETS ──────────────────────────────────────────────────────────────────
  bets: router({
    myBets: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member) throw new TRPCError({ code: "FORBIDDEN" });
        return getBetsByPool(input.poolId, ctx.user.id);
      }),

    placeBet: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        gameId: z.number(),
        predictedScoreA: z.number().min(0).max(99),
        predictedScoreB: z.number().min(0).max(99),
      }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.isBlocked) throw new TRPCError({ code: "FORBIDDEN" });

        const game = await getGameById(input.gameId);
        if (!game) throw new TRPCError({ code: "NOT_FOUND" });
        if (game.status === "finished" || game.status === "live") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Jogo já iniciado ou encerrado." });
        }

        // Verificar prazo
        const rules = await getPoolScoringRules(input.poolId);
        const deadlineMinutes = rules?.bettingDeadlineMinutes ?? 60;
        const deadline = new Date(game.matchDate.getTime() - deadlineMinutes * 60 * 1000);
        if (new Date() > deadline) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Prazo para palpites encerrado." });
        }

        await upsertBet({
          poolId: input.poolId,
          userId: ctx.user.id,
          gameId: input.gameId,
          predictedScoreA: input.predictedScoreA,
          predictedScoreB: input.predictedScoreB,
        });

        return { success: true };
      }),
  }),

  // ─── RANKINGS ──────────────────────────────────────────────────────────────
  rankings: router({
    getPoolRanking: protectedProcedure
      .input(z.object({ poolId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getPoolRanking(input.poolId);
      }),
  }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        return getUserNotifications(ctx.user.id, input.limit);
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const db = await (await import("./db")).getDb();
      if (!db) return null;
      const { notificationPreferences } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
      if (rows[0]) return rows[0];
      // Create defaults if not exists
      await db.insert(notificationPreferences).values({ userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { userId: ctx.user.id } });
      const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
      return created[0] ?? null;
    }),
    updatePreferences: protectedProcedure
      .input(z.object({
        inAppGameReminder: z.boolean().optional(),
        inAppRankingUpdate: z.boolean().optional(),
        inAppResultAvailable: z.boolean().optional(),
        inAppSystem: z.boolean().optional(),
        inAppAd: z.boolean().optional(),
        pushGameReminder: z.boolean().optional(),
        pushRankingUpdate: z.boolean().optional(),
        pushResultAvailable: z.boolean().optional(),
        pushSystem: z.boolean().optional(),
        pushAd: z.boolean().optional(),
        emailGameReminder: z.boolean().optional(),
        emailRankingUpdate: z.boolean().optional(),
        emailResultAvailable: z.boolean().optional(),
        emailSystem: z.boolean().optional(),
        emailAd: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { success: false };
        const { notificationPreferences } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.insert(notificationPreferences).values({ userId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: input });
        return { success: true };
      }),
    // Contagem leve de não lidas (polling eficiente)
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await countUnreadNotifications(ctx.user.id) };
    }),
    // Marcar múltiplas como lidas de uma vez
    markReadMany: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { success: false };
        const { notifications: notifT } = await import("../drizzle/schema");
        const { and, inArray, eq } = await import("drizzle-orm");
        await db
          .update(notifT)
          .set({ isRead: true })
          .where(and(inArray(notifT.id, input.ids), eq(notifT.userId, ctx.user.id)));
        return { success: true };
      }),
    // Chave pública VAPID para o Service Worker (sem auth)
    getVapidPublicKey: publicProcedure.query(async () => {
      const db = await (await import("./db")).getDb();
      if (!db) return { publicKey: null, pushEnabled: false };
      const { platformSettings: psT } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select({ vapidPublicKey: psT.vapidPublicKey, pushEnabled: psT.pushEnabled })
        .from(psT)
        .where(eq(psT.id, 1))
        .limit(1);
      return {
        publicKey: rows[0]?.vapidPublicKey ?? null,
        pushEnabled: rows[0]?.pushEnabled ?? false,
      };
    }),
    // Registrar assinatura push do dispositivo
    subscribePush: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { saveSubscription } = await import("./push");
        await saveSubscription(
          ctx.user.id,
          { endpoint: input.endpoint, keys: { p256dh: input.p256dh, auth: input.auth } },
          input.userAgent
        );
        return { success: true };
      }),
    // Remover assinatura push de um dispositivo
    unsubscribePush: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { removeSubscription } = await import("./push");
        await removeSubscription(ctx.user.id, input.endpoint);
        return { success: true };
      }),
    // Remover todas as assinaturas push do usuário
    unsubscribeAllPush: protectedProcedure.mutation(async ({ ctx }) => {
      const { removeAllSubscriptions } = await import("./push");
      await removeAllSubscriptions(ctx.user.id);
      return { success: true };
    }),
    // Estatísticas de push (admin)
    pushStats: adminProcedure.query(async () => {
      const { getPushStats } = await import("./push");
      return getPushStats();
    }),
    // Broadcast avançado: in-app + push + email por canal
    broadcast: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(2000),
        audience: z.enum(["all", "pro", "free"]).default("all"),
        channels: z.object({
          inApp: z.boolean().default(true),
          push: z.boolean().default(false),
          email: z.boolean().default(false),
        }).default({ inApp: true, push: false, email: false }),
        // Rich notification fields
        category: z.enum(["game_reminder", "result_available", "ranking_update", "advertising", "communication"]).default("communication"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        imageUrl: z.string().url().optional().or(z.literal("")),
        actionUrl: z.string().optional(),
        actionLabel: z.string().max(50).optional(),
        emoji: z.string().max(10).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { users: usersT, userPlans } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        // Resolver audiência (excluindo usuários bloqueados)
        let userIds: number[] = [];
        if (input.audience === "all") {
          const rows = await db.select({ id: usersT.id, isBlocked: usersT.isBlocked }).from(usersT);
          userIds = rows.filter((r) => !r.isBlocked).map((r) => r.id);
        } else if (input.audience === "pro") {
          const rows = await db
            .select({ userId: userPlans.userId })
            .from(userPlans)
            .innerJoin(usersT, eq(usersT.id, userPlans.userId))
            .where(eq(userPlans.plan, "pro"));
          userIds = rows.map((r) => r.userId);
        } else {
          const proRows = await db.select({ userId: userPlans.userId }).from(userPlans).where(eq(userPlans.plan, "pro"));
          const proIds = new Set(proRows.map((r) => r.userId));
          const allRows = await db.select({ id: usersT.id, isBlocked: usersT.isBlocked }).from(usersT);
          userIds = allRows.filter((r) => !r.isBlocked && !proIds.has(r.id)).map((r) => r.id);
        }
        let inAppSent = 0;
        let pushSent = 0;
        let emailSent = 0;
        // Mapear category para type da notificação
        const notifTypeMap: Record<string, "game_reminder" | "result_available" | "ranking_update" | "ad" | "system"> = {
          game_reminder: "game_reminder",
          result_available: "result_available",
          ranking_update: "ranking_update",
          advertising: "ad",
          communication: "system",
        };
        const notifType = notifTypeMap[input.category] ?? "system";
        const titleWithEmoji = input.emoji ? `${input.emoji} ${input.title}` : input.title;
        // Canal in-app
        if (input.channels.inApp) {
          for (const uid of userIds) {
            await createNotification({
              userId: uid,
              type: notifType,
              title: titleWithEmoji,
              message: input.content,
              imageUrl: input.imageUrl || undefined,
              actionUrl: input.actionUrl || undefined,
              actionLabel: input.actionLabel || undefined,
              priority: input.priority,
              category: input.category,
            });
            inAppSent++;
          }
        }
        // Canal push
        if (input.channels.push) {
          const { broadcastPush } = await import("./push");
          const result = await broadcastPush(userIds, { title: titleWithEmoji, body: input.content, url: input.actionUrl || "/notifications" }, "pushSystem");
          pushSent = result.sent;
        }
        // Canal email
        if (input.channels.email) {
          const { enqueueEmail } = await import("./email");
          const emailRows = await db
            .select({ id: usersT.id, email: usersT.email, name: usersT.name })
            .from(usersT)
            .where(eq(usersT.isBlocked, false));
          const emailMap = new Map(emailRows.map((r) => [r.id, r]));
          for (const uid of userIds) {
            const u = emailMap.get(uid);
            if (!u?.email) continue;
            const emailHtml = `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0f0f0f;color:#e5e5e5;">
  <div style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    ${input.imageUrl ? `<img src="${input.imageUrl}" alt="" style="width:100%;max-height:200px;object-fit:cover;display:block;">` : ''}
    <div style="padding:24px;">
      ${input.emoji ? `<div style="font-size:32px;margin-bottom:12px;">${input.emoji}</div>` : ''}
      <h2 style="margin:0 0 12px;color:#fff;font-size:20px;">${input.title}</h2>
      <div style="color:#aaa;font-size:14px;line-height:1.6;white-space:pre-wrap;">${input.content}</div>
      ${input.actionUrl ? `<div style="margin-top:20px;"><a href="${input.actionUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;">${input.actionLabel || 'Ver mais'}</a></div>` : ''}
    </div>
    <div style="padding:12px 24px;border-top:1px solid #2a2a2a;font-size:11px;color:#666;">ApostAI &bull; Você recebeu esta mensagem pois é usuário da plataforma.</div>
  </div>
</body></html>`;
            await enqueueEmail({
              toUserId: uid,
              toEmail: u.email,
              type: "welcome",
              subject: titleWithEmoji,
              html: emailHtml,
            });
            emailSent++;
          }
        }
        await createAdminLog(ctx.user.id, "broadcast", "platform", undefined, {
          inAppSent, pushSent, emailSent, audience: input.audience, channels: input.channels,
        });
        return { inAppSent, pushSent, emailSent, total: userIds.length };
      }),
    // Fila de e-mails (admin)
    emailQueue: adminProcedure
      .input(z.object({
        limit: z.number().default(50),
        status: z.enum(["pending", "sent", "failed", "all"]).default("all"),
      }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { emailQueue: eqT } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        if (input.status === "all") {
          return db.select().from(eqT).orderBy(desc(eqT.createdAt)).limit(input.limit);
        }        return db.select().from(eqT).where(eq(eqT.status, input.status)).orderBy(desc(eqT.createdAt)).limit(input.limit);
      }),
  }),
  // ─── NOTIFICATION TEMPLATES (Admin) ─────────────────────────────────────────
  notificationTemplates: router({
    list: adminProcedure.query(async () => {
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const { notificationTemplates } = await import("../drizzle/schema");
      return db.select().from(notificationTemplates).orderBy(notificationTemplates.type);
    }),
    update: adminProcedure
      .input(z.object({
        type: z.enum(["game_reminder", "result_available", "ranking_update"]),
        titleTemplate: z.string().min(1).max(255),
        bodyTemplate: z.string().min(1),
        pushTitleTemplate: z.string().max(255).optional(),
        pushBodyTemplate: z.string().optional(),
        emailSubjectTemplate: z.string().max(255).optional(),
        emailBodyTemplate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { notificationTemplates } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(notificationTemplates)
          .set({
            titleTemplate: input.titleTemplate,
            bodyTemplate: input.bodyTemplate,
            pushTitleTemplate: input.pushTitleTemplate ?? null,
            pushBodyTemplate: input.pushBodyTemplate ?? null,
            emailSubjectTemplate: input.emailSubjectTemplate ?? null,
            emailBodyTemplate: input.emailBodyTemplate ?? null,
            updatedBy: ctx.user.id,
          })
          .where(eq(notificationTemplates.type, input.type));
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({
        type: z.enum(["game_reminder", "result_available", "ranking_update"]),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { notificationTemplates } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(notificationTemplates)
          .set({ enabled: input.enabled, updatedBy: ctx.user.id })
          .where(eq(notificationTemplates.type, input.type));
        return { success: true };
      }),
  }),
  // ─── PLATFORM SETTINGS (Admin) ───────────────────────────────────────────────
  platform: router({
    // Dashboard global: métricas agregadas da plataforma
    getStats: adminProcedure.query(async () => {
      const db = await (await import("./db")).getDb();
      if (!db) return { totalUsers: 0, totalPools: 0, activePools: 0, proPlans: 0, totalBets: 0, totalTournaments: 0 };
      const { users: usersT, pools: poolsT, bets: betsT, tournaments: tourT, userPlans: plansT } = await import("../drizzle/schema");
      const { count, eq } = await import("drizzle-orm");
      const [[usersCount], [poolsCount], [activeCount], [proCount], [betsCount], [tourCount]] = await Promise.all([
        db.select({ c: count() }).from(usersT),
        db.select({ c: count() }).from(poolsT),
        db.select({ c: count() }).from(poolsT).where(eq(poolsT.status, "active")),
        db.select({ c: count() }).from(poolsT).where(eq(poolsT.plan, "pro")),
        db.select({ c: count() }).from(betsT),
        db.select({ c: count() }).from(tourT),
      ]);
      return {
        totalUsers: Number(usersCount?.c ?? 0),
        totalPools: Number(poolsCount?.c ?? 0),
        activePools: Number(activeCount?.c ?? 0),
        proPlans: Number(proCount?.c ?? 0),
        totalBets: Number(betsCount?.c ?? 0),
        totalTournaments: Number(tourCount?.c ?? 0),
      };
    }),
    getSettings: adminProcedure.query(async () => {
      return getPlatformSettings();
    }),

    updateSettings: adminProcedure
      .input(z.object({
        freeMaxParticipants: z.number().optional(),
        freeMaxPools: z.number().optional(),
        poolArchiveDays: z.number().optional(),
        defaultScoringExact: z.number().optional(),
        defaultScoringCorrect: z.number().optional(),
        defaultScoringBonusGoals: z.number().optional(),
        defaultScoringBonusDiff: z.number().optional(),
        defaultScoringBonusUpset: z.number().optional(),
        defaultScoringBonusOneTeam: z.number().optional(),
        defaultScoringBonusLandslide: z.number().optional(),
        defaultLandslideMinDiff: z.number().min(1).max(10).optional(),
        defaultZebraThreshold: z.number().min(50).max(100).optional(),
        gaMeasurementId: z.string().optional(),
        fbPixelId: z.string().optional(),
        stripePriceIdPro: z.string().optional(),
        stripeMonthlyPrice: z.number().optional(),
        // VAPID / Push
        vapidPublicKey: z.string().optional(),
        vapidPrivateKey: z.string().optional(),
        vapidEmail: z.string().email().optional(),
        pushEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updatePlatformSettings(input, ctx.user.id);
        await createAdminLog(ctx.user.id, "update_platform_settings", "platform_settings", 1);
        return { success: true };
      }),
    // Gerar novo par de VAPID keys (admin)
    generateVapidKeys: adminProcedure.mutation(async () => {
      const { generateVapidKeys } = await import("./push");
      const keys = generateVapidKeys();
      return keys; // retorna { publicKey, privateKey } para o admin salvar
    }),
    getAuditLogs: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { adminLogs } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(input.limit);
      }),
  }),

   // ─── STRIPE ───────────────────────────────────────────────────────────────
  stripe: router({
    // Criar sessão de checkout para ativar o Plano Pro num bolão
    createCheckout: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        origin: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        const pool = await getPoolById(input.poolId);
        if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode assinar o Plano Pro." });
        }
        if (pool.plan === "pro") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este bolão já possui o Plano Pro." });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
          apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
        });

        // Ler Price ID do banco (configurável via painel Admin → Configurações)
        const platformConfig = await getPlatformSettings();
        const priceId = platformConfig?.stripePriceIdPro || process.env.STRIPE_PRO_PRICE_ID;
        if (!priceId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Price ID do Plano Pro não configurado. Acesse Admin → Configurações e insira o Price ID do Stripe.",
          });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            pool_id: input.poolId.toString(),
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          subscription_data: {
            metadata: {
              user_id: ctx.user.id.toString(),
              pool_id: input.poolId.toString(),
            },
          },
          allow_promotion_codes: true,
          success_url: `${input.origin}/organizer/${input.poolId}?checkout=success`,
          cancel_url: `${input.origin}/organizer/${input.poolId}?checkout=cancelled`,
        });

        return { checkoutUrl: session.url };
      }),

    // Abrir portal de gestão de assinatura Stripe
    createPortalSession: protectedProcedure
      .input(z.object({
        poolId: z.number(),
        origin: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        const plan = await getUserPlan(ctx.user.id);
        if (!plan?.stripeCustomerId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Nenhuma assinatura ativa encontrada.",
          });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
          apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
        });

        const session = await stripe.billingPortal.sessions.create({
          customer: plan.stripeCustomerId,
          return_url: `${input.origin}/organizer/${input.poolId}`,
        });

        return { portalUrl: session.url };
      }),
  }),
  // ─── ADS ──────────────────────────────────────────────────────────────────
  ads: router({
    getActive: publicProcedure
      .input(z.object({ position: z.string().optional() }))
      .query(async ({ input }) => {
        return getActiveAds(input.position);
      }),
    list: adminProcedure.query(async () => {
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const { ads: adsT, adClicks } = await import("../drizzle/schema");
      const { desc, count, eq } = await import("drizzle-orm");
      const rows = await db.select().from(adsT).orderBy(desc(adsT.createdAt));
      const clickCounts = await db.select({ adId: adClicks.adId, clicks: count() }).from(adClicks).groupBy(adClicks.adId);
      const clickMap = new Map(clickCounts.map((c) => [c.adId, Number(c.clicks)]));
      return rows.map((a) => ({ ...a, clicks: clickMap.get(a.id) ?? 0 }));
    }),
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        assetUrl: z.string().optional(),
        linkUrl: z.string().optional(),
        type: z.enum(["banner", "video", "script"]).default("banner"),
        position: z.enum(["sidebar", "top", "between_sections", "bottom", "popup"]).default("sidebar"),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { ads: adsT } = await import("../drizzle/schema");
        await db.insert(adsT).values({ title: input.title, assetUrl: input.assetUrl, linkUrl: input.linkUrl, type: input.type, position: input.position, isActive: input.isActive, createdBy: ctx.user.id });
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { ads: adsT } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(adsT).set({ isActive: input.isActive }).where(eq(adsT.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { ads: adsT } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.delete(adsT).where(eq(adsT.id, input.id));
        return { success: true };
      }),
    clicksByDay: adminProcedure
      .input(z.object({ adId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { adClicks, ads: adsT } = await import("../drizzle/schema");
        const { eq, and, sql, desc } = await import("drizzle-orm");
        const conditions = input.adId ? [eq(adClicks.adId, input.adId)] : [];
        const rows = await db
          .select({
            adId: adClicks.adId,
            adTitle: adsT.title,
            day: sql<string>`DATE(${adClicks.createdAt})`,
            clicks: sql<number>`COUNT(*)`,
          })
          .from(adClicks)
          .innerJoin(adsT, eq(adClicks.adId, adsT.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(adClicks.adId, adsT.title, sql`DATE(${adClicks.createdAt})`)
          .orderBy(desc(sql`DATE(${adClicks.createdAt})`));
        return rows.map((r) => ({ ...r, clicks: Number(r.clicks) }));
      }),
    recordClick: publicProcedure
      .input(z.object({ adId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return { success: false };
        const { adClicks } = await import("../drizzle/schema");
        await db.insert(adClicks).values({ adId: input.adId, userId: ctx.user?.id ?? null });
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        assetUrl: z.string().optional().nullable(),
        linkUrl: z.string().optional().nullable(),
        type: z.enum(["banner", "video", "script"]).optional(),
        position: z.enum(["sidebar", "top", "between_sections", "bottom", "popup"]).optional(),
        isActive: z.boolean().optional(),
        device: z.string().optional(),
        startAt: z.date().optional().nullable(),
        endAt: z.date().optional().nullable(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { ads: adsT } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { id, ...updates } = input;
        await db.update(adsT).set(updates as Record<string, unknown>).where(eq(adsT.id, id));
        await createAdminLog(ctx.user.id, "ads.update", "ad", id, { updates });
        return { success: true };
      }),
    globalToggle: adminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("DB not available");
        const { platformSettings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(platformSettings).set({ adsEnabled: input.enabled }).where(eq(platformSettings.id, 1));
        await createAdminLog(ctx.user.id, "ads.globalToggle", "platform", 1, { adsEnabled: input.enabled });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
