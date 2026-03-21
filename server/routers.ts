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
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

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

function calculateBetScore(
  predictedA: number,
  predictedB: number,
  actualA: number,
  actualB: number,
  rules: {
    exactScorePoints: number;
    correctResultPoints: number;
    totalGoalsPoints: number;
    goalDiffPoints: number;
    zebraPoints: number;
    zebraEnabled: boolean;
  },
  isZebraGame: boolean
) {
  let points = 0;
  let resultType: "exact" | "correct_result" | "wrong" = "wrong";
  let pointsExact = 0;
  let pointsCorrect = 0;
  let pointsGoals = 0;
  let pointsDiff = 0;
  let pointsZebra = 0;

  const exactMatch = predictedA === actualA && predictedB === actualB;
  const predictedResult = Math.sign(predictedA - predictedB);
  const actualResult = Math.sign(actualA - actualB);
  const correctResult = predictedResult === actualResult;

  if (exactMatch) {
    pointsExact = rules.exactScorePoints;
    resultType = "exact";
  } else if (correctResult) {
    pointsCorrect = rules.correctResultPoints;
    resultType = "correct_result";
  }

  // Bônus total de gols
  if (predictedA + predictedB === actualA + actualB) {
    pointsGoals = rules.totalGoalsPoints;
  }

  // Bônus diferença de gols
  if (Math.abs(predictedA - predictedB) === Math.abs(actualA - actualB)) {
    pointsDiff = rules.goalDiffPoints;
  }

  // Bônus zebra
  if (rules.zebraEnabled && isZebraGame && correctResult) {
    pointsZebra = rules.zebraPoints;
  }

  points = pointsExact + pointsCorrect + pointsGoals + pointsDiff + pointsZebra;

  return { points, resultType, pointsExact, pointsCorrect, pointsGoals, pointsDiff, pointsZebra };
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
          totalPoints: sql<number>`COALESCE(SUM(total_points), 0)`,
          exactScores: sql<number>`COALESCE(SUM(exact_scores), 0)`,
          poolsCount: sql<number>`COUNT(DISTINCT pool_id)`,
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
  }),

  // ─── TOURNAMENTS ───────────────────────────────────────────────────────────
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

    create: adminProcedure
      .input(z.object({
        name: z.string().min(3),
        slug: z.string().min(3),
        isGlobal: z.boolean().default(true),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createTournament({ ...input, createdBy: ctx.user.id });
        await createAdminLog(ctx.user.id, "create_tournament", "tournament", id);
        return { id };
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
        isZebra: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const game = await getGameById(input.gameId);
        if (!game) throw new TRPCError({ code: "NOT_FOUND" });
        await updateGameResult(input.gameId, input.scoreA, input.scoreB, input.isZebra);
        await createAdminLog(ctx.user.id, "set_result", "game", input.gameId, {
          scoreA: input.scoreA, scoreB: input.scoreB,
        });
        // TODO: enqueue BullMQ job for score recalculation
        return { success: true };
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
  }),

  // ─── POOLS ─────────────────────────────────────────────────────────────────
  pools: router({
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
      .input(z.object({ poolId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await removePoolMember(input.poolId, input.userId);
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
        exactScorePoints: z.number().optional(),
        correctResultPoints: z.number().optional(),
        totalGoalsPoints: z.number().optional(),
        goalDiffPoints: z.number().optional(),
        zebraPoints: z.number().optional(),
        zebraEnabled: z.boolean().optional(),
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
  }),

  // ─── PLATFORM SETTINGS (Admin) ─────────────────────────────────────────────
  platform: router({
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
        gaMeasurementId: z.string().optional(),
        fbPixelId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updatePlatformSettings(input, ctx.user.id);
        await createAdminLog(ctx.user.id, "update_platform_settings", "platform_settings", 1);
        return { success: true };
      }),
  }),

  // ─── ADS ───────────────────────────────────────────────────────────────────
  ads: router({
    getActive: publicProcedure
      .input(z.object({ position: z.string().optional() }))
      .query(async ({ input }) => {
        return getActiveAds(input.position);
      }),
  }),
});

export type AppRouter = typeof appRouter;
