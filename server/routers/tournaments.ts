/**
 * Plakr! — Router de Torneios/Campeonatos
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  calculateBetScore,
  calculateZebraContext,
  type ScoringRules,
} from "../scoring";
import {
  createAdminLog,
  createGame,
  createNotification,
  createTeam,
  createTournament,
  getBetsByGameAllPools,
  getGameById,
  getGamesByTournament,
  getGlobalTournaments,
  getPlatformSettings,
  getPoolById,
  getPoolMember,
  getPoolScoringRules,
  getTournamentById,
  getTournamentPhases,
  getTeamsByTournament,
  recalculateMemberStats,
  updateBetScore,
  updateGameResult,
  updateTournament,
} from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

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
export const tournamentsRouter = router({
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

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(3),
      slug: z.string().min(3),
      isGlobal: z.boolean().default(false),
      logoUrl: z.string().optional(),
      country: z.string().optional(),
      season: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      format: z.enum(["league", "cup", "groups_knockout", "custom"]).optional(),
      poolId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        if (!input.poolId) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o bolão ao qual o campeonato pertence." });
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador do bolão pode criar campeonatos personalizados." });
        const pool = await getPoolById(input.poolId);
        if (!pool || pool.plan !== "pro") throw new TRPCError({ code: "FORBIDDEN", message: "Campeonatos personalizados são exclusivos do Plano Pro." });
      }
      const id = await createTournament({ ...input, createdBy: ctx.user.id });
      if (ctx.user.role === "admin") await createAdminLog(ctx.user.id, "create_tournament", "tournament", id);
      return { id };
    }),

  importGames: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      csvData: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const lines = input.csvData.trim().split("\n").slice(1);
      let imported = 0;
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 4) continue;
        const [teamAName, teamBName, matchDateStr, , phase, venue] = parts;
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

  addGame: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      teamAName: z.string(),
      teamBName: z.string(),
      matchDate: z.number(),
      venue: z.string().optional(),
      groupName: z.string().optional(),
      matchNumber: z.number().optional(),
      poolId: z.number().optional(),
      phase: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        if (!input.poolId) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o bolão ao qual o jogo pertence." });
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador do bolão pode adicionar jogos." });
        const pool = await getPoolById(input.poolId);
        if (!pool || pool.plan !== "pro") throw new TRPCError({ code: "FORBIDDEN", message: "Adição de jogos é exclusiva do Plano Pro." });
      }
      const { poolId: _poolId, ...gameData } = input;
      const id = await createGame({
        ...gameData,
        matchDate: new Date(input.matchDate),
      });
      if (ctx.user.role === "admin") await createAdminLog(ctx.user.id, "add_game", "game", id, { tournamentId: input.tournamentId });
      return { id };
    }),

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
      const allBets = await getBetsByGameAllPools(input.gameId);
      const affectedPoolsSet = new Set(allBets.map((b) => b.poolId));
      const affectedPools = Array.from(affectedPoolsSet);
      const defaultSettings = await getPlatformSettings();
      for (const poolId of affectedPools) {
        const rulesRow = await getPoolScoringRules(poolId);
        const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);
        const poolBets = allBets.filter((b) => b.poolId === poolId);
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
          await recalculateMemberStats(poolId, userId);
          import("../badges").then(({ calculateAndAssignBadges }) =>
            calculateAndAssignBadges(userId).catch((e: unknown) =>
              console.error("[Badges] Erro ao calcular badges:", e)
            )
          );
        }
      }
      return { success: true, affectedBets: allBets.length };
    }),

  addTeam: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      name: z.string(),
      code: z.string().optional(),
      flagUrl: z.string().optional(),
      groupName: z.string().optional(),
      poolId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        if (!input.poolId) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o bolão ao qual o time pertence." });
        const member = await getPoolMember(input.poolId, ctx.user.id);
        if (!member || member.role !== "organizer") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador do bolão pode adicionar times." });
        const pool = await getPoolById(input.poolId);
        if (!pool || pool.plan !== "pro") throw new TRPCError({ code: "FORBIDDEN", message: "Adição de times é exclusiva do Plano Pro." });
      }
      const { poolId: _poolId, ...teamData } = input;
      const id = await createTeam(teamData);
      return { id };
    }),

  recalculatePool: adminProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { pools: poolsT, poolMembers } = await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");
      const pools = await db.select({ id: poolsT.id }).from(poolsT)
        .where(and(eq(poolsT.tournamentId, input.tournamentId), sql`${poolsT.status} != 'deleted'`));
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const {
        tournaments, pools: poolsT, poolMembers, games: gamesT, teams: teamsT,
        tournamentPhases, sheetsSyncLog, bets, poolMemberStats, poolScoringRules,
        notifications: notificationsT, adminLogs
      } = await import("../../drizzle/schema");
      const { eq, inArray } = await import("drizzle-orm");
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, input.id)).limit(1);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Campeonato não encontrado." });
      const isAdmin = ctx.user.role === "admin";
      const isCreator = tournament.createdBy === ctx.user.id;
      if (!isAdmin && !isCreator) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o criador ou um administrador pode excluir este campeonato." });
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
        await db.delete(bets).where(inArray(bets.poolId, poolIds));
        await db.delete(poolMemberStats).where(inArray(poolMemberStats.poolId, poolIds));
        await db.delete(poolScoringRules).where(inArray(poolScoringRules.poolId, poolIds));
        await db.delete(poolMembers).where(inArray(poolMembers.poolId, poolIds));
        await db.update(notificationsT).set({ poolId: null }).where(inArray(notificationsT.poolId as any, poolIds));
        await db.update(adminLogs).set({ entityId: null } as any).where(inArray(adminLogs.poolId as any, poolIds));
        await db.delete(poolsT).where(inArray(poolsT.id, poolIds));
      }
      await db.delete(sheetsSyncLog).where(eq(sheetsSyncLog.tournamentId, input.id));
      await db.delete(gamesT).where(eq(gamesT.tournamentId, input.id));
      await db.delete(teamsT).where(eq(teamsT.tournamentId, input.id));
      await db.delete(tournamentPhases).where(eq(tournamentPhases.tournamentId, input.id));
      await db.delete(tournaments).where(eq(tournaments.id, input.id));
      await createAdminLog(ctx.user.id, "delete_tournament", "tournament", input.id, { name: tournament.name, linkedPools: linkedPools.length });
      return { success: true };
    }),

  deleteGame: adminProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { games: gamesT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [game] = await db.select().from(gamesT).where(eq(gamesT.id, input.gameId)).limit(1);
      if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "Jogo não encontrado." });
      await db.delete(gamesT).where(eq(gamesT.id, input.gameId));
      await createAdminLog(ctx.user.id, "delete_game", "game", input.gameId, { teamAName: game.teamAName, teamBName: game.teamBName });
      return { success: true };
    }),

  deleteTeam: adminProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { teams: teamsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [team] = await db.select().from(teamsT).where(eq(teamsT.id, input.teamId)).limit(1);
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Time não encontrado." });
      await db.delete(teamsT).where(eq(teamsT.id, input.teamId));
      await createAdminLog(ctx.user.id, "delete_team", "team", input.teamId, { name: team.name });
      return { success: true };
    }),

  importFromSheets: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      sheetsUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
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
      const lines = csvData.trim().split("\n").slice(1);
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
      const db = await (await import("../db")).getDb();
      const { tournamentPhases } = await import("../../drizzle/schema");
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
      const db = await (await import("../db")).getDb();
      const { tournamentPhases } = await import("../../drizzle/schema");
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

  deletePhase: adminProcedure
    .input(z.object({ phaseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      const { tournamentPhases } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(tournamentPhases).where(eq(tournamentPhases.id, input.phaseId));
      await createAdminLog(ctx.user.id, "delete_phase", "tournament_phase", input.phaseId, {});
      return { ok: true };
    }),

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
      const db = await (await import("../db")).getDb();
      const { games } = await import("../../drizzle/schema");
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
      const db = await (await import("../db")).getDb();
      const { games } = await import("../../drizzle/schema");
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

  generateNextPhase: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      currentPhase: z.string(),
      nextPhase: z.string(),
      nextPhaseLabel: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      const { games } = await import("../../drizzle/schema");
      const { eq, and, isNotNull } = await import("drizzle-orm");
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const finishedGames = await db.select().from(games)
        .where(and(eq(games.tournamentId, input.tournamentId), eq(games.phase, input.currentPhase), isNotNull(games.scoreA)));
      const teamSet = new Set<string>();
      for (const g of finishedGames) {
        if (g.scoreA !== null && g.scoreB !== null) {
          if (g.scoreA > g.scoreB && g.teamAName) teamSet.add(g.teamAName);
          else if (g.scoreB > g.scoreA && g.teamBName) teamSet.add(g.teamBName);
        }
      }
      const qualifiedTeams = Array.from(teamSet);
      let created = 0;
      for (let i = 0; i < Math.floor(qualifiedTeams.length / 2); i++) {
        await createGame({
          tournamentId: input.tournamentId,
          teamAName: qualifiedTeams[i * 2] ?? "A Definir",
          teamBName: qualifiedTeams[i * 2 + 1] ?? "A Definir",
          matchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          phase: input.nextPhaseLabel,
        });
        created++;
      }
      await createAdminLog(ctx.user.id, "generate_next_phase", "tournament", input.tournamentId, { currentPhase: input.currentPhase, nextPhase: input.nextPhase, created });
      return { created, qualifiedTeams };
    }),
});
