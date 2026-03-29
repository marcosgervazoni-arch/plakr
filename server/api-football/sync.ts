/**
 * API-Football Sync — Cron Jobs de Sincronização
 * ─────────────────────────────────────────────────────────────────────────────
 * Dois jobs independentes controlados pelo Super Admin:
 *
 *  1. syncFixtures()  — Cron 2x/dia (06:00 e 18:00 UTC)
 *     Busca jogos agendados dos próximos 14 dias e cria/atualiza na tabela games.
 *     Consome ~1 requisição por execução.
 *
 *  2. syncResults()   — Cron a cada 2h (apenas nos dias com jogos)
 *     Busca jogos com status FT (Full Time) e aplica o resultado final.
 *     Dispara o motor de pontuação para todos os bolões afetados.
 *     Consome ~1 requisição por execução.
 *
 * REGRA: O placar só é aplicado quando o jogo está com status FT (encerrado).
 * Nunca atualizamos com placares parciais ou ao vivo.
 */

import logger from "../logger";
import { fetchFixtures, fetchTeams, ApiFootballFixture } from "./client";
import { getDb } from "../db";
import {
  platformSettings,
  games,
  teams,
  tournaments,
  apiSyncLog,
} from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  getBetsByGameAllPools,
  getPlatformSettings,
  getPoolScoringRules,
  recalculateMemberStats,
  updateBetScore,
  updateGameResult,
} from "../db";
import {
  calculateBetScore,
  calculateZebraContext,
} from "../scoring";

// ─── Constantes ───────────────────────────────────────────────────────────────

// Status da API-Football que indicam jogo encerrado (resultado final disponível)
const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];
// Status que indicam jogo agendado (ainda não iniciado)
const SCHEDULED_STATUSES = ["NS", "TBD"];

// ─── Helper: encontrar o torneio vinculado à liga ─────────────────────────────

async function findTournamentForLeague(
  leagueId: number,
  season: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  // Busca torneio com apiFootballLeagueId e apiFootballSeason correspondentes
  const [tournament] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(
      and(
        eq(tournaments.apiFootballLeagueId, leagueId),
        eq(tournaments.apiFootballSeason, season)
      )
    )
    .limit(1);

  return tournament?.id ?? null;
}
// ─── Helper: listar todos os torneios vinculados à API-Football ────────────────────

async function getAllLinkedTournaments(): Promise<Array<{ id: number; leagueId: number; season: number; name: string; phaseKey: string | null }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: tournaments.id,
      leagueId: tournaments.apiFootballLeagueId,
      season: tournaments.apiFootballSeason,
      name: tournaments.name,
      phaseKey: tournaments.apiFootballPhaseKey,
    })
    .from(tournaments)
    .where(
      and(
        sql`${tournaments.apiFootballLeagueId} IS NOT NULL`,
        sql`${tournaments.apiFootballSeason} IS NOT NULL`
      )
    );

  return rows.filter(
    (r): r is { id: number; leagueId: number; season: number; name: string; phaseKey: string | null } =>
      r.leagueId !== null && r.season !== null
  );
}

// ─── Helper: converter round da API para phase key ────────────────────────────────────

/**
 * Converte o campo league.round da API-Football em uma chave de fase.
 *
 * Preserva fases distintas como "1st Phase" e "2nd Phase" em vez de
 * colapsar tudo em "group_stage", evitando sobreposição de rodadas com
 * mesmo número em fases diferentes.
 *
 * Exemplos:
 *  - "1st Phase - 1"       → "1st_phase"
 *  - "2nd Phase - 14"      → "2nd_phase"
 *  - "Regular Season - 5"  → "regular_season"
 *  - "Apertura - 3"        → "apertura"
 *  - "Clausura - 7"        → "clausura"
 *  - "Group Stage - 2"     → "group_stage"
 *  - "Round of 16"         → "round_of_16"
 *  - "Quarter-finals"      → "quarter_finals"
 *  - "Semi-finals"         → "semi_finals"
 *  - "Final"               → "final"
 */
function roundToPhaseKey(round: string): string {
  const r = round.toLowerCase().trim();

  // Fases eliminatórias (prioridade máxima)
  if (r.includes("round of 16") || r.includes("last 16")) return "round_of_16";
  if (r.includes("quarter")) return "quarter_finals";
  if (r.includes("semi")) return "semi_finals";
  if (r.includes("3rd place") || r.includes("third place")) return "third_place";
  // "final" deve vir após "semi" e "quarter" para não capturar "semi-finals"
  if (/^final$/.test(r) || r === "1st phase - final" || r === "2nd phase - final") return "final";

  // Fases numeradas com nome específico — preservar para evitar sobreposição de rodadas
  if (r.startsWith("1st phase")) return "1st_phase";
  if (r.startsWith("2nd phase")) return "2nd_phase";
  if (r.startsWith("3rd phase")) return "3rd_phase";
  if (r.startsWith("apertura")) return "apertura";
  if (r.startsWith("clausura")) return "clausura";
  if (r.startsWith("regular season")) return "regular_season";
  if (r.startsWith("group")) return "group_stage";

  // Fallback genérico
  return "group_stage";
}

// ─── Helper: extrair número da rodada ────────────────────────────────────────────

/**
 * Extrai o número da rodada de uma string da API-Football.
 *
 * Formatos suportados:
 *  - "Regular Season - 14"   → 14
 *  - "1st Phase - 7"         → 7
 *  - "2nd Phase - 27"        → 27
 *  - "Apertura - 3"          → 3
 *  - "Clausura - 15"         → 15
 *  - "Group Stage - 2"       → 2
 *  - "Round 5"               → 5
 *  - "Semi-finals"           → null
 *  - "Final"                 → null
 *
 * Estratégia: extrai o último número após o último hífen ou espaço,
 * ignorando ordinais como "1st", "2nd", "3rd".
 */
function extractRoundNumber(round: string): number | null {
  // Tenta extrair número após o último hífen: "1st Phase - 14" → 14
  const afterDash = round.match(/-\s*(\d+)\s*$/);
  if (afterDash) return parseInt(afterDash[1]);

  // Tenta extrair número após "Round ": "Round 5" → 5
  const afterRound = round.match(/round\s+(\d+)/i);
  if (afterRound) return parseInt(afterRound[1]);

  // Tenta extrair o último número isolado na string (não ordinal)
  // Ignora números seguidos de "st", "nd", "rd", "th" (ordinais)
  const allNumbers = [...round.matchAll(/(\d+)(?!\s*(?:st|nd|rd|th))/gi)];
  if (allNumbers.length > 0) {
    const last = allNumbers[allNumbers.length - 1];
    return parseInt(last[1]);
  }

  return null;
}

// ─── Helper: registrar log de sincronização ────────────────────────────────────────────
async function logSync(data: {
  syncType: "fixtures" | "results" | "manual";
  status: "success" | "error" | "partial" | "skipped";
  leagueId: number;
  season: number;
  requestsUsed: number;
  gamesCreated: number;
  gamesUpdated: number;
  resultsApplied: number;
  errorMessage?: string;
  circuitBreakerTripped?: boolean;
  triggeredBy?: "cron" | "manual";
  triggeredByUserId?: number;
  durationMs: number;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(apiSyncLog).values({
      syncType: data.syncType,
      status: data.status,
      leagueId: data.leagueId,
      season: data.season,
      requestsUsed: data.requestsUsed,
      gamesCreated: data.gamesCreated,
      gamesUpdated: data.gamesUpdated,
      resultsApplied: data.resultsApplied,
      errorMessage: data.errorMessage ?? null,
      circuitBreakerTripped: data.circuitBreakerTripped ?? false,
      triggeredBy: data.triggeredBy ?? "cron",
      triggeredByUserId: data.triggeredByUserId ?? null,
      durationMs: data.durationMs,
    });
  } catch (e) {
    logger.error({ err: e }, "[ApiFootball] Failed to write sync log");
  }
}

// ─── Helper: construir buildEffectiveRules localmente ────────────────────────

function buildEffectiveRules(
  rulesRow: any,
  defaultSettings: any
): any {
  return {
    pointsExactScore: rulesRow?.pointsExactScore ?? defaultSettings?.defaultScoringExact ?? 10,
    pointsCorrectResult: rulesRow?.pointsCorrectResult ?? defaultSettings?.defaultScoringCorrect ?? 5,
    pointsBonusGoals: rulesRow?.pointsBonusGoals ?? defaultSettings?.defaultScoringBonusGoals ?? 3,
    pointsBonusDiff: rulesRow?.pointsBonusDiff ?? defaultSettings?.defaultScoringBonusDiff ?? 3,
    pointsBonusUpset: rulesRow?.pointsBonusUpset ?? defaultSettings?.defaultScoringBonusUpset ?? 1,
    pointsBonusOneTeam: rulesRow?.pointsBonusOneTeam ?? defaultSettings?.defaultScoringBonusOneTeam ?? 2,
    pointsBonusLandslide: rulesRow?.pointsBonusLandslide ?? defaultSettings?.defaultScoringBonusLandslide ?? 5,
    landslideMinDiff: rulesRow?.landslideMinDiff ?? defaultSettings?.defaultLandslideMinDiff ?? 4,
    zebraThreshold: rulesRow?.zebraThreshold ?? defaultSettings?.defaultZebraThreshold ?? 75,
    enableBonusGoals: rulesRow?.enableBonusGoals ?? true,
    enableBonusDiff: rulesRow?.enableBonusDiff ?? true,
    enableBonusUpset: rulesRow?.enableBonusUpset ?? true,
    enableBonusOneTeam: rulesRow?.enableBonusOneTeam ?? true,
    enableBonusLandslide: rulesRow?.enableBonusLandslide ?? true,
  };
}

// ─── Sincronizar Times de um Torneio Específico ─────────────────────────────

/**
 * Importa os times de uma liga/temporada para um torneio específico.
 * Evita duplicatas usando apiFootballTeamId.
 * Consome 1 requisição.
 */
export async function syncTeamsForTournament(options: {
  tournamentId: number;
  leagueId: number;
  season: number;
  triggeredByUserId?: number;
}): Promise<{ teamsCreated: number; teamsUpdated: number; requestsUsed: number; error?: string }> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) return { teamsCreated: 0, teamsUpdated: 0, requestsUsed: 0, error: "DB unavailable" };

  let teamsCreated = 0;
  let teamsUpdated = 0;
  let requestsUsed = 0;
  let errorMessage: string | undefined;

  try {
    const apiTeams = await fetchTeams(options.leagueId, options.season);
    requestsUsed = 1;

    for (const apiTeam of apiTeams) {
      const apiTeamId = apiTeam.team.id;

      // Verificar se o time já existe para esse torneio pelo apiFootballTeamId
      const [existing] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.tournamentId, options.tournamentId),
            eq(teams.apiFootballTeamId, apiTeamId)
          )
        )
        .limit(1);

      if (existing) {
        // Atualizar nome e logo caso tenham mudado
        await db
          .update(teams)
          .set({
            name: apiTeam.team.name,
            code: apiTeam.team.code?.slice(0, 10) ?? null,
            flagUrl: apiTeam.team.logo,
          })
          .where(eq(teams.id, existing.id));
        teamsUpdated++;
      } else {
        // Criar novo time
        await db.insert(teams).values({
          tournamentId: options.tournamentId,
          name: apiTeam.team.name,
          code: apiTeam.team.code?.slice(0, 10) ?? null,
          flagUrl: apiTeam.team.logo,
          apiFootballTeamId: apiTeamId,
        });
        teamsCreated++;
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ errorMessage }, "[ApiFootball] syncTeamsForTournament error");
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ApiFootball] syncTeamsForTournament done: created=${teamsCreated} updated=${teamsUpdated} req=${requestsUsed} duration=${durationMs}ms`
  );
  return { teamsCreated, teamsUpdated, requestsUsed, error: errorMessage };
}

// ─── Sincronizar Fixtures de um Torneio Específico ───────────────────────────

/**
 * Importa todos os fixtures (jogos) de uma liga/temporada para um torneio específico.
 * Usado na importação inicial e no re-sync manual por campeonato.
 * Consome 1 requisição.
 */
export async function syncFixturesForTournament(options: {
  tournamentId: number;
  leagueId: number;
  season: number;
  triggeredBy?: "cron" | "manual";
  triggeredByUserId?: number;
  phaseRounds?: string[]; // Se fornecido, importa apenas os rounds desta lista
}): Promise<{ gamesCreated: number; gamesUpdated: number; requestsUsed: number; error?: string }> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) return { gamesCreated: 0, gamesUpdated: 0, requestsUsed: 0, error: "DB unavailable" };

  let gamesCreated = 0;
  let gamesUpdated = 0;
  let requestsUsed = 0;
  let errorMessage: string | undefined;
  let syncStatus: "success" | "error" | "partial" | "skipped" = "success";

  try {
    // Buscar TODOS os jogos da temporada (sem filtro de data)
    const allFixtures = await fetchFixtures(options.leagueId, options.season);
    requestsUsed = 1;

    // Filtrar por rounds específicos da fase, se fornecido
    const fixtures = options.phaseRounds && options.phaseRounds.length > 0
      ? allFixtures.filter(f => options.phaseRounds!.includes(f.league.round))
      : allFixtures;

    for (const fixture of fixtures) {
      const externalId = String(fixture.fixture.id);
      const matchDate = new Date(fixture.fixture.date);
      const phase = roundToPhaseKey(fixture.league.round);
      const roundNumber = extractRoundNumber(fixture.league.round);

      // Verificar se o jogo já existe pelo externalId
      const [existing] = await db
        .select({ id: games.id })
        .from(games)
        .where(and(eq(games.externalId, externalId), eq(games.tournamentId, options.tournamentId)))
        .limit(1);

      if (existing) {
        await db
          .update(games)
          .set({
            matchDate,
            venue: fixture.fixture.venue?.name ?? null,
            phase,
            roundNumber,
            teamAName: fixture.teams.home.name,
            teamBName: fixture.teams.away.name,
            teamAFlag: fixture.teams.home.logo,
            teamBFlag: fixture.teams.away.logo,
          })
          .where(eq(games.id, existing.id));
        gamesUpdated++;
      } else {
        // Determinar status do jogo
        const fixtureStatus = fixture.fixture.status.short;
        const isFinished = FINISHED_STATUSES.includes(fixtureStatus);
        const gameStatus = isFinished ? "finished" : "scheduled";

        await db.insert(games).values({
          tournamentId: options.tournamentId,
          externalId,
          teamAName: fixture.teams.home.name,
          teamBName: fixture.teams.away.name,
          teamAFlag: fixture.teams.home.logo,
          teamBFlag: fixture.teams.away.logo,
          matchDate,
          venue: fixture.fixture.venue?.name ?? null,
          phase,
          roundNumber,
          status: gameStatus,
          scoreA: isFinished ? (fixture.score.fulltime.home ?? undefined) : undefined,
          scoreB: isFinished ? (fixture.score.fulltime.away ?? undefined) : undefined,
        });
        gamesCreated++;
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    syncStatus = "error";
    logger.error({ errorMessage }, "[ApiFootball] syncFixturesForTournament error");
  }

  const durationMs = Date.now() - startTime;
  await logSync({
    syncType: "manual",
    status: syncStatus,
    leagueId: options.leagueId,
    season: options.season,
    requestsUsed,
    gamesCreated,
    gamesUpdated,
    resultsApplied: 0,
    errorMessage,
    triggeredBy: options.triggeredBy ?? "manual",
    triggeredByUserId: options.triggeredByUserId,
    durationMs,
  });

  logger.info(
    `[ApiFootball] syncFixturesForTournament done: created=${gamesCreated} updated=${gamesUpdated} req=${requestsUsed} duration=${durationMs}ms`
  );
  return { gamesCreated, gamesUpdated, requestsUsed, error: errorMessage };
}

// ─── JOB 1: Sincronizar Fixtures (jogos agendados) ───────────────────────────

export async function syncFixtures(options: {
  triggeredBy?: "cron" | "manual";
  triggeredByUserId?: number;
} = {}): Promise<{
  gamesCreated: number;
  gamesUpdated: number;
  requestsUsed: number;
  error?: string;
}> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) return { gamesCreated: 0, gamesUpdated: 0, requestsUsed: 0, error: "DB unavailable" };

  const settings = await getPlatformSettings();
  if (!settings?.apiFootballEnabled || !settings?.apiFootballSyncFixtures) {
    logger.info("[ApiFootball] syncFixtures: integration disabled or fixtures sync disabled");
    return { gamesCreated: 0, gamesUpdated: 0, requestsUsed: 0 };
  }

  // Iterar sobre TODOS os torneios vinculados à API-Football
  const linkedTournaments = await getAllLinkedTournaments();
  if (linkedTournaments.length === 0) {
    logger.info("[ApiFootball] syncFixtures: no linked tournaments found");
    return { gamesCreated: 0, gamesUpdated: 0, requestsUsed: 0 };
  }

  let gamesCreated = 0;
  let gamesUpdated = 0;
  let requestsUsed = 0;
  let errorMessage: string | undefined;
  let syncStatus: "success" | "error" | "partial" | "skipped" = "success";

  // Buscar jogos dos próximos 14 dias
  const today = new Date();
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fromStr = today.toISOString().slice(0, 10);
  const toStr = in14Days.toISOString().slice(0, 10);

  for (const linked of linkedTournaments) {
    const { leagueId, season, id: tournamentId, name: tournamentName, phaseKey } = linked;
    try {
      const allFixtures = await fetchFixtures(leagueId, season, {
        status: SCHEDULED_STATUSES.join("-"),
        from: fromStr,
        to: toStr,
      });
      requestsUsed++;

      // Filtrar por fase se o torneio foi importado com uma fase específica
      const fixtures = phaseKey
        ? allFixtures.filter(f => roundToPhaseKey(f.league.round) === phaseKey)
        : allFixtures;

      for (const fixture of fixtures) {
        const externalId = String(fixture.fixture.id);
        const matchDate = new Date(fixture.fixture.date);
        const phase = roundToPhaseKey(fixture.league.round);
        const roundNumber = extractRoundNumber(fixture.league.round);

        const [existing] = await db
          .select({ id: games.id })
          .from(games)
          .where(and(eq(games.externalId, externalId), eq(games.tournamentId, tournamentId)))
          .limit(1);

        if (existing) {
          await db
            .update(games)
            .set({ matchDate, venue: fixture.fixture.venue?.name ?? null, phase, roundNumber })
            .where(eq(games.id, existing.id));
          gamesUpdated++;
        } else {
          await db.insert(games).values({
            tournamentId,
            externalId,
            teamAName: fixture.teams.home.name,
            teamBName: fixture.teams.away.name,
            teamAFlag: fixture.teams.home.logo,
            teamBFlag: fixture.teams.away.logo,
            matchDate,
            venue: fixture.fixture.venue?.name ?? null,
            phase,
            roundNumber,
            status: "scheduled",
          });
          gamesCreated++;
        }
      }
      logger.info(`[ApiFootball] syncFixtures[${tournamentName}]: created=${gamesCreated} updated=${gamesUpdated}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, `[ApiFootball] syncFixtures[${tournamentName}] error: ${msg}`);
      errorMessage = msg;
      syncStatus = "partial";
    }
  }

  if (syncStatus !== "partial") syncStatus = "success";

  const durationMs = Date.now() - startTime;
  const firstLinked = linkedTournaments[0];
  await logSync({
    syncType: options.triggeredBy === "manual" ? "manual" : "fixtures",
    status: syncStatus,
    leagueId: firstLinked.leagueId,
    season: firstLinked.season,
    requestsUsed,
    gamesCreated,
    gamesUpdated,
    resultsApplied: 0,
    errorMessage,
    triggeredBy: options.triggeredBy ?? "cron",
    triggeredByUserId: options.triggeredByUserId,
    durationMs,
  });

  logger.info(
    `[ApiFootball] syncFixtures done: created=${gamesCreated} updated=${gamesUpdated} req=${requestsUsed} duration=${durationMs}ms`
  );

  return { gamesCreated, gamesUpdated, requestsUsed, error: errorMessage };
}

// ─── JOB 2: Sincronizar Resultados Finais ────────────────────────────────────

// ─── Helper interno: aplicar resultado de um jogo e disparar pontuação ─────────

async function applyGameResult(
  existingGame: { id: number; status: string | null; scoreA: number | null },
  scoreA: number,
  scoreB: number,
  syncStatusRef: { value: "success" | "error" | "partial" | "skipped" }
): Promise<boolean> {
  // Pular se já tem resultado final
  if (existingGame.status === "finished" && existingGame.scoreA !== null) return false;

  // Aplicar resultado final (NUNCA parcial)
  await updateGameResult(existingGame.id, scoreA, scoreB, false);

  // Disparar motor de pontuação para todos os bolões com palpites neste jogo
  try {
    const allBets = await getBetsByGameAllPools(existingGame.id);
    const affectedPoolsSet = new Set(allBets.map((b) => b.poolId));
    const defaultSettings = await getPlatformSettings();

    for (const poolId of Array.from(affectedPoolsSet)) {
      const rulesRow = await getPoolScoringRules(poolId);
      const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);
      const poolBets = allBets.filter((b) => b.poolId === poolId);
      const zebraCtx = calculateZebraContext(poolBets, scoreA, scoreB);
      const affectedUsersSet = new Set<number>();

      for (const bet of poolBets) {
        const breakdown = calculateBetScore(
          bet.predictedScoreA,
          bet.predictedScoreB,
          scoreA,
          scoreB,
          effectiveRules,
          zebraCtx
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

      for (const userId of Array.from(affectedUsersSet)) {
        await recalculateMemberStats(poolId, userId);
        import("../badges")
          .then(({ calculateAndAssignBadges }) =>
            calculateAndAssignBadges(userId).catch((e: unknown) =>
              logger.error({ err: e }, "[Badges] Error calculating badges")
            )
          )
          .catch(() => {});
      }
    }
  } catch (scoringErr) {
    logger.error({ err: scoringErr, gameId: existingGame.id }, "[ApiFootball] Scoring error for game");
    syncStatusRef.value = "partial";
  }

  return true;
}

export async function syncResults(options: {
  triggeredBy?: "cron" | "manual";
  triggeredByUserId?: number;
} = {}): Promise<{
  resultsApplied: number;
  requestsUsed: number;
  error?: string;
}> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) return { resultsApplied: 0, requestsUsed: 0, error: "DB unavailable" };

  const settings = await getPlatformSettings();
  if (!settings?.apiFootballEnabled || !settings?.apiFootballSyncResults) {
    logger.info("[ApiFootball] syncResults: integration disabled or results sync disabled");
    return { resultsApplied: 0, requestsUsed: 0 };
  }

  // Iterar sobre TODOS os torneios vinculados à API-Football
  const linkedTournaments = await getAllLinkedTournaments();
  if (linkedTournaments.length === 0) {
    logger.info("[ApiFootball] syncResults: no linked tournaments found");
    return { resultsApplied: 0, requestsUsed: 0 };
  }

  let resultsApplied = 0;
  let requestsUsed = 0;
  let errorMessage: string | undefined;
  const syncStatusRef = { value: "success" as "success" | "error" | "partial" | "skipped" };

  // Janela de busca: jogos que já deveriam ter terminado (até 2h atrás) até hoje
  // Isso garante que jogos de ontem que não foram sincronizados também sejam capturados
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fromStr = yesterday.toISOString().slice(0, 10);
  const toStr = now.toISOString().slice(0, 10);

  for (const linked of linkedTournaments) {
    const { leagueId, season, id: tournamentId, name: tournamentName, phaseKey } = linked;
    try {
      // Buscar jogos encerrados nos últimos 2 dias (captura jogos de ontem não sincronizados)
      const allFixtures = await fetchFixtures(leagueId, season, {
        status: FINISHED_STATUSES.join("-"),
        from: fromStr,
        to: toStr,
      });
      requestsUsed++;

      // Filtrar por fase se o torneio foi importado com uma fase específica
      const fixtures = phaseKey
        ? allFixtures.filter(f => roundToPhaseKey(f.league.round) === phaseKey)
        : allFixtures;

      for (const fixture of fixtures) {
        const externalId = String(fixture.fixture.id);
        const scoreA = fixture.score.fulltime.home;
        const scoreB = fixture.score.fulltime.away;

        // Só processar se tiver resultado final válido
        if (scoreA === null || scoreB === null) continue;

        // Buscar o jogo no banco pelo externalId
        const [existingGame] = await db
          .select()
          .from(games)
          .where(and(eq(games.externalId, externalId), eq(games.tournamentId, tournamentId)))
          .limit(1);

        if (!existingGame) {
          // Jogo não existe ainda — criar e aplicar resultado
          await db.insert(games).values({
            tournamentId,
            externalId,
            teamAName: fixture.teams.home.name,
            teamBName: fixture.teams.away.name,
            teamAFlag: fixture.teams.home.logo,
            teamBFlag: fixture.teams.away.logo,
            matchDate: new Date(fixture.fixture.date),
            venue: fixture.fixture.venue?.name ?? null,
            phase: roundToPhaseKey(fixture.league.round),
            roundNumber: extractRoundNumber(fixture.league.round),
            status: "finished",
            scoreA,
            scoreB,
          });
          resultsApplied++;
          continue;
        }

        const applied = await applyGameResult(existingGame, scoreA, scoreB, syncStatusRef);
        if (applied) resultsApplied++;
      }

      logger.info(`[ApiFootball] syncResults[${tournamentName}]: applied=${resultsApplied} req=${requestsUsed}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, `[ApiFootball] syncResults[${tournamentName}] error: ${msg}`);
      errorMessage = msg;
      syncStatusRef.value = "partial";
    }
  }

  if (syncStatusRef.value !== "partial") syncStatusRef.value = "success";

  const durationMs = Date.now() - startTime;
  const firstLinked = linkedTournaments[0];
  await logSync({
    syncType: options.triggeredBy === "manual" ? "manual" : "results",
    status: syncStatusRef.value,
    leagueId: firstLinked.leagueId,
    season: firstLinked.season,
    requestsUsed,
    gamesCreated: 0,
    gamesUpdated: 0,
    resultsApplied,
    errorMessage,
    triggeredBy: options.triggeredBy ?? "cron",
    triggeredByUserId: options.triggeredByUserId,
    durationMs,
  });

  logger.info(
    `[ApiFootball] syncResults done: applied=${resultsApplied} req=${requestsUsed} duration=${durationMs}ms`
  );

  return { resultsApplied, requestsUsed, error: errorMessage };
}
