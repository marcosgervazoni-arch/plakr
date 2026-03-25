/**
 * ApostAI — Router de Bolões
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  calculateBetScore,
  calculateZebraContext,
  type ScoringRules,
} from "../scoring";
import {
  addPoolMember,
  anonymizeUser,
  countActivePoolsByOwner,
  countPoolMembers,
  createAdminLog,
  createNotification,
  createPool,
  getBetsByGameAllPools,
  getGameById,
  getGamesByTournament,
  getOldestMember,
  getPoolById,
  getPoolByInviteCode,
  getPoolByInviteToken,
  getPoolBySlug,
  getPoolMember,
  getPoolMembers,
  getPoolRanking,
  getPoolScoringRules,
  getPoolsByUser,
  getTournamentById,
  getTournamentPhases,
  getUserById,
  getUserPlan,
  getPlatformSettings,
  recalculateMemberStats,
  removePoolMember,
  updateBetScore,
  updateGameResult,
  updatePool,
  updatePoolMemberRole,
  upsertPoolScoringRules,
  getGamesByPool,
} from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

// Helper local: monta ScoringRules a partir das regras do bolão + defaults da plataforma
function buildEffectiveRules(
  rules: Awaited<ReturnType<typeof getPoolScoringRules>>,
  defaultSettings: Awaited<ReturnType<typeof getPlatformSettings>>
): ScoringRules {
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

export const poolsRouter = router({
  // Admin: listar todos os bolões
  adminList: adminProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { pools: poolsTable, poolMembers } = await import("../../drizzle/schema");
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
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { pools: poolsTable } = await import("../../drizzle/schema");
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
      await addPoolMember(poolId, ctx.user.id, "organizer");
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
      const phases = await getTournamentPhases(pool.tournamentId);
      return { pool, tournament, games: gameList, rules, memberCount, myRole: member?.role, phases };
    }),

  listPublic: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tournamentId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { pools: [], total: 0 };
      const { sql, eq, and, like, desc } = await import("drizzle-orm");
      const { pools: poolsTable, tournaments, users: usersTable } = await import("../../drizzle/schema");
      const conditions = [eq(poolsTable.status, "active")];
      if (input.search) conditions.push(like(poolsTable.name, `%${input.search}%`));
      if (input.tournamentId) conditions.push(eq(poolsTable.tournamentId, input.tournamentId));
      const userId = ctx.user.id;
      const rows = await db
        .select({
          pool: poolsTable,
          tournamentName: tournaments.name,
          ownerName: usersTable.name,
          memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = ${poolsTable.id})`,
          isMember: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = ${poolsTable.id} AND pm.\`userId\` = ${userId})`,
          totalGames: sql<number>`(SELECT COUNT(*) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId})`,
          finishedGames: sql<number>`(SELECT COUNT(*) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId} AND g.\`status\` = 'finished')`,
          nextMatchDate: sql<Date | null>`(SELECT MIN(g.\`matchDate\`) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId} AND g.\`status\` = 'scheduled')`,
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
          accessType: r.pool.accessType,
          description: r.pool.description ?? null,
          tournamentName: r.tournamentName ?? null,
          ownerName: r.ownerName ?? null,
          memberCount: Number(r.memberCount),
          isMember: Number(r.isMember) > 0,
          totalGames: Number(r.totalGames),
          finishedGames: Number(r.finishedGames),
          nextMatchDate: r.nextMatchDate ?? null,
        })),
        total: rows.length,
      };
    }),

  previewByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
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
      const settings = await getPlatformSettings();
      const freeMax = settings?.freeMaxParticipants ?? 50;
      const memberCount = await countPoolMembers(pool.id);
      if (pool.plan === "free" && memberCount >= freeMax) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Este bolão atingiu o limite de ${freeMax} participantes do plano gratuito.` });
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

  joinPublic: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolBySlug(input.slug);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
      if (pool.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Este bolão não está mais ativo." });
      if (pool.accessType !== "public") throw new TRPCError({ code: "FORBIDDEN", message: "Este bolão não é público." });
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

  update: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      accessType: z.enum(["public", "private_code", "private_link"]).optional(),
      tournamentId: z.number().optional(),
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

  // [T3] getMembers com paginação manual
  getMembers: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      limit: z.number().min(1).max(200).default(100),
      cursor: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const allMembers = await getPoolMembers(input.poolId);
      // Paginação cursor-based manual
      const startIdx = input.cursor ? allMembers.findIndex((m) => m.member.userId === input.cursor) + 1 : 0;
      const page = allMembers.slice(startIdx, startIdx + input.limit + 1);
      const hasMore = page.length > input.limit;
      const items = hasMore ? page.slice(0, input.limit) : page;
      const nextCursor = hasMore ? items[items.length - 1]?.member?.userId : undefined;
      // Enriquecer com lastBetAt e isInactive
      const db = await (await import("../db")).getDb();
      if (!db) return { items, nextCursor, hasMore };
      const { bets: betsT, games: gamesT } = await import("../../drizzle/schema");
      const { desc, eq, and, inArray } = await import("drizzle-orm");
      const pool = await getPoolById(input.poolId);
      const last3Games = pool?.tournamentId
        ? await db.select({ id: gamesT.id })
            .from(gamesT)
            .where(and(eq(gamesT.tournamentId, pool.tournamentId), eq(gamesT.status, "finished")))
            .orderBy(desc(gamesT.matchDate))
            .limit(3)
        : [];
      const last3GameIds = last3Games.map((g) => g.id);
      const enriched = await Promise.all(
        items.map(async (m) => {
          const [lastBet] = await db.select({ createdAt: betsT.createdAt })
            .from(betsT)
            .where(and(eq(betsT.poolId, input.poolId), eq(betsT.userId, m.member.userId)))
            .orderBy(desc(betsT.createdAt))
            .limit(1);
          const betsInLast3 = last3GameIds.length > 0
            ? await db.select({ id: betsT.id })
                .from(betsT)
                .where(and(
                  eq(betsT.poolId, input.poolId),
                  eq(betsT.userId, m.member.userId),
                  inArray(betsT.gameId, last3GameIds)
                ))
            : [];
          const isInactive = last3GameIds.length > 0 && betsInLast3.length === 0;
          return { ...m, lastBetAt: lastBet?.createdAt ?? null, isInactive };
        })
      );
      return { items: enriched, nextCursor, hasMore };
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
      if (targetMember.role === "organizer") {
        const oldest = await getOldestMember(input.poolId, input.userId);
        if (oldest) {
          await updatePoolMemberRole(input.poolId, oldest.userId, "organizer");
          await updatePool(input.poolId, { ownerId: oldest.userId });
          await createNotification({
            userId: oldest.userId,
            type: "system",
            title: "Você é o novo organizador",
            message: "A propriedade do bolão foi transferida para você automaticamente.",
          });
        } else {
          await updatePool(input.poolId, { status: "finished" });
        }
      }
      await removePoolMember(input.poolId, input.userId);
      if (input.anonymize && ctx.user.role === "admin") {
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

  getGames: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getGamesByPool(input.poolId);
    }),

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
      const pool = await getPoolById(input.poolId);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
      if (pool.plan !== "pro" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Registro de resultados pelo organizador é exclusivo do Plano Pro." });
      }
      const game = await getGameById(input.gameId);
      if (!game || game.tournamentId !== pool.tournamentId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jogo não encontrado neste bolão." });
      }
      await updateGameResult(input.gameId, input.scoreA, input.scoreB, false);
      await createAdminLog(ctx.user.id, "set_result", "game", input.gameId, {
        poolId: input.poolId, scoreA: input.scoreA, scoreB: input.scoreB,
      });
      const allBets = await getBetsByGameAllPools(input.gameId);
      const poolBets = allBets.filter((b) => b.poolId === input.poolId);
      const rulesRow = await getPoolScoringRules(input.poolId);
      const defaultSettings = await getPlatformSettings();
      const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);
      const zebraCtx = calculateZebraContext(poolBets, input.scoreA, input.scoreB);
      const affectedUsersSet = new Set<number>();
      for (const bet of poolBets) {
        const breakdown = calculateBetScore(
          bet.predictedScoreA, bet.predictedScoreB,
          input.scoreA, input.scoreB,
          effectiveRules, zebraCtx
        );
        await updateBetScore(bet.id, {
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
        import("../badges").then(({ calculateAndAssignBadges }) =>
          calculateAndAssignBadges(userId).catch((e: unknown) =>
            console.error("[Badges] Erro ao calcular badges:", e)
          )
        );
      }
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
      const { templatePoolInvite } = await import("../email");
      const inviteUrl = `https://apostai-bolao-djv8mgeh.manus.space/join/${pool.inviteToken}`;
      const { subject, html } = templatePoolInvite({
        inviteeName: input.inviteeName ?? "Amigo",
        organizerName: ctx.user.name ?? "Organizador",
        poolName: pool.name,
        tournamentName: "Copa",
        memberCount: 0,
        inviteUrl,
      });
      const db = await (await import("../db")).getDb();
      if (db) {
        const { emailQueue } = await import("../../drizzle/schema");
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

  getMemberProfile: protectedProcedure
    .input(z.object({ poolId: z.number(), userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { eq, desc, and } = await import("drizzle-orm");
      const { users: usersT, poolMemberStats, bets: betsT, games: gamesT, userPlans, badges: badgesT, userBadges } = await import("../../drizzle/schema");
      const requester = await getPoolMember(input.poolId, ctx.user.id);
      const pool = await getPoolById(input.poolId);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
      if (!requester && ctx.user.role !== "admin" && pool.accessType !== "public") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const userRows = await db.select({
        id: usersT.id, name: usersT.name, avatarUrl: usersT.avatarUrl,
        createdAt: usersT.createdAt, whatsappLink: usersT.whatsappLink, telegramLink: usersT.telegramLink,
      }).from(usersT).where(eq(usersT.id, input.userId)).limit(1);
      if (!userRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      const user = userRows[0];
      const planRows = await db.select().from(userPlans).where(eq(userPlans.userId, input.userId)).limit(1);
      const plan = planRows[0] ?? null;
      const statsRows = await db.select().from(poolMemberStats)
        .where(and(eq(poolMemberStats.poolId, input.poolId), eq(poolMemberStats.userId, input.userId))).limit(1);
      const stats = statsRows[0] ?? null;
      const rankRows = await db.select({ userId: poolMemberStats.userId, totalPoints: poolMemberStats.totalPoints })
        .from(poolMemberStats).where(eq(poolMemberStats.poolId, input.poolId)).orderBy(desc(poolMemberStats.totalPoints));
      const rankPosition = rankRows.findIndex((r) => r.userId === input.userId) + 1;
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

  delete: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { pools: poolsT, poolMembers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [pool] = await db.select().from(poolsT).where(eq(poolsT.id, input.poolId)).limit(1);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
      const isAdmin = ctx.user.role === "admin";
      const isOwner = pool.ownerId === ctx.user.id;
      if (!isAdmin && !isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador ou um administrador pode excluir este bolão." });
      const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
      for (const member of members) {
        if (member.userId === ctx.user.id) continue;
        await createNotification({ userId: member.userId, type: "system", title: "Bolão excluído",
          message: `O bolão "${pool.name}" foi excluído pelo organizador. Todos os seus palpites foram removidos.` });
      }
      await db.update(poolsT).set({ status: "deleted" }).where(eq(poolsT.id, input.poolId));
      await createAdminLog(ctx.user.id, "delete_pool", "pool", input.poolId, { name: pool.name, memberCount: members.length });
      return { success: true };
    }),

  getAccessStats: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await (await import("../db")).getDb();
      if (!db) return { bySource: { code: 0, link: 0, public: 0, organizer: 0 }, total: 0 };
      const { poolMembers } = await import("../../drizzle/schema");
      const { eq, and, gte, sql: sqlFn } = await import("drizzle-orm");
      const rows = await db
        .select({
          source: poolMembers.joinSource,
          count: sqlFn<number>`COUNT(*)`.as("count"),
        })
        .from(poolMembers)
        .where(eq(poolMembers.poolId, input.poolId))
        .groupBy(poolMembers.joinSource);
      const bySource = { code: 0, link: 0, public: 0, organizer: 0 };
      for (const r of rows) {
        const src = (r.source ?? "public") as keyof typeof bySource;
        bySource[src] = Number(r.count);
      }
      const total = Object.values(bySource).reduce((a, b) => a + b, 0);
      const pool = await getPoolById(input.poolId);
      const isPro = pool?.plan === "pro";
      let daily: { date: string; count: number }[] = [];
      if (isPro) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const dailyRows = await db
          .select({
            day: sqlFn<string>`DATE(${poolMembers.joinedAt})`.as("day"),
            count: sqlFn<number>`COUNT(*)`.as("count"),
          })
          .from(poolMembers)
          .where(and(eq(poolMembers.poolId, input.poolId), gte(poolMembers.joinedAt, sevenDaysAgo)))
          .groupBy(sqlFn`DATE(${poolMembers.joinedAt})`);
        const dailyMap: Record<string, number> = {};
        for (const r of dailyRows) dailyMap[r.day as string] = Number(r.count);
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          daily.push({ date: key, count: dailyMap[key] ?? 0 });
        }
      }
      return { bySource, total, daily };
    }),

  regenerateAccessCode: protectedProcedure
    .input(z.object({ poolId: z.number(), type: z.enum(["code", "link"]) }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (input.type === "code") {
        const newCode = nanoid(8).toUpperCase();
        await updatePool(input.poolId, { inviteCode: newCode });
        return { inviteCode: newCode, inviteToken: null };
      } else {
        const newToken = nanoid(32);
        await updatePool(input.poolId, { inviteToken: newToken });
        return { inviteCode: null, inviteToken: newToken };
      }
    }),

  closePool: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode encerrar o bolão." });
      }
      const pool = await getPoolById(input.poolId);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
      if (pool.status === "finished") throw new TRPCError({ code: "BAD_REQUEST", message: "O bolão já está encerrado." });
      const ranking = await getPoolRanking(input.poolId);
      const top3 = ranking.slice(0, 3);
      await updatePool(input.poolId, { status: "finished" });
      const db = await (await import("../db")).getDb();
      if (db) {
        const { poolMembers } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
        for (const m of members) {
          const pos = ranking.findIndex((r) => r.user.id === m.userId);
          const medal = pos === 0 ? "🥇" : pos === 1 ? "🥈" : pos === 2 ? "🥉" : "";
          await createNotification({
            userId: m.userId,
            type: "result_available",
            title: `${medal} ${pool.name} foi encerrado!`,
            message: pos >= 0 ? `Você terminou em ${pos + 1}º lugar com ${ranking[pos].stats.totalPoints} pontos.` : `O bolão "${pool.name}" foi encerrado pelo organizador.`,
            actionUrl: `/pool/${pool.slug}`,
            actionLabel: "Ver resultado final",
            priority: "high",
          });
        }
      }
      await createAdminLog(ctx.user.id, "close_pool", "pool", input.poolId, { name: pool.name, top3: top3.map((r) => ({ name: r.user.name, points: r.stats.totalPoints })) });
      return { success: true, top3 };
    }),

  broadcastToMembers: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode enviar mensagens." });
      }
      const pool = await getPoolById(input.poolId);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
      if (pool.plan !== "pro" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Comunicação com membros é exclusiva do Plano Pro." });
      }
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { poolMembers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
      let sent = 0;
      for (const m of members) {
        if (m.userId === ctx.user.id) continue;
        await createNotification({
          userId: m.userId,
          type: "system",
          title: `📢 ${input.title}`,
          message: input.message,
          actionUrl: `/pool/${pool.slug}`,
          actionLabel: "Ver bolão",
          priority: "normal",
          category: "communication",
        });
        sent++;
      }
      await createAdminLog(ctx.user.id, "pool_broadcast", "pool", input.poolId, { title: input.title, sent });
      return { sent };
    }),

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
      const knownKeys = new Set(phases.map((p) => p.key));
      const orphanGames = games.filter((g) => !knownKeys.has(g.phase ?? ""));
      if (orphanGames.length > 0) {
        result.unshift({ phase: { id: 0, tournamentId: pool.tournamentId, key: "group_stage", label: "Fase de Grupos", enabled: true, order: 0, slots: null, isKnockout: false, updatedAt: new Date() }, games: orphanGames });
      }
      return result;
    }),
});
