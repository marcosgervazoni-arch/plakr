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
import { fetchFixtures, fetchTeams, fetchFixtureEvents, fetchFixtureStatistics, fetchFixturePredictions, fetchTeamRecentForm, fetchInjuries, fetchTeamStatistics, ApiFootballFixture, TeamSeasonStats } from "./client";
import { getDb } from "../db";
import {
  platformSettings,
  games,
  teams,
  tournaments,
  tournamentPhases,
  apiSyncLog,
  gameBetAnalyses,
} from "../../drizzle/schema";
import { getPhaseLabel, getPhaseOrder, isKnockoutPhase } from "../../shared/phaseNames";
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
import {
  parseGoalsTimeline,
  parseMatchStatistics,
  generateGameSummary,
  generateGameNarration,
  generateBetAnalysis,
  buildAiPrediction,
} from "./ai-analysis";

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
 *  - "Round of 32"         → "round_of_32"
 *  - "Round of 16"         → "round_of_16"
 *  - "Quarter-finals"      → "quarter_finals"
 *  - "Semi-finals"         → "semi_finals"
 *  - "Final"               → "final"
 */
function roundToPhaseKey(round: string): string {
  const r = round.toLowerCase().trim();

  // Fases eliminatórias (prioridade máxima)
  if (r.includes("round of 32") || r.includes("last 32")) return "round_of_32";
  if (r.includes("round of 16") || r.includes("last 16")) return "round_of_16";
  if (r.includes("1/256") || r.includes("1/128") || r.includes("1/64") || r.includes("1/32") || r.includes("1/16")) return "round_of_16";
  if (r.includes("round of 64") || r.includes("round of 128")) return "round_of_16";
  if (r.includes("quarter")) return "quarter_finals";
  if (r.includes("semi")) return "semi_finals";
  if (r.includes("3rd place") || r.includes("third place")) return "third_place";
  // "final" deve vir após "semi" e "quarter" para não capturar "semi-finals"
  if (/^final$/.test(r) || r === "1st phase - final" || r === "2nd phase - final") return "final";

  // Fases de qualificação (pré-fase de grupos)
  if (r.includes("qualification") || r.includes("qualifying") || r.includes("playoff") || r.includes("play-off")) return "1st_phase";
  if (r.includes("knockout round")) return "round_of_16";

  // Fases numeradas com nome específico — preservar para evitar sobreposição de rodadas
  if (r.startsWith("1st phase")) return "1st_phase";
  if (r.startsWith("2nd phase")) return "2nd_phase";
  if (r.startsWith("3rd phase")) return "3rd_phase";
  if (r.startsWith("apertura")) return "apertura";
  if (r.startsWith("clausura")) return "clausura";
  if (r.startsWith("regular season")) return "regular_season";
  if (r.startsWith("group")) return "group_stage";

  // Fallback: usar regular_season para rounds numerados genéricos (ex: "Round 5", "Week 12")
  // Não usar group_stage como fallback pois contamina a detecção de formato
  return "regular_season";
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

    // Coletar as fases únicas presentes nos fixtures para criar tournament_phases
    const phaseKeysFound = new Set<string>();
    for (const f of fixtures) {
      phaseKeysFound.add(roundToPhaseKey(f.league.round));
    }

    // Criar entradas em tournament_phases para cada fase encontrada (se ainda não existir)
    const existingPhases = await db
      .select({ key: tournamentPhases.key })
      .from(tournamentPhases)
      .where(eq(tournamentPhases.tournamentId, options.tournamentId));
    const existingPhaseKeys = new Set(existingPhases.map((p) => p.key));

    for (const phaseKey of phaseKeysFound) {
      if (!existingPhaseKeys.has(phaseKey)) {
        await db.insert(tournamentPhases).values({
          tournamentId: options.tournamentId,
          key: phaseKey,
          label: getPhaseLabel(phaseKey),
          enabled: true,
          order: getPhaseOrder(phaseKey),
          isKnockout: isKnockoutPhase(phaseKey),
        });
        existingPhaseKeys.add(phaseKey);
        logger.info(`[ApiFootball] Fase criada: ${phaseKey} → "${getPhaseLabel(phaseKey)}" (torneio ${options.tournamentId})`);
      }
    }

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

        const [insertedGame] = await db.insert(games).values({
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

        // Gerar aiPrediction para jogos futuros (fire-and-forget)
        if (!isFinished) {
          const insertedId = (insertedGame as any)?.insertId;
          if (insertedId) {
            setImmediate(async () => {
              try {
                // Buscar probabilidades da API-Football (plano Pro: /predictions)
                // Se a API não retornar dados, a análise não é gerada (nunca inventar)
                const apiPred = await fetchFixturePredictions(fixture.fixture.id).catch(() => null);
                const rawPercent = apiPred?.predictions?.percent;
                const apiPercent = rawPercent
                  ? {
                      home: parseInt(rawPercent.home) || 0,
                      draw: parseInt(rawPercent.draw) || 0,
                      away: parseInt(rawPercent.away) || 0,
                    }
                  : null;
                // Mapear comparison para o formato interno
                const rawCmp = apiPred?.comparison;
                const apiComparison = rawCmp ? {
                  total: rawCmp.total ?? null,
                  poisson: rawCmp.poisson_distribution ?? null,
                  forme: rawCmp.forme ?? null,
                  att: rawCmp.att ?? null,
                  def: rawCmp.def ?? null,
                  h2h: rawCmp.h2h ?? null,
                  goals: rawCmp.goals ?? null,
                } : null;

                // Buscar forma recente dos dois times em paralelo (plano Pro: /fixtures?team=X&last=5&status=FT)
                const homeTeamApiId = fixture.teams.home.id;
                const awayTeamApiId = fixture.teams.away.id;
                const [homeForm, awayForm] = await Promise.all([
                  fetchTeamRecentForm(homeTeamApiId, 5).catch(() => []),
                  fetchTeamRecentForm(awayTeamApiId, 5).catch(() => []),
                ]);

                const prediction = await buildAiPrediction({
                  homeTeam: fixture.teams.home.name,
                  awayTeam: fixture.teams.away.name,
                  competition: fixture.league.name,
                  matchDate: fixture.fixture.date,
                  apiPercent,
                  apiAdvice: apiPred?.predictions?.advice ?? null,
                  homeForm,
                  awayForm,
                  apiComparison,
                });

                // prediction é null quando a API não retornou probabilidades
                // Nesse caso não atualizamos o campo (mantém null no banco)
                if (prediction) {
                  const db2 = await getDb();
                  if (db2) {
                    await db2.update(games).set({ aiPrediction: prediction }).where(eq(games.id, insertedId));
                    logger.info(`[ApiFootball] aiPrediction gerado para jogo ${insertedId} (${fixture.teams.home.name} × ${fixture.teams.away.name}) — fonte: API-Football`);
                  }
                } else {
                  logger.warn(`[ApiFootball] Sem probabilidades da API para fixture ${fixture.fixture.id} — análise não gerada`);
                }
              } catch (err) {
                logger.error({ err }, `[ApiFootball] Erro ao gerar aiPrediction para fixture ${fixture.fixture.id}`);
              }
            });
          }
        }
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

  // Buscar jogos dos próximos 14 dias (para campeonatos em andamento)
  // Para campeonatos que ainda não começaram, buscar todos os fixtures sem filtro de data
  const today = new Date();
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fromStr = today.toISOString().slice(0, 10);
  const toStr = in14Days.toISOString().slice(0, 10);

  // Buscar startDate dos torneios para identificar campeonatos futuros
  const db2 = await getDb();
  const tournamentStartDates: Record<number, Date | null> = {};
  if (db2) {
    const startRows = await db2
      .select({ id: tournaments.id, startDate: tournaments.startDate })
      .from(tournaments)
      .where(sql`${tournaments.apiFootballLeagueId} IS NOT NULL`);
    for (const r of startRows) {
      tournamentStartDates[r.id] = r.startDate;
    }
  }

  for (const linked of linkedTournaments) {
    const { leagueId, season, id: tournamentId, name: tournamentName, phaseKey } = linked;
    try {
      // Se o campeonato ainda não começou, buscar todos os fixtures sem filtro de data
      // para garantir que novos jogos publicados pela API sejam importados
      const startDate = tournamentStartDates[tournamentId];
      const isFutureTournament = startDate && startDate > today;
      const allFixtures = await fetchFixtures(leagueId, season, isFutureTournament ? {} : {
        status: SCHEDULED_STATUSES.join("-"),
        from: fromStr,
        to: toStr,
      });
      requestsUsed++;

      // Filtrar por fase se o torneio foi importado com uma fase específica
      const fixtures = phaseKey
        ? allFixtures.filter(f => roundToPhaseKey(f.league.round) === phaseKey)
        : allFixtures;

      // ── Garantir tournament_phases para cada fase encontrada ──────────────
      // Mesma lógica do syncFixturesForTournament — necessário para filtros de
      // fase na UI e para consistência com importações manuais.
      const phaseKeysFound = new Set<string>(fixtures.map(f => roundToPhaseKey(f.league.round)));
      if (phaseKeysFound.size > 0) {
        const existingPhases = await db
          .select({ key: tournamentPhases.key })
          .from(tournamentPhases)
          .where(eq(tournamentPhases.tournamentId, tournamentId));
        const existingPhaseKeys = new Set(existingPhases.map((p) => p.key));
        for (const pk of phaseKeysFound) {
          if (!existingPhaseKeys.has(pk)) {
            await db.insert(tournamentPhases).values({
              tournamentId,
              key: pk,
              label: getPhaseLabel(pk),
              enabled: true,
              order: getPhaseOrder(pk),
              isKnockout: isKnockoutPhase(pk),
            });
            existingPhaseKeys.add(pk);
            logger.info(`[ApiFootball] syncFixtures — fase criada: ${pk} → "${getPhaseLabel(pk)}" (torneio ${tournamentId})`);
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

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
            .set({
              matchDate,
              venue: fixture.fixture.venue?.name ?? null,
              phase,
              roundNumber,
              // Atualizar logos e nomes dos times (podem mudar na API)
              teamAName: fixture.teams.home.name,
              teamBName: fixture.teams.away.name,
              teamAFlag: fixture.teams.home.logo,
              teamBFlag: fixture.teams.away.logo,
            })
            .where(eq(games.id, existing.id));
          gamesUpdated++;
        } else {
          // Buscar forma recente dos times ao inserir novo jogo (fire-and-forget)
          let newHomeForm: string[] = [];
          let newAwayForm: string[] = [];
          try {
            const homeApiId = fixture.teams.home.id;
            const awayApiId = fixture.teams.away.id;
            if (homeApiId && awayApiId) {
              [newHomeForm, newAwayForm] = await Promise.all([
                fetchTeamRecentForm(homeApiId, 5).catch(() => []),
                fetchTeamRecentForm(awayApiId, 5).catch(() => []),
              ]);
              requestsUsed += 2;
            }
          } catch {
            // forma não crítica — backfill cobre depois
          }
          const baseAiPrediction = (newHomeForm.length > 0 || newAwayForm.length > 0)
            ? { homeWin: 0, draw: 0, awayWin: 0, homeForm: newHomeForm, awayForm: newAwayForm, aiRecommendation: "" }
            : null;
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
            ...(baseAiPrediction ? { aiPrediction: baseAiPrediction } : {}),
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
  existingGame: { id: number; status: string | null; scoreA: number | null; externalId: string | null; teamAName: string | null; teamBName: string | null },
  scoreA: number,
  scoreB: number,
  syncStatusRef: { value: "success" | "error" | "partial" | "skipped" }
): Promise<boolean> {
  // Pular se já tem resultado final
  if (existingGame.status === "finished" && existingGame.scoreA !== null) return false;

  // Aplicar resultado final (NUNCA parcial)
  await updateGameResult(existingGame.id, scoreA, scoreB, false);

  // ── Buscar eventos e estatísticas da API-Football (fire-and-forget, não bloqueia scoring) ──
  const fixtureId = existingGame.externalId ? parseInt(existingGame.externalId) : null;
  let goalsTimeline: ReturnType<typeof parseGoalsTimeline> = [];
  let matchStatistics: ReturnType<typeof parseMatchStatistics> = null;

  if (fixtureId) {
    try {
      const [events, stats] = await Promise.all([
        fetchFixtureEvents(fixtureId),
        fetchFixtureStatistics(fixtureId),
      ]);
      goalsTimeline = parseGoalsTimeline(events, existingGame.teamAName ?? "", scoreA, scoreB);
      const rawStats = parseMatchStatistics(stats, existingGame.teamAName ?? "");
      // Se a API não retornou estatísticas, salvar objeto sentinela para marcar que o jogo foi processado
      matchStatistics = rawStats ?? {
        homePossession: 0, awayPossession: 0,
        homeShots: 0, awayShots: 0,
        homeCorners: 0, awayCorners: 0,
        homeYellow: 0, awayYellow: 0,
        homeRed: 0, awayRed: 0,
      };

      // Salvar gols e estatísticas no banco
      const db = await getDb();
      if (db) {
        await db.update(games).set({ goalsTimeline, matchStatistics }).where(eq(games.id, existingGame.id));
      }
    } catch (evtErr) {
      logger.warn({ err: evtErr, gameId: existingGame.id }, "[ApiFootball] Could not fetch events/stats");
    }
  }

  // Disparar motor de pontuação para todos os bolões com palpites neste jogo
  const betsByPool: Map<number, Array<{ id: number; userId: number; predictedScoreA: number | null; predictedScoreB: number | null; poolId: number }>> = new Map();
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
      betsByPool.set(poolId, poolBets);

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

  // ── Gerar textos de IA (assíncrono, não bloqueia o sync) ────────────────────────────────
  generateAiTextsForGame({
    gameId: existingGame.id,
    homeTeam: existingGame.teamAName ?? "Casa",
    awayTeam: existingGame.teamBName ?? "Visitante",
    scoreA,
    scoreB,
    goalsTimeline,
    matchStatistics,
    betsByPool,
  }).catch((e) => logger.error({ err: e, gameId: existingGame.id }, "[AI] Error generating AI texts"));

  return true;
}

// ── Geração assíncrona de textos de IA para um jogo finalizado ────────────────────────────
async function generateAiTextsForGame(ctx: {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  scoreA: number;
  scoreB: number;
  goalsTimeline: Array<{ min: string; team: "home" | "away"; player: string; type: "goal" | "own_goal" | "penalty" }>;
  matchStatistics: ReturnType<typeof parseMatchStatistics>;
  betsByPool: Map<number, Array<{ id: number; userId: number; predictedScoreA: number | null; predictedScoreB: number | null; poolId: number }>>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 1. Gerar resumo narrativo da partida
  const aiSummary = await generateGameSummary({
    homeTeam: ctx.homeTeam,
    awayTeam: ctx.awayTeam,
    scoreA: ctx.scoreA,
    scoreB: ctx.scoreB,
    goalsTimeline: ctx.goalsTimeline,
    statistics: ctx.matchStatistics ? {
      homePossession: ctx.matchStatistics.homePossession,
      awayPossession: ctx.matchStatistics.awayPossession,
      homeShots: ctx.matchStatistics.homeShots,
      awayShots: ctx.matchStatistics.awayShots,
    } : null,
  });

  // 1b. Gerar narração do narrador (para usuários sem palpite)
  const aiNarration = await generateGameNarration({
    homeTeam: ctx.homeTeam,
    awayTeam: ctx.awayTeam,
    scoreA: ctx.scoreA,
    scoreB: ctx.scoreB,
    goalsTimeline: ctx.goalsTimeline,
  });

  await db.update(games).set({ aiSummary, aiNarration }).where(eq(games.id, ctx.gameId));
  logger.info(`[AI] Game summary + narration generated for game ${ctx.gameId}`);

  // 2. Gerar análise de palpite para cada apostador em cada bolão
  for (const [poolId, poolBets] of ctx.betsByPool.entries()) {
    // Verificar se todos os jogos da rodada estão finalizados (regra de posição)
    const [gameRow] = await db.select({ roundNumber: games.roundNumber, tournamentId: games.tournamentId })
      .from(games).where(eq(games.id, ctx.gameId)).limit(1);

    let poolContext: Parameters<typeof generateBetAnalysis>[0]["poolContext"] = null;
    if (gameRow?.roundNumber) {
      const roundGames = await db.select({ status: games.status })
        .from(games)
        .where(and(
          eq(games.tournamentId, gameRow.tournamentId),
          eq(games.roundNumber, gameRow.roundNumber)
        ));
      const allRoundFinished = roundGames.every(g => g.status === "finished");

      if (allRoundFinished) {
        const exactCount = poolBets.filter(b => b.predictedScoreA === ctx.scoreA && b.predictedScoreB === ctx.scoreB).length;
        const correctCount = poolBets.filter(b => {
          const pA = b.predictedScoreA ?? 0;
          const pB = b.predictedScoreB ?? 0;
          return (pA > pB && ctx.scoreA > ctx.scoreB) || (pA < pB && ctx.scoreA < ctx.scoreB) || (pA === pB && ctx.scoreA === ctx.scoreB);
        }).length;

        // Calcular ranking da rodada por pontos
        const memberStats = await db.execute(
          sql`SELECT userId, SUM(pointsEarned) as roundPoints FROM bets WHERE poolId = ${poolId} AND gameId IN (SELECT id FROM games WHERE tournamentId = ${gameRow.tournamentId} AND roundNumber = ${gameRow.roundNumber}) GROUP BY userId ORDER BY roundPoints DESC`
        ) as any;
        const rows = memberStats[0] as Array<{ userId: number; roundPoints: number }>;
        poolContext = { totalParticipants: poolBets.length, exactCount, correctCount, totalBets: poolBets.length, userRank: 0 };

        for (const bet of poolBets) {
          const userRankIdx = rows.findIndex((r: any) => r.userId === bet.userId);
          const userRank = userRankIdx >= 0 ? userRankIdx + 1 : poolBets.length;
          const breakdown = calculateBetScore(
            bet.predictedScoreA ?? 0, bet.predictedScoreB ?? 0, ctx.scoreA, ctx.scoreB,
            { exactScorePoints: 10, correctResultPoints: 5, totalGoalsPoints: 3, goalDiffPoints: 3, oneTeamGoalsPoints: 2, landslidePoints: 5, zebraPoints: 1, landslideMinDiff: 4, zebraThreshold: 75, zebraCountDraw: false, zebraEnabled: true },
            { isZebraGame: false, betterTeam: "A", favoriteWon: true, losingRatio: 0 }
          );

          const analysisText = await generateBetAnalysis({
            homeTeam: ctx.homeTeam,
            awayTeam: ctx.awayTeam,
            scoreA: ctx.scoreA,
            scoreB: ctx.scoreB,
            predictedA: bet.predictedScoreA ?? 0,
            predictedB: bet.predictedScoreB ?? 0,
            resultType: breakdown.resultType,
            totalPoints: breakdown.total,
            isZebra: false,
            poolContext: { ...poolContext, userRank },
          });

          await db.insert(gameBetAnalyses).values({
            gameId: ctx.gameId,
            userId: bet.userId,
            poolId,
            analysisText,
          }).onDuplicateKeyUpdate({ set: { analysisText } });
        }
      } else {
        // Rodada incompleta: gerar análise sem posição
        for (const bet of poolBets) {
          const breakdown = calculateBetScore(
            bet.predictedScoreA ?? 0, bet.predictedScoreB ?? 0, ctx.scoreA, ctx.scoreB,
            { exactScorePoints: 10, correctResultPoints: 5, totalGoalsPoints: 3, goalDiffPoints: 3, oneTeamGoalsPoints: 2, landslidePoints: 5, zebraPoints: 1, landslideMinDiff: 4, zebraThreshold: 75, zebraCountDraw: false, zebraEnabled: true },
            { isZebraGame: false, betterTeam: "A", favoriteWon: true, losingRatio: 0 }
          );
          // Mesmo na rodada incompleta, busca contexto parcial do jogo
          const exactCountPartial = poolBets.filter(b => b.predictedScoreA === ctx.scoreA && b.predictedScoreB === ctx.scoreB).length;
          const correctCountPartial = poolBets.filter(b => {
            const pA = b.predictedScoreA ?? 0;
            const pB = b.predictedScoreB ?? 0;
            return (pA > pB && ctx.scoreA > ctx.scoreB) || (pA < pB && ctx.scoreA < ctx.scoreB) || (pA === pB && ctx.scoreA === ctx.scoreB);
          }).length;
          const analysisText = await generateBetAnalysis({
            homeTeam: ctx.homeTeam,
            awayTeam: ctx.awayTeam,
            scoreA: ctx.scoreA,
            scoreB: ctx.scoreB,
            predictedA: bet.predictedScoreA ?? 0,
            predictedB: bet.predictedScoreB ?? 0,
            resultType: breakdown.resultType,
            totalPoints: breakdown.total,
            isZebra: false,
            poolContext: { totalParticipants: poolBets.length, exactCount: exactCountPartial, correctCount: correctCountPartial, totalBets: poolBets.length, userRank: 0 },
          });
          await db.insert(gameBetAnalyses).values({
            gameId: ctx.gameId,
            userId: bet.userId,
            poolId,
            analysisText,
          }).onDuplicateKeyUpdate({ set: { analysisText } });
        }
      }
    }
  }
  logger.info(`[AI] Bet analyses generated for game ${ctx.gameId}`);
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

  // Janela de busca: últimos 7 dias até hoje
  // Captura jogos adiados (PST/CANC/ABD) que foram remarcados e finalizados
  // depois do período de sincronização original. 7 dias é seguro dentro da
  // cota diária de 7500 requisições da API-Football.
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = sevenDaysAgo.toISOString().slice(0, 10);
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

  // Após sincronizar resultados, gerar aiSummary para jogos que ainda não têm
  // (executa em background para não bloquear o retorno do cron)
  if (resultsApplied > 0) {
    backfillAiSummaries({ batchSize: 20 }).catch((e) =>
      logger.error({ err: e }, "[AI][AutoBackfill] Error running automatic aiSummary backfill")
    );
  }

  return { resultsApplied, requestsUsed, error: errorMessage };
}

// ─── JOB 3: Backfill de Estatísticas e Análises de IA ────────────────────────
/**
 * Reprocessa jogos finalizados que não têm estatísticas ou análises de IA.
 * Útil para recuperar dados após uma suspensão de conta ou falha de sync.
 *
 * Para cada jogo com status=finished, externalId preenchido e matchStatistics=null:
 *  1. Busca eventos e estatísticas da API-Football
 *  2. Salva no banco (goalsTimeline + matchStatistics)
 *  3. Dispara geração assíncrona de aiSummary + gameBetAnalyses
 *
 * @param options.batchSize  Máximo de jogos a processar (padrão: 50)
 * @param options.triggeredByUserId  ID do admin que disparou o backfill
 */
export async function backfillGameData(options: {
  batchSize?: number;
  triggeredByUserId?: number;
}): Promise<{ processed: number; succeeded: number; failed: number; requestsUsed: number; error?: string }> {
  const db = await getDb();
  if (!db) return { processed: 0, succeeded: 0, failed: 0, requestsUsed: 0, error: "DB unavailable" };

  const batchSize = options.batchSize ?? 50;

  // Buscar jogos finalizados sem estatísticas e com externalId
  const pendingGames = await db
    .select({
      id: games.id,
      externalId: games.externalId,
      teamAName: games.teamAName,
      teamBName: games.teamBName,
      scoreA: games.scoreA,
      scoreB: games.scoreB,
    })
    .from(games)
    .where(
      and(
        eq(games.status, "finished"),
        isNull(games.matchStatistics),
        sql`${games.externalId} IS NOT NULL`
      )
    )
    .limit(batchSize);

  const total = pendingGames.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let requestsUsed = 0;

  logger.info(`[ApiFootball][Backfill] Starting backfill for ${total} games (batch=${batchSize})`);

  for (const game of pendingGames) {
    const fixtureId = game.externalId ? parseInt(game.externalId) : null;
    if (!fixtureId) { processed++; failed++; continue; }

    try {
      // Buscar eventos e estatísticas da API-Football
      const [events, stats] = await Promise.all([
        fetchFixtureEvents(fixtureId),
        fetchFixtureStatistics(fixtureId),
      ]);
      requestsUsed += 2;

      const goalsTimeline = parseGoalsTimeline(events, game.teamAName ?? "", game.scoreA, game.scoreB);
      const rawStats = parseMatchStatistics(stats, game.teamAName ?? "");
      // Se a API não retornou estatísticas, salvar objeto sentinela para marcar que o jogo
      // foi processado (evita que fique no contador de pendentes indefinidamente)
      const matchStatistics = rawStats ?? {
        homePossession: 0, awayPossession: 0,
        homeShots: 0, awayShots: 0,
        homeCorners: 0, awayCorners: 0,
        homeYellow: 0, awayYellow: 0,
        homeRed: 0, awayRed: 0,
      };

      // Salvar no banco
      await db.update(games).set({ goalsTimeline, matchStatistics }).where(eq(games.id, game.id));

      // Buscar palpites para gerar análises de IA
      const betsByPool: Map<number, Array<{ id: number; userId: number; predictedScoreA: number | null; predictedScoreB: number | null; poolId: number }>> = new Map();
      const allBets = await getBetsByGameAllPools(game.id);
      for (const bet of allBets) {
        if (!betsByPool.has(bet.poolId)) betsByPool.set(bet.poolId, []);
        betsByPool.get(bet.poolId)!.push(bet);
      }

      // Gerar textos de IA de forma assíncrona (não bloqueia o loop)
      generateAiTextsForGame({
        gameId: game.id,
        homeTeam: game.teamAName ?? "Casa",
        awayTeam: game.teamBName ?? "Visitante",
        scoreA: game.scoreA ?? 0,
        scoreB: game.scoreB ?? 0,
        goalsTimeline,
        matchStatistics,
        betsByPool,
      }).catch((e) => logger.error({ err: e, gameId: game.id }, "[AI][Backfill] Error generating AI texts"));

      succeeded++;
      logger.info(`[ApiFootball][Backfill] Game ${game.id} (fixture ${fixtureId}) processed OK`);
    } catch (err) {
      failed++;
      logger.error({ err, gameId: game.id, fixtureId }, "[ApiFootball][Backfill] Failed to process game");
    }

    processed++;
  }

  logger.info(
    `[ApiFootball][Backfill] Done: processed=${processed} succeeded=${succeeded} failed=${failed} req=${requestsUsed}`
  );
  return { processed, succeeded, failed, requestsUsed };
}

/**
 * Retorna quantos jogos finalizados estão sem estatísticas (precisam de backfill).
 */
export async function getBackfillPendingCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { count } = await import("drizzle-orm");
  const [row] = await db
    .select({ total: count() })
    .from(games)
    .where(
      and(
        eq(games.status, "finished"),
        isNull(games.matchStatistics),
        sql`${games.externalId} IS NOT NULL`
      )
    );
  return row?.total ?? 0;
}

/**
 * Backfill de aiSummary/aiNarration para jogos finalizados que já têm
 * matchStatistics mas ainda não têm resumo de IA gerado.
 */
export async function backfillAiSummaries(options: {
  batchSize?: number;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, succeeded: 0, failed: 0 };
  const batchSize = options.batchSize ?? 50;

  const pendingGames = await db
    .select({
      id: games.id,
      teamAName: games.teamAName,
      teamBName: games.teamBName,
      scoreA: games.scoreA,
      scoreB: games.scoreB,
      goalsTimeline: games.goalsTimeline,
      matchStatistics: games.matchStatistics,
    })
    .from(games)
    .where(
      and(
        eq(games.status, "finished"),
        isNull(games.aiSummary),
        sql`${games.externalId} IS NOT NULL`
      )
    )
    .limit(batchSize);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  logger.info(`[BackfillAiSummary] Starting for ${pendingGames.length} games`);

  for (const game of pendingGames) {
    try {
      const allBets = await getBetsByGameAllPools(game.id);
      const betsByPool: Map<number, Array<{ id: number; userId: number; predictedScoreA: number | null; predictedScoreB: number | null; poolId: number }>> = new Map();
      for (const bet of allBets) {
        if (!betsByPool.has(bet.poolId)) betsByPool.set(bet.poolId, []);
        betsByPool.get(bet.poolId)!.push(bet);
      }
      await generateAiTextsForGame({
        gameId: game.id,
        homeTeam: game.teamAName ?? "Casa",
        awayTeam: game.teamBName ?? "Visitante",
        scoreA: game.scoreA ?? 0,
        scoreB: game.scoreB ?? 0,
        goalsTimeline: (game.goalsTimeline as Array<{ min: string; team: "home" | "away"; player: string; type: "goal" | "own_goal" | "penalty" }>) ?? [],
        matchStatistics: game.matchStatistics as ReturnType<typeof parseMatchStatistics>,
        betsByPool,
      });
      succeeded++;
      logger.info(`[BackfillAiSummary] Game ${game.id} OK`);
    } catch (err) {
      failed++;
      logger.error({ err, gameId: game.id }, "[BackfillAiSummary] Failed");
    }
    processed++;
  }

  logger.info(`[BackfillAiSummary] Done: processed=${processed} succeeded=${succeeded} failed=${failed}`);
  return { processed, succeeded, failed };
}

/**
 * Retorna quantos jogos finalizados estão sem aiSummary (precisam de backfill de IA).
 */
export async function getAiSummaryPendingCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { count } = await import("drizzle-orm");
  const [row] = await db
    .select({ total: count() })
    .from(games)
    .where(
      and(
        eq(games.status, "finished"),
        isNull(games.aiSummary),
        sql`${games.externalId} IS NOT NULL`
      )
    );
  return row?.total ?? 0;
}

/**
 * Backfill de forma recente dos times (homeForm/awayForm) para jogos não finalizados
 * que têm o campo vazio. Busca apiFootballTeamId pelo nome do time na tabela teams,
 * pois a maioria dos jogos não tem teamAId/teamBId preenchidos (apenas teamAName/teamBName).
 */
export async function backfillTeamForm(options: {
  batchSize?: number;
}): Promise<{ processed: number; succeeded: number; failed: number; requestsUsed: number; error?: string }> {
  const db = await getDb();
  if (!db) return { processed: 0, succeeded: 0, failed: 0, requestsUsed: 0, error: "DB unavailable" };

  const batchSize = options.batchSize ?? 30;

  // Buscar jogos não finalizados com homeForm vazio
  // NÃO filtramos por teamAId IS NOT NULL pois a maioria dos jogos usa apenas teamAName
  const pendingGames = await db
    .select({
      id: games.id,
      teamAId: games.teamAId,
      teamBId: games.teamBId,
      teamAName: games.teamAName,
      teamBName: games.teamBName,
      aiPrediction: games.aiPrediction,
    })
    .from(games)
    .where(
      and(
        sql`${games.status} != 'finished'`,
        sql`(${games.aiPrediction} IS NULL OR JSON_LENGTH(JSON_EXTRACT(${games.aiPrediction}, '$.homeForm')) = 0)`
      )
    )
    .limit(batchSize);

  const total = pendingGames.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let requestsUsed = 0;

  logger.info(`[ApiFootball][BackfillForm] Starting form backfill for ${total} games`);

  const { teams: teamsTable } = await import("../../drizzle/schema");

  for (const game of pendingGames) {
    try {
      let homeApiId: number | null = null;
      let awayApiId: number | null = null;

      // Estratégia 1: buscar por teamAId/teamBId (quando disponível)
      if (game.teamAId && game.teamBId) {
        const [teamARow] = await db
          .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
          .from(teamsTable)
          .where(eq(teamsTable.id, game.teamAId))
          .limit(1);
        const [teamBRow] = await db
          .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
          .from(teamsTable)
          .where(eq(teamsTable.id, game.teamBId))
          .limit(1);
        homeApiId = teamARow?.apiFootballTeamId ?? null;
        awayApiId = teamBRow?.apiFootballTeamId ?? null;
      }

      // Estratégia 2: buscar por nome do time (fallback para jogos sem teamAId)
      if ((!homeApiId || !awayApiId) && game.teamAName && game.teamBName) {
        if (!homeApiId) {
          const [teamAByName] = await db
            .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
            .from(teamsTable)
            .where(eq(teamsTable.name, game.teamAName))
            .limit(1);
          homeApiId = teamAByName?.apiFootballTeamId ?? null;
        }
        if (!awayApiId) {
          const [teamBByName] = await db
            .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
            .from(teamsTable)
            .where(eq(teamsTable.name, game.teamBName))
            .limit(1);
          awayApiId = teamBByName?.apiFootballTeamId ?? null;
        }
      }

      if (!homeApiId || !awayApiId) {
        logger.warn(`[ApiFootball][BackfillForm] Game ${game.id} (${game.teamAName} × ${game.teamBName}): sem apiFootballTeamId (home=${homeApiId}, away=${awayApiId})`);
        processed++; failed++; continue;
      }

      const [homeForm, awayForm] = await Promise.all([
        fetchTeamRecentForm(homeApiId, 5).catch(() => []),
        fetchTeamRecentForm(awayApiId, 5).catch(() => []),
      ]);
      requestsUsed += 2;

      // Atualizar aiPrediction mantendo os outros campos existentes
      const existing = (game.aiPrediction ?? {}) as Record<string, unknown>;
      const updated = { ...existing, homeForm, awayForm };
      await db.update(games).set({ aiPrediction: updated as typeof game.aiPrediction }).where(eq(games.id, game.id));

      succeeded++;
      logger.info(`[ApiFootball][BackfillForm] Game ${game.id} (${game.teamAName} × ${game.teamBName}): home=${homeForm.join("")} away=${awayForm.join("")}`);
    } catch (err) {
      failed++;
      logger.error({ err, gameId: game.id }, "[ApiFootball][BackfillForm] Failed");
    }
    processed++;
  }

  logger.info(`[ApiFootball][BackfillForm] Done: processed=${processed} succeeded=${succeeded} failed=${failed} req=${requestsUsed}`);
  return { processed, succeeded, failed, requestsUsed };
}

/**
 * Retorna quantos jogos não finalizados estão sem forma recente (precisam de backfill).
 */
export async function getTeamFormPendingCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(games)
    .where(
      and(
        sql`${games.status} != 'finished'`,
        sql`(${games.aiPrediction} IS NULL OR JSON_LENGTH(JSON_EXTRACT(${games.aiPrediction}, '$.homeForm')) = 0)`
      )
    );
  return Number(row?.total ?? 0);
}
