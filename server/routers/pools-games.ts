/**
 * Plakr! — Sub-router: Bolões (Jogos & Pontuação)
 * Procedures: getGames, setGameResult, updateScoringRules, getScoringRulesPublic
 */
import { z } from "zod";
import {
  calculateBetScore,
  calculateZebraContext,
  type ScoringRules,
} from "../scoring";

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
import {
  createAdminLog,
  createNotification,
  getBetsByGameAllPools,
  getGameById,
  getGamesByPool,
  getPoolById,
  getPoolMember,
  getPoolMembers,
  getPoolScoringRules,
  getPlatformSettings,
  recalculateMemberStats,
  updateBetScore,
  updateGameResult,
  upsertPoolScoringRules,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr } from "../errors";

export const poolsGamesRouter = router({
  getGames: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw Err.forbidden();
      // [SEC] Bloquear acesso de membros com pagamento pendente ou rejeitado
      if (member && member.memberStatus && member.memberStatus !== "active" && ctx.user.role !== "admin") throw Err.forbidden();
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
        throw PoolErr.organizerOnly();
      }
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      const { getUserPlanTier } = await import("../db");
      const ownerTier = await getUserPlanTier(pool.ownerId);
      if (ownerTier === "free" && ctx.user.role !== "admin") {
        throw PoolErr.proOnly("Registro de resultados pelo organizador");
      }
      const game = await getGameById(input.gameId);
      if (!game || game.tournamentId !== pool.tournamentId) {
        throw PoolErr.gameNotFound();
      }
      await updateGameResult(input.gameId, input.scoreA, input.scoreB, false);
      await createAdminLog(ctx.user.id, "set_result", "game", input.gameId, {
        poolId: input.poolId,
        scoreA: input.scoreA,
        scoreB: input.scoreB,
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
          bet.predictedScoreA,
          bet.predictedScoreB,
          input.scoreA,
          input.scoreB,
          effectiveRules,
          zebraCtx,
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
      const isAdmin = ctx.user.role === "admin";
      const member = await getPoolMember(poolId, ctx.user.id);
      if (!isAdmin && (!member || member.role !== "organizer")) {
        throw Err.forbidden();
      }
      const pool = await getPoolById(poolId);
      if (!pool) throw Err.notFound("Recurso");
      const { getUserPlanTier } = await import("../db");
      const ownerTier = await getUserPlanTier(pool.ownerId);
      if (ownerTier === "free" && !isAdmin) {
        throw PoolErr.proOnly("Regras de pontuação customizadas");
      }
      await upsertPoolScoringRules(poolId, data, ctx.user.id);
      return { success: true };
    }),

  getScoringRulesPublic: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (!member && ctx.user.role !== "admin" && pool.accessType !== "public") {
        throw Err.forbidden();
      }
      return getPoolScoringRules(input.poolId);
    }),

  getBetAnalysis: protectedProcedure
    .input(z.object({ gameId: z.number(), poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { gameBetAnalyses } = await import("../../drizzle/schema");
      const { and, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select({ analysisText: gameBetAnalyses.analysisText })
        .from(gameBetAnalyses)
        .where(
          and(
            eq(gameBetAnalyses.gameId, input.gameId),
            eq(gameBetAnalyses.poolId, input.poolId),
            eq(gameBetAnalyses.userId, ctx.user.id)
          )
        )
        .limit(1);
      return row?.analysisText ?? null;
    }),
});
