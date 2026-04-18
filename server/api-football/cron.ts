/**
 * API-Football Cron Jobs
 * ─────────────────────────────────────────────────────────────────────────────
 * Jobs de sincronização automática registrados na inicialização do servidor:
 *
 *  1. syncFixtures — 2x por dia (06:00 e 18:00 UTC)
 *     Busca jogos agendados dos próximos 14 dias.
 *     Atualiza logos e nomes dos times em jogos existentes.
 *
 *  2. syncResults — A cada 2 horas em horários UTC fixos (00, 02, 04, ..., 22)
 *     Busca resultados finais (FT) dos últimos 7 dias.
 *     Captura jogos adiados que foram remarcados e finalizados.
 *     Aplica pontuação nos bolões afetados.
 *
 *  3. syncTeams — Toda segunda-feira às 02:00 UTC
 *     Sincroniza times de todos os torneios vinculados à API.
 *     Atualiza nomes, logos e cria novos times adicionados à liga.
 *
 *  4. recalcularFormatos — Toda segunda-feira às 03:00 UTC
 *     Recalcula o formato (league/cup/groups_knockout) de cada torneio.
 *
 *  5. gerarAnalisesPrejogo — Todo dia às 05:00 UTC (era semanal)
 *     Gera análises pré-jogo para jogos futuros sem aiPrediction.
 *     Roda diariamente para cobrir jogos importados mid-week em até 24h.
 *
 * Todos os jobs verificam se a integração está habilitada antes de executar.
 * O controle é feito pelo Super Admin em Admin → Integrações.
 */

import logger from "../logger";
import { syncFixtures, syncResults, syncTeamsForTournament } from "./sync";
import { getDb } from "../db";
import { tournaments, games as gamesTable, teams as teamsTable } from "../../drizzle/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { inferTournamentFormat, inferTournamentFormatFromPhases } from "../../shared/tournamentFormat";
import { apiFootballRequest, fetchFixturePredictions, fetchInjuries, fetchTeamStatistics } from "./client";
import { buildAiPrediction, type AiPredictionContext } from "./ai-analysis";
import { notifyOwner } from "../_core/notification";
import { apiFootballCronHealth, recordJobRun } from "./cronHealth";

// ─── Helpers de agendamento ───────────────────────────────────────────────────

function scheduleDaily(hours: number[], taskName: string, fn: () => Promise<void>) {
  const checkAndRun = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    if (hours.includes(utcHour) && utcMin === 0) {
      logger.info(`[ApiFootball][Cron] Running ${taskName}...`);
      fn().catch((err) => logger.error({ err }, `[ApiFootball][Cron] ${taskName} failed`));
    }
  };

  // Verificar a cada minuto se é hora de executar
  const intervalId = setInterval(checkAndRun, 60 * 1000);
  logger.info(`[ApiFootball][Cron] ${taskName} scheduled at UTC hours: ${hours.join(", ")}:00`);
  return intervalId;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scheduleInterval(intervalMs: number, taskName: string, fn: () => Promise<void>) {
  const intervalId = setInterval(() => {
    logger.info(`[ApiFootball][Cron] Running ${taskName}...`);
    fn().catch((err) => logger.error({ err }, `[ApiFootball][Cron] ${taskName} failed`));
  }, intervalMs);
  logger.info(
    `[ApiFootball][Cron] ${taskName} scheduled every ${intervalMs / 60000} minutes`
  );
  return intervalId;
}

/**
 * Agenda uma tarefa para rodar uma vez por semana em um dia e hora específicos (UTC).
 * @param dayOfWeek - 0=Domingo, 1=Segunda, ..., 6=Sábado
 * @param hour - Hora UTC (0-23)
 */
function scheduleWeekly(dayOfWeek: number, hour: number, taskName: string, fn: () => Promise<void>) {
  const checkAndRun = () => {
    const now = new Date();
    if (now.getUTCDay() === dayOfWeek && now.getUTCHours() === hour && now.getUTCMinutes() === 0) {
      logger.info(`[ApiFootball][Cron] Running ${taskName}...`);
      fn().catch((err) => logger.error({ err }, `[ApiFootball][Cron] ${taskName} failed`));
    }
  };
  const intervalId = setInterval(checkAndRun, 60 * 1000);
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  logger.info(`[ApiFootball][Cron] ${taskName} scheduled weekly on ${days[dayOfWeek]} at ${hour}:00 UTC`);
  return intervalId;
}

// ─── Registro dos cron jobs ───────────────────────────────────────────────────

export function registerApiFootballCronJobs() {
  // Job 1: Sincronizar fixtures 2x por dia (06:00 e 18:00 UTC)
  // Atualiza logos e nomes dos times em jogos existentes (fix: antes só criava novos)
  scheduleDaily([6, 18], "syncFixtures", async () => {
    try {
      const result = await syncFixtures({ triggeredBy: "cron" });
      logger.info(
        `[ApiFootball][Cron] syncFixtures completed: created=${result.gamesCreated} updated=${result.gamesUpdated} req=${result.requestsUsed}`
      );
      recordJobRun("syncFixtures", !result.error, result.error);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordJobRun("syncFixtures", false, msg);
      throw err;
    }
  });

  // Job 2: Sincronizar resultados a cada 2 horas em horários UTC fixos
  // Janela de 7 dias (fix: antes era 1 dia) para capturar jogos adiados.
  scheduleDaily([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22], "syncResults", async () => {
    try {
      const result = await syncResults({ triggeredBy: "cron" });
      logger.info(
        `[ApiFootball][Cron] syncResults completed: applied=${result.resultsApplied} req=${result.requestsUsed}`
      );
      recordJobRun("syncResults", !result.error, result.error);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordJobRun("syncResults", false, msg);
      throw err;
    }
  });

  // Job 3: Sincronizar times de todos os torneios vinculados — toda segunda-feira às 02:00 UTC
  // Garante que nomes, logos e novos times adicionados à liga sejam refletidos no banco.
  scheduleWeekly(1, 2, "syncTeams", async () => {
    try {
      const db = await getDb();
      if (!db) {
        recordJobRun("syncTeams", false, "DB unavailable");
        return;
      }

      const allTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.isGlobal, true));

      const apiLinked = allTournaments.filter(
        t => t.apiFootballLeagueId !== null && t.apiFootballSeason !== null
      );

      if (apiLinked.length === 0) {
        logger.info("[Cron][SyncTeams] Nenhum torneio vinculado à API");
        recordJobRun("syncTeams", true);
        return;
      }

      let totalCreated = 0;
      let totalUpdated = 0;
      let lastError: string | undefined;

      for (const t of apiLinked) {
        try {
          const result = await syncTeamsForTournament({
            tournamentId: t.id,
            leagueId: t.apiFootballLeagueId!,
            season: t.apiFootballSeason!,
          });
          totalCreated += result.teamsCreated;
          totalUpdated += result.teamsUpdated;
          if (result.error) lastError = result.error;
          logger.info(`[Cron][SyncTeams] ${t.name}: +${result.teamsCreated} criados, ${result.teamsUpdated} atualizados`);
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          logger.error({ err }, `[Cron][SyncTeams] Erro em ${t.name}`);
        }
      }

      logger.info(`[Cron][SyncTeams] Concluído: ${totalCreated} criados, ${totalUpdated} atualizados em ${apiLinked.length} torneios`);
      recordJobRun("syncTeams", !lastError, lastError);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordJobRun("syncTeams", false, msg);
      throw err;
    }
  });

  // Job 4: Recalcular formatos dos torneios toda segunda-feira às 03:00 UTC
  // Garante que torneios importados antes dos rounds eliminatórios serem publicados
  // na API sejam corrigidos automaticamente quando os dados ficarem disponíveis.
  scheduleWeekly(1, 3, "recalcularFormatos", async () => {
    try {
      const db = await getDb();
      if (!db) {
        recordJobRun("recalcularFormatos", false, "DB unavailable");
        return;
      }

      const allTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.isGlobal, true));

      const apiLinked = allTournaments.filter(
        t => t.apiFootballLeagueId !== null && t.apiFootballSeason !== null
      );

      let changed = 0;
      for (const t of apiLinked) {
        const leagueId = t.apiFootballLeagueId!;
        const season = t.apiFootballSeason!;
        const oldFormat = t.format ?? "league";

        try {
          // 1. ID conhecido tem prioridade
          const knownFormat = inferTournamentFormat([], leagueId);
          let newFormat: "league" | "cup" | "groups_knockout";

          if (knownFormat !== "league") {
            newFormat = knownFormat;
          } else {
            // 2. Buscar rounds da API
            let apiRounds: string[] = [];
            try {
              const roundsData = await apiFootballRequest(`/fixtures/rounds`, { league: leagueId, season });
              apiRounds = (roundsData?.response ?? []) as unknown as string[];
            } catch { /* API indisponível */ }

            if (apiRounds.length > 0) {
              newFormat = inferTournamentFormat(apiRounds, leagueId);
            } else {
              // 3. Fallback: fases dos jogos no banco
              const gameRows = await db
                .select({ phase: gamesTable.phase })
                .from(gamesTable)
                .where(eq(gamesTable.tournamentId, t.id));
              const phases = [...new Set(gameRows.map(g => g.phase).filter(Boolean))] as string[];
              newFormat = inferTournamentFormatFromPhases(phases, leagueId);
            }
          }

          if (newFormat !== oldFormat) {
            await db.update(tournaments).set({ format: newFormat }).where(eq(tournaments.id, t.id));
            logger.info(`[Cron][RecalcFormatos] ${t.name}: ${oldFormat} → ${newFormat}`);
            changed++;
          }
        } catch (err) {
          logger.error({ err }, `[Cron][RecalcFormatos] Erro em ${t.name}`);
        }
      }

      logger.info(`[Cron][RecalcFormatos] Concluído: ${changed} torneios atualizados de ${apiLinked.length}`);
      recordJobRun("recalcularFormatos", true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordJobRun("recalcularFormatos", false, msg);
      throw err;
    }
  });

  // Job 5: Gerar análises pré-jogo DIARIAMENTE às 05:00 UTC
  // Antes era semanal (segunda-feira às 04:00 UTC). Agora roda todo dia para
  // garantir que jogos importados mid-week tenham análise em até 24h.
  scheduleDaily([5], "gerarAnalisesPrejogo", async () => {
    try {
      const db = await getDb();
      if (!db) {
        recordJobRun("gerarAnalisesPrejogo", false, "DB unavailable");
        return;
      }

      const now = new Date();

      // Buscar todos os jogos futuros sem análise
      const pendingGames = await db
        .select({
          id: gamesTable.id,
          externalId: gamesTable.externalId,
          teamAName: gamesTable.teamAName,
          teamBName: gamesTable.teamBName,
          matchDate: gamesTable.matchDate,
          tournamentId: gamesTable.tournamentId,
          apiFootballLeagueId: tournaments.apiFootballLeagueId,
          apiFootballSeason: tournaments.apiFootballSeason,
        })
        .from(gamesTable)
        .innerJoin(tournaments, eq(gamesTable.tournamentId, tournaments.id))
        .where(
          and(
            isNull(gamesTable.aiPrediction),
            sql`${gamesTable.status} = 'scheduled'`,
            sql`${gamesTable.matchDate} > ${now}`
          )
        );

      if (pendingGames.length === 0) {
        logger.info("[Cron][AnalisesPrejogo] Nenhum jogo pendente");
        recordJobRun("gerarAnalisesPrejogo", true);
        return;
      }

      logger.info(`[Cron][AnalisesPrejogo] Iniciando geração para ${pendingGames.length} jogos`);

      // Buscar nomes dos torneios
      const tournamentIds = [...new Set(pendingGames.map(g => g.tournamentId))];
      const tournamentRows = await db
        .select({ id: tournaments.id, name: tournaments.name })
        .from(tournaments)
        .where(sql`${tournaments.id} IN (${sql.join(tournamentIds.map(id => sql`${id}`), sql`, `)})`);
      const tournamentMap = Object.fromEntries(tournamentRows.map(t => [t.id, t.name]));

      let processed = 0;
      let errors = 0;

      for (const game of pendingGames) {
        try {
          const fixtureId = game.externalId ? parseInt(game.externalId) : null;
          let apiPercent: { home: number; draw: number; away: number } | null = null;
          let apiAdvice: string | null = null;

          let apiComparison: AiPredictionContext["apiComparison"] = null;
          if (fixtureId) {
            const apiPred = await fetchFixturePredictions(fixtureId).catch(() => null);
            const rawPercent = apiPred?.predictions?.percent;
            if (rawPercent) {
              apiPercent = {
                home: parseInt(rawPercent.home) || 0,
                draw: parseInt(rawPercent.draw) || 0,
                away: parseInt(rawPercent.away) || 0,
              };
              apiAdvice = apiPred?.predictions?.advice ?? null;
            }
            const rawCmp = apiPred?.comparison;
            if (rawCmp) {
              apiComparison = {
                total: rawCmp.total ?? null,
                poisson: rawCmp.poisson_distribution ?? null,
                forme: rawCmp.forme ?? null,
                att: rawCmp.att ?? null,
                def: rawCmp.def ?? null,
                h2h: rawCmp.h2h ?? null,
                goals: rawCmp.goals ?? null,
              };
            }
          }

          // Buscar lesionados/suspensos/questionáveis
          let injuries: AiPredictionContext["injuries"] = [];
          if (fixtureId) {
            const rawInjuries = await fetchInjuries(fixtureId).catch(() => []);
            injuries = rawInjuries.map(p => ({
              name: p.player.name,
              team: p.team.name,
              type: p.type,
              reason: p.reason,
            }));
          }

          // Buscar estatísticas da temporada dos dois times
          let homeStats: AiPredictionContext["homeStats"] = null;
          let awayStats: AiPredictionContext["awayStats"] = null;
          const leagueId = game.apiFootballLeagueId;
          const season = game.apiFootballSeason;
          if (leagueId && season) {
            // Buscar apiFootballTeamId dos times pelo nome
            const homeTeamRow = await db
              .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
              .from(teamsTable)
              .where(and(eq(teamsTable.name, game.teamAName ?? ""), sql`${teamsTable.apiFootballTeamId} IS NOT NULL`))
              .limit(1)
              .then(r => r[0] ?? null);
            const awayTeamRow = await db
              .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
              .from(teamsTable)
              .where(and(eq(teamsTable.name, game.teamBName ?? ""), sql`${teamsTable.apiFootballTeamId} IS NOT NULL`))
              .limit(1)
              .then(r => r[0] ?? null);

            const mapStats = (s: import("./client").TeamSeasonStats | null, teamName: string): AiPredictionContext["homeStats"] => {
              if (!s) return null;
              return {
                teamName,
                played: s.fixtures.played.total,
                wins: s.fixtures.wins.total,
                draws: s.fixtures.draws.total,
                loses: s.fixtures.loses.total,
                goalsFor: s.goals.for.total.total,
                goalsAgainst: s.goals.against.total.total,
                avgGoalsFor: s.goals.for.average.total,
                avgGoalsAgainst: s.goals.against.average.total,
                cleanSheets: s.clean_sheet.total,
                failedToScore: s.failed_to_score.total,
                biggestWin: s.biggest.wins.home ?? s.biggest.wins.away ?? null,
                biggestLoss: s.biggest.loses.home ?? s.biggest.loses.away ?? null,
                currentStreak: s.biggest.streak,
              };
            };

            const [rawHome, rawAway] = await Promise.all([
              homeTeamRow?.apiFootballTeamId
                ? fetchTeamStatistics(homeTeamRow.apiFootballTeamId, leagueId, season).catch(() => null)
                : Promise.resolve(null),
              awayTeamRow?.apiFootballTeamId
                ? fetchTeamStatistics(awayTeamRow.apiFootballTeamId, leagueId, season).catch(() => null)
                : Promise.resolve(null),
            ]);
            homeStats = mapStats(rawHome, game.teamAName ?? "Time A");
            awayStats = mapStats(rawAway, game.teamBName ?? "Time B");
          }

          const prediction = await buildAiPrediction({
            homeTeam: game.teamAName ?? "Time A",
            awayTeam: game.teamBName ?? "Time B",
            competition: tournamentMap[game.tournamentId] ?? "Campeonato",
            matchDate: game.matchDate?.toISOString() ?? new Date().toISOString(),
            apiPercent,
            apiAdvice,
            apiComparison,
            injuries,
            homeStats,
            awayStats,
          });

          if (prediction) {
            await db.update(gamesTable).set({ aiPrediction: prediction }).where(eq(gamesTable.id, game.id));
            processed++;
          }
        } catch (err) {
          errors++;
          logger.error({ err }, `[Cron][AnalisesPrejogo] Erro no jogo ${game.id}`);
        }
      }

      logger.info(`[Cron][AnalisesPrejogo] Concluído: ${processed} gerados, ${errors} erros`);
      recordJobRun("gerarAnalisesPrejogo", errors === 0, errors > 0 ? `${errors} erros em ${pendingGames.length} jogos` : undefined);

      // Notificar o super admin se houve processamento
      if (processed > 0) {
        await notifyOwner({
          title: "Análises pré-jogo geradas automaticamente",
          content: `O job diário gerou ${processed} análises pré-jogo${errors > 0 ? ` (${errors} erros)` : ""}. Todos os jogos futuros agora têm análise disponível.`,
        }).catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordJobRun("gerarAnalisesPrejogo", false, msg);
      throw err;
    }
  });

  logger.info("[ApiFootball][Cron] All API-Football cron jobs registered ✓");
}

// Re-exportar para uso no adminDashboard
export { apiFootballCronHealth };

/**
 * Regenera as análises pré-jogo de todos os jogos futuros agendados,
 * mesmo que já tenham aiPrediction (força regeração com prompt enriquecido).
 * Roda em segundo plano, em lotes de 10 com pausa de 5s entre lotes.
 * Retorna imediatamente — o progresso é registrado nos logs do servidor.
 */
export async function regenerateAllPredictions(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Buscar todos os jogos futuros agendados (com ou sem análise)
  const allGames = await db
    .select({
      id: gamesTable.id,
      externalId: gamesTable.externalId,
      teamAName: gamesTable.teamAName,
      teamBName: gamesTable.teamBName,
      matchDate: gamesTable.matchDate,
      tournamentId: gamesTable.tournamentId,
      apiFootballLeagueId: tournaments.apiFootballLeagueId,
      apiFootballSeason: tournaments.apiFootballSeason,
    })
    .from(gamesTable)
    .innerJoin(tournaments, eq(gamesTable.tournamentId, tournaments.id))
    .where(
      and(
        sql`${gamesTable.status} = 'scheduled'`,
        sql`${gamesTable.matchDate} > ${now}`
      )
    );

  if (allGames.length === 0) {
    logger.info("[Regen] Nenhum jogo futuro encontrado para regenerar");
    return;
  }

  logger.info(`[Regen] Iniciando regeneração de ${allGames.length} análises pré-jogo...`);

  // Buscar nomes dos torneios
  const tournamentIds = [...new Set(allGames.map(g => g.tournamentId))];
  const tournamentRows = await db
    .select({ id: tournaments.id, name: tournaments.name })
    .from(tournaments)
    .where(sql`${tournaments.id} IN (${sql.join(tournamentIds.map(id => sql`${id}`), sql`, `)})`);
  const tournamentMap = Object.fromEntries(tournamentRows.map(t => [t.id, t.name]));

  const BATCH_SIZE = 10;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < allGames.length; i += BATCH_SIZE) {
    const batch = allGames.slice(i, i + BATCH_SIZE);

    for (const game of batch) {
      try {
        const fixtureId = game.externalId ? parseInt(game.externalId) : null;
        let apiPercent: { home: number; draw: number; away: number } | null = null;
        let apiAdvice: string | null = null;
        let apiComparison: AiPredictionContext["apiComparison"] = null;

        if (fixtureId) {
          const apiPred = await fetchFixturePredictions(fixtureId).catch(() => null);
          const rawPercent = apiPred?.predictions?.percent;
          if (rawPercent) {
            apiPercent = {
              home: parseInt(rawPercent.home) || 0,
              draw: parseInt(rawPercent.draw) || 0,
              away: parseInt(rawPercent.away) || 0,
            };
            apiAdvice = apiPred?.predictions?.advice ?? null;
          }
          const rawCmp = apiPred?.comparison;
          if (rawCmp) {
            apiComparison = {
              total: rawCmp.total ?? null,
              poisson: rawCmp.poisson_distribution ?? null,
              forme: rawCmp.forme ?? null,
              att: rawCmp.att ?? null,
              def: rawCmp.def ?? null,
              h2h: rawCmp.h2h ?? null,
              goals: rawCmp.goals ?? null,
            };
          }
        }

        // Lesionados/suspensos/questionáveis
        let injuries: AiPredictionContext["injuries"] = [];
        if (fixtureId) {
          const rawInjuries = await fetchInjuries(fixtureId).catch(() => []);
          injuries = rawInjuries.map(p => ({
            name: p.player.name,
            team: p.team.name,
            type: p.type,
            reason: p.reason,
          }));
        }

        // Estatísticas da temporada
        let homeStats: AiPredictionContext["homeStats"] = null;
        let awayStats: AiPredictionContext["awayStats"] = null;
        const leagueId = game.apiFootballLeagueId;
        const season = game.apiFootballSeason;
        if (leagueId && season) {
          const homeTeamRow = await db
            .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
            .from(teamsTable)
            .where(and(eq(teamsTable.name, game.teamAName ?? ""), sql`${teamsTable.apiFootballTeamId} IS NOT NULL`))
            .limit(1)
            .then(r => r[0] ?? null);
          const awayTeamRow = await db
            .select({ apiFootballTeamId: teamsTable.apiFootballTeamId })
            .from(teamsTable)
            .where(and(eq(teamsTable.name, game.teamBName ?? ""), sql`${teamsTable.apiFootballTeamId} IS NOT NULL`))
            .limit(1)
            .then(r => r[0] ?? null);

          const mapStats = (s: import("./client").TeamSeasonStats | null, teamName: string): AiPredictionContext["homeStats"] => {
            if (!s) return null;
            return {
              teamName,
              played: s.fixtures.played.total,
              wins: s.fixtures.wins.total,
              draws: s.fixtures.draws.total,
              loses: s.fixtures.loses.total,
              goalsFor: s.goals.for.total.total,
              goalsAgainst: s.goals.against.total.total,
              avgGoalsFor: s.goals.for.average.total,
              avgGoalsAgainst: s.goals.against.average.total,
              cleanSheets: s.clean_sheet.total,
              failedToScore: s.failed_to_score.total,
              biggestWin: s.biggest.wins.home ?? s.biggest.wins.away ?? null,
              biggestLoss: s.biggest.loses.home ?? s.biggest.loses.away ?? null,
              currentStreak: s.biggest.streak,
            };
          };

          const [rawHome, rawAway] = await Promise.all([
            homeTeamRow?.apiFootballTeamId
              ? fetchTeamStatistics(homeTeamRow.apiFootballTeamId, leagueId, season).catch(() => null)
              : Promise.resolve(null),
            awayTeamRow?.apiFootballTeamId
              ? fetchTeamStatistics(awayTeamRow.apiFootballTeamId, leagueId, season).catch(() => null)
              : Promise.resolve(null),
          ]);
          homeStats = mapStats(rawHome, game.teamAName ?? "Time A");
          awayStats = mapStats(rawAway, game.teamBName ?? "Time B");
        }

        const prediction = await buildAiPrediction({
          homeTeam: game.teamAName ?? "Time A",
          awayTeam: game.teamBName ?? "Time B",
          competition: tournamentMap[game.tournamentId] ?? "Campeonato",
          matchDate: game.matchDate?.toISOString() ?? new Date().toISOString(),
          apiPercent,
          apiAdvice,
          apiComparison,
          injuries,
          homeStats,
          awayStats,
        });

        if (prediction) {
          await db.update(gamesTable).set({ aiPrediction: prediction }).where(eq(gamesTable.id, game.id));
          processed++;
        }
      } catch (err) {
        errors++;
        logger.error({ err }, `[Regen] Erro no jogo ${game.id}`);
      }
    }

    logger.info(`[Regen] Progresso: ${Math.min(i + BATCH_SIZE, allGames.length)}/${allGames.length} jogos processados (${processed} OK, ${errors} erros)`);

    // Pausa entre lotes para não sobrecarregar a API
    if (i + BATCH_SIZE < allGames.length) {
      await new Promise(r => setTimeout(r, 5_000));
    }
  }

  logger.info(`[Regen] Regeneração concluída: ${processed} análises atualizadas, ${errors} erros`);
  await notifyOwner({
    title: "Regeração de análises concluída",
    content: `${processed} análises pré-jogo foram regeneradas com dados de lesões e estatísticas da temporada${errors > 0 ? ` (${errors} erros)` : ""}.`,
  }).catch(() => {});
}
