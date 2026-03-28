/**
 * Plakr! — Sub-router: Bolões (Membros)
 * Procedures: getMembers, removeMember, transferOwnership, leave,
 *             getMemberProfile, getAccessStats, regenerateAccessCode
 */
import { z } from "zod";
import {
  anonymizeUser,
  createAdminLog,
  createNotification,
  getOldestMember,
  getPoolById,
  getPoolMember,
  getPoolMembers,
  getPoolsByUser,
  getPoolScoringRules,
  getUserById,
  removePoolMember,
  updatePool,
  updatePoolMemberRole,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr, UserErr } from "../errors";
import { nanoid } from "nanoid";

export const poolsMembersRouter = router({
  // ── [T3] getMembers com paginação manual ───────────────────────────────────
  getMembers: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      limit: z.number().min(1).max(200).default(100),
      cursor: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw Err.forbidden();
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

  // ── Remover membro do bolão ────────────────────────────────────────────────
  removeMember: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      userId: z.number(),
      anonymize: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw Err.forbidden();
      }
      const targetMember = await getPoolMember(input.poolId, input.userId);
      if (!targetMember) throw PoolErr.memberNotFound();
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
      // [LOG E5] Membro removido pelo organizador ou admin
      await createAdminLog(ctx.user.id, "pool_member_kicked", "pool", input.poolId, {
        removedUserId: input.userId,
        anonymized: input.anonymize && ctx.user.role === "admin",
      }, input.poolId, { level: "info" });
      return { success: true };
    }),

  // ── Transferir propriedade do bolão ───────────────────────────────────────
  transferOwnership: protectedProcedure
    .input(z.object({ poolId: z.number(), newOwnerId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || member.role !== "organizer") throw Err.forbidden();
      // [S-TRANSFER] Impedir transferência para usuário bloqueado
      const newOwner = await getUserById(input.newOwnerId);
      if (!newOwner) throw UserErr.notFound();
      if (newOwner.isBlocked) throw Err.forbidden("Não é possível transferir o bolão para um usuário banido.");
      await updatePoolMemberRole(input.poolId, ctx.user.id, "participant");
      await updatePoolMemberRole(input.poolId, input.newOwnerId, "organizer");
      await updatePool(input.poolId, { ownerId: input.newOwnerId });
      // [LOG S3] Transferência de propriedade do bolão
      await createAdminLog(ctx.user.id, "pool_ownership_transferred", "pool", input.poolId, {
        previousOwnerId: ctx.user.id,
        newOwnerId: input.newOwnerId,
        newOwnerName: newOwner.name,
      }, input.poolId, { level: "info" });
      return { success: true };
    }),

  // ── [LOG E4] Usuário sai voluntariamente de um bolão ──────────────────────
  leave: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member) throw Err.notFound("Membro");
      if (member.role === "organizer") {
        throw Err.forbidden("O organizador não pode sair do bolão. Transfira a propriedade primeiro.");
      }
      const pool = await getPoolById(input.poolId);
      await removePoolMember(input.poolId, ctx.user.id);
      // [LOG E4] Usuário saiu voluntariamente
      await createAdminLog(ctx.user.id, "pool_left", "pool", input.poolId, {
        poolName: pool?.name ?? null,
      }, input.poolId, { level: "info" });
      return { success: true };
    }),

  // ── Perfil detalhado de um membro no bolão ────────────────────────────────
  getMemberProfile: protectedProcedure
    .input(z.object({ poolId: z.number(), userId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verificar autorização ANTES de usar o banco (para testes de isolamento)
      const requester = await getPoolMember(input.poolId, ctx.user.id);
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (!requester && ctx.user.role !== "admin" && pool.accessType !== "public") {
        throw Err.forbidden();
      }
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { eq, desc, and } = await import("drizzle-orm");
      const { users: usersT, poolMemberStats, bets: betsT, games: gamesT, userPlans, badges: badgesT, userBadges } = await import("../../drizzle/schema");
      const userRows = await db.select({
        id: usersT.id, name: usersT.name, avatarUrl: usersT.avatarUrl,
        createdAt: usersT.createdAt, whatsappLink: usersT.whatsappLink, telegramLink: usersT.telegramLink,
      }).from(usersT).where(eq(usersT.id, input.userId)).limit(1);
      if (!userRows.length) throw UserErr.notFound();
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

  // ── Estatísticas de acesso ao bolão ───────────────────────────────────────
  getAccessStats: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw Err.forbidden();
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
      const { getUserPlanTier } = await import("../db");
      const ownerTier = pool ? await getUserPlanTier(pool.ownerId) : "free";
      const isPro = ownerTier !== "free";
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

  // ── Regenerar código de acesso do bolão ───────────────────────────────────
  regenerateAccessCode: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw Err.forbidden();
      }
      const newToken = nanoid(32);
      await updatePool(input.poolId, { inviteToken: newToken });
      return { inviteToken: newToken };
    }),
});
