/**
 * Plakr! — Router de Integrações (API-Football)
 * Todos os procedimentos são restritos ao Super Admin (adminProcedure).
 * O Super Admin configura a chave, ativa/desativa e dispara syncs manuais.
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import logger from "../logger";
import { getDb } from "../db";
import { platformSettings, apiSyncLog, apiQuotaTracker, tournaments, games as gamesTable } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncFixtures, syncResults, syncTeamsForTournament, syncFixturesForTournament, backfillGameData, getBackfillPendingCount, backfillAiSummaries, getAiSummaryPendingCount, backfillTeamForm, getTeamFormPendingCount } from "../api-football/sync";
import { buildAiPrediction } from "../api-football/ai-analysis";
import { fetchFixturePredictions } from "../api-football/client";
import { and, isNull, lt, sql } from "drizzle-orm";
import { fetchAccountStatus, apiFootballRequest, AccountSuspendedError } from "../api-football/client";
import { Err } from "../errors";
import { getPhaseLabel } from "../../shared/phaseNames";
import { inferTournamentFormat, inferTournamentFormatFromPhases } from "../../shared/tournamentFormat";

// ─── Estado global de progresso do backfill de IA ────────────────────────────
type AiBackfillJob = {
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  errors: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  message: string;
};

const aiBackfillJob: AiBackfillJob = {
  status: "idle",
  total: 0,
  processed: 0,
  errors: 0,
  startedAt: null,
  finishedAt: null,
  message: "Nenhum job em andamento",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getIntegrationSettings() {
  const db = await getDb();
  if (!db) throw Err.internal("DB unavailable");
  const [settings] = await db
    .select({
      apiFootballKey: platformSettings.apiFootballKey,
      apiFootballEnabled: platformSettings.apiFootballEnabled,
      apiFootballQuotaLimit: platformSettings.apiFootballQuotaLimit,
      apiFootballSyncFixtures: platformSettings.apiFootballSyncFixtures,
      apiFootballSyncResults: platformSettings.apiFootballSyncResults,
      apiFootballLeagueId: platformSettings.apiFootballLeagueId,
      apiFootballSeason: platformSettings.apiFootballSeason,
      apiFootballLastSync: platformSettings.apiFootballLastSync,
      apiFootballCircuitOpen: platformSettings.apiFootballCircuitOpen,
      apiFootballCircuitOpenAt: platformSettings.apiFootballCircuitOpenAt,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  return settings;
}

// ─── Helpers de fase ────────────────────────────────────────────────────────

/** Converte o round string da API para uma chave de fase normalizada */
function roundToPhaseKeyLocal(round: string): string {
  const r = round.toLowerCase().trim();
  // Fases eliminatórias (prioridade máxima)
  if (r.includes("round of 32") || r.includes("last 32")) return "round_of_32";
  if (r.includes("round of 16") || r.includes("last 16")) return "round_of_16";
  if (r.includes("1/256") || r.includes("1/128") || r.includes("1/64") || r.includes("1/32") || r.includes("1/16")) return "round_of_16";
  if (r.includes("round of 64") || r.includes("round of 128")) return "round_of_16";
  if (r.includes("quarter")) return "quarter_finals";
  if (r.includes("semi")) return "semi_finals";
  if (r.includes("3rd place") || r.includes("third place")) return "third_place";
  if (/^final$/.test(r) || r === "1st phase - final" || r === "2nd phase - final") return "final";
  // Fases de qualificação
  if (r.includes("qualification") || r.includes("qualifying") || r.includes("playoff") || r.includes("play-off")) return "1st_phase";
  if (r.includes("knockout round")) return "round_of_16";
  // Fases nomeadas
  if (r.startsWith("1st phase")) return "1st_phase";
  if (r.startsWith("2nd phase")) return "2nd_phase";
  if (r.startsWith("3rd phase")) return "3rd_phase";
  if (r.startsWith("apertura")) return "apertura";
  if (r.startsWith("clausura")) return "clausura";
  if (r.startsWith("regular season")) return "regular_season";
  if (r.startsWith("group")) return "group_stage";
  // Fallback: regular_season (não group_stage, para não contaminar detecção de formato)
  return "regular_season";
}

/** Converte a chave de fase em nome legível para exibição */
// phaseKeyToName agora usa o utilitário compartilhado getPhaseLabel
// Mantido como alias para compatibilidade com código existente
function phaseKeyToName(phaseKey: string, sampleRound?: string): string {
  const label = getPhaseLabel(phaseKey);
  // Se não reconheceu a chave e temos o round original, usar a primeira parte do round
  if (label === phaseKey && sampleRound) {
    const parts = sampleRound.split(" - ");
    return parts[0] || phaseKey;
  }
  return label;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const integrationsRouter = router({
  /**
   * Retorna as configurações atuais da integração (chave mascarada).
   */
  getSettings: adminProcedure.query(async ({ ctx: _ctx }) => {
    const settings = await getIntegrationSettings();
    if (!settings) throw Err.notFound("Configurações");

    // Mascarar a chave: mostrar apenas os últimos 4 caracteres
    const key = settings.apiFootballKey;
    const maskedKey = key ? `${"•".repeat(key.length - 4)}${key.slice(-4)}` : null;

    // Quota do dia
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const [quotaRow] = db
      ? await db
          .select()
          .from(apiQuotaTracker)
          .where(eq(apiQuotaTracker.date, today))
          .limit(1)
      : [null];

    return {
      apiFootballKeyConfigured: !!key,
      apiFootballKeyMasked: maskedKey,
      apiFootballEnabled: settings.apiFootballEnabled,
      apiFootballQuotaLimit: settings.apiFootballQuotaLimit,
      apiFootballSyncFixtures: settings.apiFootballSyncFixtures,
      apiFootballSyncResults: settings.apiFootballSyncResults,
      apiFootballLeagueId: settings.apiFootballLeagueId,
      apiFootballSeason: settings.apiFootballSeason,
      apiFootballLastSync: settings.apiFootballLastSync,
      apiFootballCircuitOpen: settings.apiFootballCircuitOpen,
      apiFootballCircuitOpenAt: settings.apiFootballCircuitOpenAt,
      quotaUsedToday: quotaRow?.requestsUsed ?? 0,
      quotaLimit: settings.apiFootballQuotaLimit,
    };
  }),

  /**
   * Salva a chave da API-Football e configurações básicas.
   * A chave é armazenada criptografada no banco (campo varchar 64).
   */
  saveSettings: adminProcedure
    .input(
      z.object({
        apiFootballKey: z.string().min(10).max(64).optional(),
        apiFootballEnabled: z.boolean().optional(),
        apiFootballQuotaLimit: z.number().min(1).max(500).optional(),
        apiFootballSyncFixtures: z.boolean().optional(),
        apiFootballSyncResults: z.boolean().optional(),
        apiFootballLeagueId: z.number().optional(),
        apiFootballSeason: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB unavailable");

      const updateData: Record<string, any> = {};
      if (input.apiFootballKey !== undefined) updateData.apiFootballKey = input.apiFootballKey;
      if (input.apiFootballEnabled !== undefined) updateData.apiFootballEnabled = input.apiFootballEnabled;
      if (input.apiFootballQuotaLimit !== undefined) updateData.apiFootballQuotaLimit = input.apiFootballQuotaLimit;
      if (input.apiFootballSyncFixtures !== undefined) updateData.apiFootballSyncFixtures = input.apiFootballSyncFixtures;
      if (input.apiFootballSyncResults !== undefined) updateData.apiFootballSyncResults = input.apiFootballSyncResults;
      if (input.apiFootballLeagueId !== undefined) updateData.apiFootballLeagueId = input.apiFootballLeagueId;
      if (input.apiFootballSeason !== undefined) updateData.apiFootballSeason = input.apiFootballSeason;

      if (Object.keys(updateData).length === 0) return { success: true };

      await db.update(platformSettings).set(updateData).where(eq(platformSettings.id, 1));
      return { success: true };
    }),

  /**
   * Reseta o circuit breaker manualmente (para quando o Admin quiser forçar retry).
   */
  resetCircuitBreaker: adminProcedure.mutation(async ({ ctx: _ctx }) => {
    const db = await getDb();
    if (!db) throw Err.internal("DB unavailable");
    await db
      .update(platformSettings)
      .set({ apiFootballCircuitOpen: false, apiFootballCircuitOpenAt: null })
      .where(eq(platformSettings.id, 1));
    return { success: true };
  }),

  /**
   * Testa a conexão com a API-Football usando a chave configurada.
   * Consome 1 requisição da quota.
   */
  testConnection: adminProcedure.mutation(async ({ ctx: _ctx }) => {
    try {
      const status = await fetchAccountStatus();
      return {
        success: true,
        accountSuspended: false,
        plan: status.plan,
        requestsLimit: status.requestsLimit,
        requestsRemaining: status.requestsRemaining,
      };
    } catch (err) {
      const isSuspended = err instanceof AccountSuspendedError;
      return {
        success: false,
        accountSuspended: isSuspended,
        // Mensagem amigável diferenciada para conta suspensa vs erro temporário
        error: isSuspended
          ? "Conta API-Football suspensa. Acesse dashboard.api-football.com para regularizar."
          : err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }),

  /**
   * Dispara sincronização manual de fixtures (jogos agendados).
   */
  manualSyncFixtures: adminProcedure.mutation(async ({ ctx }) => {
    const result = await syncFixtures({
      triggeredBy: "manual",
      triggeredByUserId: ctx.user.id,
    });
    return result;
  }),

  /**
   * Dispara sincronização manual de resultados finais.
   */
  manualSyncResults: adminProcedure.mutation(async ({ ctx }) => {
    const result = await syncResults({
      triggeredBy: "manual",
      triggeredByUserId: ctx.user.id,
    });
    return result;
  }),

  /**
   * Lista os últimos 50 logs de sincronização.
   */
  getSyncLogs: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db
        .select()
        .from(apiSyncLog)
        .orderBy(desc(apiSyncLog.createdAt))
        .limit(input.limit);
      return logs;
    }),

  /**
   * Histórico de quota diária (últimos 30 dias).
   */
  getQuotaHistory: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const history = await db
      .select()
      .from(apiQuotaTracker)
      .orderBy(desc(apiQuotaTracker.date))
      .limit(30);
    return history;
  }),

  /**
   * Lista todos os campeonatos globais com status de disponibilidade (curadoria).
   */
  listTournaments: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(tournaments)
      .where(eq(tournaments.isGlobal, true))
      .orderBy(desc(tournaments.createdAt));
  }),

  /**
   * Ativa ou desativa a visibilidade de um campeonato para os usuários.
   */
  toggleTournamentAvailability: adminProcedure
    .input(z.object({ tournamentId: z.number(), isAvailable: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");
      await db
        .update(tournaments)
        .set({ isAvailable: input.isAvailable })
        .where(eq(tournaments.id, input.tournamentId));
      return { success: true };
    }),

  /**
   * Busca ligas disponíveis na API-Football para uma temporada.
   * Estratégia: busca por país (Brazil) + IDs fixos das principais ligas internacionais.
   * Consome 2 requisições da quota diária.
   */
  fetchLeaguesFromApi: adminProcedure
    .input(z.object({ season: z.number().default(2026) }))
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");
      const settings = await db.select().from(platformSettings).limit(1);
      const cfg = settings[0];
      if (!cfg?.apiFootballKey) throw Err.badRequest("Chave da API-Football não configurada");
      if (!cfg.apiFootballEnabled) throw Err.badRequest("Integração API-Football está desativada");

      const season = cfg.apiFootballSeason;

      // IDs fixos das principais ligas internacionais (Copa do Mundo, Champions, Europa,
      // Libertadores, Sul-Americana, FIFA Club World Cup, CONCACAF Champions,
      // Premier League, La Liga, Serie A Itália, Bundesliga, Ligue 1, MLS, Liga MX)
      const INTERNATIONAL_IDS = [1, 2, 3, 11, 13, 15, 16, 39, 61, 78, 135, 140, 253, 262];

      // Duas requisições em paralelo:
      // - ligas do Brasil (garante Brasileirão Série A/B/C/D, Copa do Brasil, estaduais)
      // - todas as ligas da temporada (para filtrar as internacionais por ID)
      const [brazilData, allLeaguesData] = await Promise.all([
        apiFootballRequest(`/leagues`, { country: "Brazil", season }),
        apiFootballRequest(`/leagues`, { season }),
      ]);

      const brazilLeagues = (brazilData?.response ?? []) as any[];
      const allLeagues = (allLeaguesData?.response ?? []) as any[];

      // Filtrar internacionais pelos IDs prioritários
      const intlLeagues = allLeagues.filter((item: any) =>
        INTERNATIONAL_IDS.includes(item.league.id as number)
      );

      // Ordenar internacionais pela ordem de prioridade definida
      intlLeagues.sort((a: any, b: any) =>
        INTERNATIONAL_IDS.indexOf(a.league.id) - INTERNATIONAL_IDS.indexOf(b.league.id)
      );

      // Combinar: internacionais primeiro (destaque), depois brasileiras
      const seen = new Set<number>(intlLeagues.map((l: any) => l.league.id as number));
      const combined: any[] = [...intlLeagues];
      for (const item of brazilLeagues) {
        const id = item.league.id as number;
        if (!seen.has(id)) {
          seen.add(id);
          combined.push(item);
        }
      }

      return combined.map((item: any) => ({
        leagueId: item.league.id as number,
        name: item.league.name as string,
        country: item.country.name as string,
        logoUrl: item.league.logo as string,
        season,
        type: item.league.type as string,
      }));
    }),

  /**
   * Busca as fases disponíveis de uma liga na API-Football.
   * Agrupa os rounds por fase (1st Phase, 2nd Phase, Regular Season, etc.)
   * para que o admin possa escolher qual fase/competição importar.
   * Consome 1 requisição da quota.
   */
  getLeaguePhases: adminProcedure
    .input(z.object({ leagueId: z.number(), season: z.number() }))
    .mutation(async ({ input }) => {
      const data = await apiFootballRequest<{ league: { round: string } }>(
        `/fixtures/rounds`,
        { league: input.leagueId, season: input.season }
      );

      const rounds: string[] = (data?.response ?? []) as unknown as string[];

      // Agrupar rounds por fase
      const phaseMap = new Map<string, { phaseKey: string; phaseName: string; rounds: string[]; roundCount: number; gameCount: number }>();

      for (const round of rounds) {
        const phaseKey = roundToPhaseKeyLocal(round);
        const phaseName = phaseKeyToName(phaseKey, round);
        if (!phaseMap.has(phaseKey)) {
          phaseMap.set(phaseKey, { phaseKey, phaseName, rounds: [], roundCount: 0, gameCount: 0 });
        }
        const entry = phaseMap.get(phaseKey)!;
        entry.rounds.push(round);
        entry.roundCount++;
        // Estimativa: ligas com 28 times têm 14 jogos por rodada, com 20 times têm 10 jogos
        entry.gameCount += 14; // estimativa conservadora
      }

      return Array.from(phaseMap.values()).map(p => ({
        phaseKey: p.phaseKey,
        phaseName: p.phaseName,
        roundCount: p.roundCount,
        rounds: p.rounds,
        estimatedGames: p.gameCount,
      }));
    }),

  /**
   * Importa uma liga da API-Football como um único campeonato global no Plakr.
   * Aceita selectedPhases (array de {phaseKey, rounds}) para importar fases específicas.
   * Todas as fases selecionadas são importadas para o MESMO campeonato — um campeonato = um torneio.
   * Se selectedPhases não for informado, importa todos os rounds (comportamento legado).
   */
  importLeagueFromApi: adminProcedure
    .input(z.object({
      leagueId: z.number(),
      name: z.string(),
      country: z.string().optional(),
      logoUrl: z.string().optional(),
      season: z.number(),
      makeAvailable: z.boolean().default(true),
      // Novo: array de fases selecionadas (todas vão para o mesmo torneio)
      selectedPhases: z.array(z.object({
        phaseKey: z.string(),
        rounds: z.array(z.string()),
      })).optional(),
      // Legado (mantido para compatibilidade): phaseKey e phaseRounds únicos
      phaseKey: z.string().optional(),
      phaseRounds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");

      // Verificar se já existe campeonato com esse leagueId (sem distinção de fase)
      // No novo modelo, um campeonato = um torneio (independente de quantas fases)
      const existingAll = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.apiFootballLeagueId, input.leagueId));

      // Verificar duplicata: existe torneio com mesmo leagueId + season?
      const existing = existingAll.filter(
        t => (t as any).apiFootballSeason === input.season
      );

      if (existing.length > 0) {
        await db
          .update(tournaments)
          .set({ isAvailable: input.makeAvailable })
          .where(eq(tournaments.id, existing[0].id));
        return { created: false, tournamentId: existing[0].id, message: "Campeonato já existe — disponibilidade atualizada" };
      }

      // Cria novo campeonato global (nome simples, sem sufixo de fase)
      const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.season}`;

      // Determinar formato usando utilitário centralizado
      // Usa os phaseKeys selecionados como proxy de rounds para inferência
      const selectedPhaseKeys = input.selectedPhases?.map(p => p.phaseKey) ?? [];
      const format = inferTournamentFormatFromPhases(selectedPhaseKeys, input.leagueId);

      const result = await db.insert(tournaments).values({
        name: input.name,
        slug,
        logoUrl: input.logoUrl ?? null,
        isGlobal: true,
        createdBy: ctx.user.id,
        status: "active",
        country: input.country?.slice(0, 10) ?? null,
        season: String(input.season),
        format,
        isAvailable: input.makeAvailable,
        apiFootballLeagueId: input.leagueId,
        apiFootballSeason: input.season,
        apiFootballPhaseKey: null, // Não mais usado — torneio único por campeonato
      });
      const tournamentId = (result[0] as any).insertId;

      // Consolidar todos os rounds das fases selecionadas em uma única lista
      // Legado: se selectedPhases não fornecido, usar phaseRounds direto
      let allRoundsToSync: string[] | undefined;
      if (input.selectedPhases && input.selectedPhases.length > 0) {
        allRoundsToSync = input.selectedPhases.flatMap(p => p.rounds);
      } else if (input.phaseRounds && input.phaseRounds.length > 0) {
        allRoundsToSync = input.phaseRounds;
      }
      // Se nenhum round especificado, syncFixturesForTournament importa tudo

      // Disparar sync automático de times e fixtures em background
      setImmediate(async () => {
        try {
          const teamsResult = await syncTeamsForTournament({
            tournamentId,
            leagueId: input.leagueId,
            season: input.season,
            triggeredByUserId: ctx.user.id,
          });
          logger.info(
            `[ImportLeague] Times sincronizados: created=${teamsResult.teamsCreated} updated=${teamsResult.teamsUpdated} req=${teamsResult.requestsUsed}`
          );
        } catch (err) {
          logger.error({ err }, "[ImportLeague] Erro ao sincronizar times");
        }

        try {
          const fixturesResult = await syncFixturesForTournament({
            tournamentId,
            leagueId: input.leagueId,
            season: input.season,
            triggeredBy: "manual",
            triggeredByUserId: ctx.user.id,
            phaseRounds: allRoundsToSync,
          });
          logger.info(
            `[ImportLeague] Fixtures sincronizados: created=${fixturesResult.gamesCreated} updated=${fixturesResult.gamesUpdated} req=${fixturesResult.requestsUsed}`
          );
        } catch (err) {
          logger.error({ err }, "[ImportLeague] Erro ao sincronizar fixtures");
        }
      });

      const phaseNames = input.selectedPhases?.map(p => phaseKeyToName(p.phaseKey)).join(", ") ?? "todas as fases";
      return {
        created: true,
        tournamentId,
        message: `Campeonato importado com sucesso (${phaseNames}) — times e jogos sendo sincronizados em background`,
      };
    }),

  /**
   * Importa múltiplas ligas da API-Football de uma vez (importação em lote).
   * Para cada liga: busca os rounds disponíveis e importa todas as fases automaticamente.
   * Consome 1 requisição por liga (para buscar rounds) + sync em background.
   */
  importLeaguesBatch: adminProcedure
    .input(z.object({
      leagues: z.array(z.object({
        leagueId: z.number(),
        name: z.string(),
        country: z.string().optional(),
        logoUrl: z.string().optional(),
        season: z.number(),
      })),
      makeAvailable: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");

      const results: Array<{
        leagueId: number;
        name: string;
        status: "imported" | "already_exists" | "error";
        message: string;
        tournamentId?: number;
      }> = [];

      for (const league of input.leagues) {
        try {
          // Verificar se já existe
          const existingAll = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.apiFootballLeagueId, league.leagueId));
          const existing = existingAll.filter(
            t => (t as any).apiFootballSeason === league.season
          );

          if (existing.length > 0) {
            await db
              .update(tournaments)
              .set({ isAvailable: input.makeAvailable })
              .where(eq(tournaments.id, existing[0].id));
            results.push({
              leagueId: league.leagueId,
              name: league.name,
              status: "already_exists",
              message: "Já importado — disponibilidade atualizada",
              tournamentId: existing[0].id,
            });
            continue;
          }

          // Buscar rounds disponíveis para determinar formato
          const roundsData = await apiFootballRequest(
            `/fixtures/rounds`,
            { league: league.leagueId, season: league.season }
          );
          const rounds: string[] = (roundsData?.response ?? []) as unknown as string[];

          // Determinar formato usando utilitário centralizado com rounds reais da API
          const format = inferTournamentFormat(rounds, league.leagueId);

          const slug = `${league.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${league.season}`;

          const result = await db.insert(tournaments).values({
            name: league.name,
            slug,
            logoUrl: league.logoUrl ?? null,
            isGlobal: true,
            createdBy: ctx.user.id,
            status: "active",
            country: league.country?.slice(0, 10) ?? null,
            season: String(league.season),
            format,
            isAvailable: input.makeAvailable,
            apiFootballLeagueId: league.leagueId,
            apiFootballSeason: league.season,
            apiFootballPhaseKey: null,
          });
          const tournamentId = (result[0] as any).insertId;

          // Disparar sync em background (não bloqueia a resposta)
          const leagueCopy = { ...league };
          setImmediate(async () => {
            try {
              await syncTeamsForTournament({
                tournamentId,
                leagueId: leagueCopy.leagueId,
                season: leagueCopy.season,
                triggeredByUserId: ctx.user.id,
              });
            } catch (err) {
              logger.error({ err }, `[BatchImport] Erro ao sincronizar times: ${leagueCopy.name}`);
            }
            try {
              await syncFixturesForTournament({
                tournamentId,
                leagueId: leagueCopy.leagueId,
                season: leagueCopy.season,
                triggeredBy: "manual",
                triggeredByUserId: ctx.user.id,
              });
            } catch (err) {
              logger.error({ err }, `[BatchImport] Erro ao sincronizar fixtures: ${leagueCopy.name}`);
            }
          });

          results.push({
            leagueId: league.leagueId,
            name: league.name,
            status: "imported",
            message: "Importado — times e jogos sendo sincronizados em background",
            tournamentId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error({ err }, `[BatchImport] Erro ao importar ${league.name}: ${msg}`);
          results.push({
            leagueId: league.leagueId,
            name: league.name,
            status: "error",
            message: `Erro: ${msg}`,
          });
        }
      }

      const imported = results.filter(r => r.status === "imported").length;
      const alreadyExists = results.filter(r => r.status === "already_exists").length;
      const errors = results.filter(r => r.status === "error").length;

      logger.info(
        `[BatchImport] Admin ${ctx.user.id} importou ${imported} ligas, ${alreadyExists} já existiam, ${errors} erros`
      );

      return { results, imported, alreadyExists, errors };
    }),

  /**
   * Re-sincroniza times e fixtures de um campeonato específico.
   * Útil para atualizar campeonatos já importados.
   * Consome 2 requisições da quota.
   */
  manualSyncTournament: adminProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);

      if (!tournament) throw Err.notFound("Campeonato");
      if (!tournament.apiFootballLeagueId || !tournament.apiFootballSeason) {
        throw Err.badRequest("Este campeonato não possui vínculo com a API-Football");
      }

      const leagueId = tournament.apiFootballLeagueId;
      const season = tournament.apiFootballSeason;

      // Sincronizar times
      const teamsResult = await syncTeamsForTournament({
        tournamentId: input.tournamentId,
        leagueId,
        season,
        triggeredByUserId: ctx.user.id,
      });

      // Sincronizar fixtures
      const fixturesResult = await syncFixturesForTournament({
        tournamentId: input.tournamentId,
        leagueId,
        season,
        triggeredBy: "manual",
        triggeredByUserId: ctx.user.id,
      });

      return {
        success: true,
        teamsCreated: teamsResult.teamsCreated,
        teamsUpdated: teamsResult.teamsUpdated,
        gamesCreated: fixturesResult.gamesCreated,
        gamesUpdated: fixturesResult.gamesUpdated,
        requestsUsed: teamsResult.requestsUsed + fixturesResult.requestsUsed,
        teamsError: teamsResult.error,
        fixturesError: fixturesResult.error,
      };
      }),

  /**
   * Retorna quantos jogos finalizados estão sem estatísticas (precisam de backfill)
   * e quantos estão sem aiSummary (precisam de backfill de IA).
   */
  getBackfillStatus: adminProcedure.query(async () => {
    const [pendingCount, aiSummaryPendingCount] = await Promise.all([
      getBackfillPendingCount(),
      getAiSummaryPendingCount(),
    ]);
    return { pendingCount, aiSummaryPendingCount };
  }),

  /**
   * Gera aiSummary/aiNarration para jogos finalizados que já têm estatísticas
   * mas ainda não têm resumo de IA. Processa até 50 jogos por execução.
   */
  backfillAiSummaries: adminProcedure
    .input(z.object({ batchSize: z.number().min(1).max(200).default(50) }))
    .mutation(async ({ input, ctx }) => {
      logger.info(`[BackfillAiSummary] Admin ${ctx.user.id} triggered (batchSize=${input.batchSize})`);
      const result = await backfillAiSummaries({ batchSize: input.batchSize });
      return result;
    }),

  /**
   * Recalcula o formato de todos os torneios importados via API-Football.
   * Para cada torneio: consulta os rounds na API e aplica a lógica centralizada
   * de inferência de formato. Corrige torneios com formato errado (ex: league → groups_knockout).
   * Consome 1 requisição por torneio.
   */
  recalcularFormatos: adminProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");

      // Buscar todos os torneios vinculados à API-Football
      const allTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.isGlobal, true));

      const apiLinked = allTournaments.filter(
        t => t.apiFootballLeagueId !== null && t.apiFootballSeason !== null
      );

      logger.info(`[RecalcFormatos] Admin ${ctx.user.id} iniciou recalculo de ${apiLinked.length} torneios`);

      const results: Array<{
        id: number;
        name: string;
        oldFormat: string;
        newFormat: string;
        changed: boolean;
        source: "known_id" | "api_rounds" | "db_phases";
      }> = [];

      for (const t of apiLinked) {
        const leagueId = t.apiFootballLeagueId!;
        const season = t.apiFootballSeason!;
        const oldFormat = t.format ?? "league";

        try {
          // Tentar buscar rounds da API para inferência mais precisa
          let newFormat: "league" | "cup" | "groups_knockout";
          let source: "known_id" | "api_rounds" | "db_phases";

          // Estratégia em 3 níveis:
          // 1. ID conhecido → override direto (mais confiável)
          // 2. Rounds da API → inferência dinâmica
          // 3. Fases dos jogos no banco → fallback sem API
          const knownFormat = inferTournamentFormat([], leagueId);
          // inferTournamentFormat com rounds=[] só retorna não-league se o leagueId está na lista conhecida
          if (knownFormat !== "league") {
            newFormat = knownFormat;
            source = "known_id";
          } else {
            // Tentar buscar rounds da API
            let apiRounds: string[] = [];
            try {
              const roundsData = await apiFootballRequest(
                `/fixtures/rounds`,
                { league: leagueId, season }
              );
              apiRounds = (roundsData?.response ?? []) as unknown as string[];
            } catch {
              // API indisponível, continuar com fallback
            }

            if (apiRounds.length > 0) {
              newFormat = inferTournamentFormat(apiRounds, leagueId);
              source = "api_rounds";
            } else {
              // Fallback: usar fases dos jogos já importados
              const gameRows = await db
                .select({ phase: gamesTable.phase })
                .from(gamesTable)
                .where(eq(gamesTable.tournamentId, t.id));
              const phases = [...new Set(gameRows.map(g => g.phase).filter(Boolean))] as string[];
              newFormat = inferTournamentFormatFromPhases(phases, leagueId);
              source = "db_phases";
            }
          }

          const changed = newFormat !== oldFormat;
          if (changed) {
            await db
              .update(tournaments)
              .set({ format: newFormat })
              .where(eq(tournaments.id, t.id));
            logger.info(`[RecalcFormatos] ${t.name}: ${oldFormat} → ${newFormat} (source=${source})`);
          }

          results.push({ id: t.id, name: t.name, oldFormat, newFormat, changed, source });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error({ err }, `[RecalcFormatos] Erro em ${t.name}: ${msg}`);
          results.push({ id: t.id, name: t.name, oldFormat, newFormat: oldFormat, changed: false, source: "db_phases" });
        }
      }

      const changed = results.filter(r => r.changed).length;
      logger.info(`[RecalcFormatos] Concluído: ${changed} torneios atualizados de ${apiLinked.length}`);

      return { results, changed, total: apiLinked.length };
    }),

  /**
   * Reprocessa jogos finalizados sem estatísticas/análises de IA.
   * Busca eventos e estatísticas da API-Football e gera textos de IA.
   * Processa até 50 jogos por execução para não exceder a quota.
   */
  backfillGameData: adminProcedure
    .input(z.object({ batchSize: z.number().min(1).max(500).default(100) }))
    .mutation(async ({ input, ctx }) => {
      logger.info(`[Backfill] Admin ${ctx.user.id} triggered backfill (batchSize=${input.batchSize})`);
      const result = await backfillGameData({
        batchSize: input.batchSize,
        triggeredByUserId: ctx.user.id,
      });
      return result;
    }),

  /**
   * Backfill de forma recente dos times (últimos 5 jogos) para jogos não finalizados
   * que têm homeForm/awayForm vazio no aiPrediction.
   */
  backfillTeamForm: adminProcedure
    .input(z.object({ batchSize: z.number().min(1).max(200).default(50) }))
    .mutation(async ({ input, ctx }) => {
      logger.info(`[BackfillForm] Admin ${ctx.user.id} triggered team form backfill (batchSize=${input.batchSize})`);
      const result = await backfillTeamForm({ batchSize: input.batchSize });
      return result;
    }),

  getTeamFormPendingCount: adminProcedure
    .query(async () => {
      return { count: await getTeamFormPendingCount() };
    }),

  /**
   * Gera aiPrediction para todos os jogos futuros que ainda não têm análise pré-jogo.
   * Processa em lotes para não sobrecarregar a API de IA.
   */
  backfillAiPredictions: adminProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      if (aiBackfillJob.status === "running") {
        return { started: false, message: "Já existe um processamento em andamento" };
      }

      const db = await getDb();
      if (!db) throw Err.internal("DB unavailable");

      const now = new Date();

      // Seleciona jogos agendados que:
      // (a) não têm aiPrediction, OU
      // (b) têm aiPrediction mas sem comparison (dados genéricos — regenerar)
      const pendingGames = await db
        .select({
          id: gamesTable.id,
          externalId: gamesTable.externalId,
          teamAName: gamesTable.teamAName,
          teamBName: gamesTable.teamBName,
          matchDate: gamesTable.matchDate,
          tournamentId: gamesTable.tournamentId,
        })
        .from(gamesTable)
        .where(
          and(
            sql`${gamesTable.status} = 'scheduled'`,
            sql`${gamesTable.matchDate} > ${now}`,
            sql`${gamesTable.externalId} IS NOT NULL`,
            sql`(${gamesTable.aiPrediction} IS NULL OR JSON_EXTRACT(${gamesTable.aiPrediction}, '$.comparison') IS NULL)`,
          )
        );

      if (pendingGames.length === 0) {
        aiBackfillJob.status = "done";
        aiBackfillJob.total = 0;
        aiBackfillJob.processed = 0;
        aiBackfillJob.errors = 0;
        aiBackfillJob.message = "Nenhum jogo pendente encontrado";
        return { started: false, message: "Nenhum jogo pendente encontrado" };
      }

      // Inicializar estado do job
      aiBackfillJob.status = "running";
      aiBackfillJob.total = pendingGames.length;
      aiBackfillJob.processed = 0;
      aiBackfillJob.errors = 0;
      aiBackfillJob.startedAt = new Date();
      aiBackfillJob.finishedAt = null;
      aiBackfillJob.message = `Processando 0 de ${pendingGames.length} jogos...`;

      logger.info(`[BackfillAI] Admin ${ctx.user.id} iniciou backfill de ${pendingGames.length} jogos`);

      // Buscar nomes dos torneios para contexto
      const tournamentIds = [...new Set(pendingGames.map(g => g.tournamentId))];
      const tournamentRows = await db
        .select({ id: tournaments.id, name: tournaments.name })
        .from(tournaments)
        .where(sql`${tournaments.id} IN (${sql.join(tournamentIds.map(id => sql`${id}`), sql`, `)})`);
      const tournamentMap = Object.fromEntries(tournamentRows.map(t => [t.id, t.name]));

      // Processar em background (não aguarda)
      (async () => {
        for (const game of pendingGames) {
          try {
            const fixtureId = game.externalId ? parseInt(game.externalId) : null;
            let apiPercent: { home: number; draw: number; away: number } | null = null;
            let apiAdvice: string | null = null;

            let apiComparison: Parameters<typeof buildAiPrediction>[0]["apiComparison"] = null;
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

            const prediction = await buildAiPrediction({
              homeTeam: game.teamAName ?? "Time A",
              awayTeam: game.teamBName ?? "Time B",
              competition: tournamentMap[game.tournamentId] ?? "Campeonato",
              matchDate: game.matchDate?.toISOString() ?? new Date().toISOString(),
              apiPercent,
              apiAdvice,
              apiComparison,
            });

            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.update(gamesTable).set({ aiPrediction: prediction }).where(sql`${gamesTable.id} = ${game.id}`);
            }
            aiBackfillJob.processed++;
            aiBackfillJob.message = `Processando ${aiBackfillJob.processed} de ${aiBackfillJob.total} jogos...`;
            logger.info(`[BackfillAI] ${game.teamAName} × ${game.teamBName} — OK (${aiBackfillJob.processed}/${aiBackfillJob.total})`);
          } catch (err) {
            aiBackfillJob.errors++;
            logger.error({ err }, `[BackfillAI] Erro no jogo ${game.id}`);
          }
        }
        aiBackfillJob.status = "done";
        aiBackfillJob.finishedAt = new Date();
        aiBackfillJob.message = `Concluído: ${aiBackfillJob.processed} análises geradas, ${aiBackfillJob.errors} erros`;
        logger.info(`[BackfillAI] Job finalizado — ${aiBackfillJob.processed}/${aiBackfillJob.total} processados`);
      })().catch(err => {
        aiBackfillJob.status = "error";
        aiBackfillJob.message = `Erro inesperado: ${err?.message ?? "desconhecido"}`;
        logger.error({ err }, "[BackfillAI] Erro fatal no job de background");
      });

      return { started: true, message: `Iniciado: ${pendingGames.length} jogos serão processados em background` };
    }),

  getAiBackfillProgress: adminProcedure
    .input(z.object({}))
    .query(() => {
      return { ...aiBackfillJob };
    }),

  getAiPendingCount: adminProcedure
    .input(z.object({}))
    .query(async () => {
      const db = await getDb();
      if (!db) return { count: 0 };
      const now = new Date();
      const rows = await db
        .select({ id: gamesTable.id })
        .from(gamesTable)
        .where(
          and(
            isNull(gamesTable.aiPrediction),
            sql`${gamesTable.status} = 'scheduled'`,
            sql`${gamesTable.matchDate} > ${now}`
          )
        );
      return { count: rows.length };
    }),

  // ─── Regenerar TODAS as análises de palpite (sobrescreve registros existentes) ─
  regenerateAllBetAnalyses: adminProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db) return { started: false, message: "DB indisponível" };

      const { gameBetAnalyses } = await import("../../drizzle/schema");
      const { generateBetAnalysis } = await import("../api-football/ai-analysis");

      // Busca TODOS os palpites de jogos finalizados (com ou sem análise existente)
      const allBets = await db.execute(sql`
        SELECT b.id, b.gameId, b.userId, b.poolId,
               b.predictedScoreA, b.predictedScoreB,
               b.pointsEarned, b.resultType,
               g.teamAName, g.teamBName, g.scoreA, g.scoreB
        FROM bets b
        JOIN games g ON b.gameId = g.id
        WHERE g.status = 'finished'
        AND g.scoreA IS NOT NULL
        LIMIT 500
      `) as any;

      const rows = (allBets[0] ?? []) as Array<{
        id: number; gameId: number; userId: number; poolId: number;
        predictedScoreA: number; predictedScoreB: number;
        pointsEarned: number; resultType: string;
        teamAName: string; teamBName: string; scoreA: number; scoreB: number;
      }>;

      if (rows.length === 0) return { started: false, message: "Nenhum palpite encontrado" };

      logger.info(`[RegenerateAllBetAnalyses] Iniciando regeneração de ${rows.length} análises...`);

      (async () => {
        let done = 0;
        const dbBg = await getDb();
        if (!dbBg) return;
        for (const row of rows) {
          try {
            // Busca contexto comparativo do bolão para esse jogo
            const ctxResult = await dbBg.execute(sql`
              SELECT
                COUNT(*) as totalBets,
                SUM(CASE WHEN predictedScoreA = ${row.scoreA} AND predictedScoreB = ${row.scoreB} THEN 1 ELSE 0 END) as exactCount,
                SUM(CASE WHEN
                  (predictedScoreA > predictedScoreB AND ${row.scoreA} > ${row.scoreB}) OR
                  (predictedScoreA < predictedScoreB AND ${row.scoreA} < ${row.scoreB}) OR
                  (predictedScoreA = predictedScoreB AND ${row.scoreA} = ${row.scoreB})
                THEN 1 ELSE 0 END) as correctCount
              FROM bets
              WHERE gameId = ${row.gameId} AND poolId = ${row.poolId}
            `) as any;
            const ctxRow = (ctxResult[0]?.[0]) as { totalBets: number; exactCount: number; correctCount: number } | undefined;

            const rankResult = await dbBg.execute(sql`
              SELECT \`rank\`, totalMembers FROM pool_member_stats
              WHERE poolId = ${row.poolId} AND userId = ${row.userId}
            `) as any;
            const rankRow = (rankResult[0]?.[0]) as { rank: number; totalMembers: number } | undefined;

            const poolContext = ctxRow ? {
              totalParticipants: rankRow?.totalMembers ?? Number(ctxRow.totalBets),
              exactCount: Number(ctxRow.exactCount),
              correctCount: Number(ctxRow.correctCount),
              totalBets: Number(ctxRow.totalBets),
              userRank: rankRow?.rank ?? 0,
            } : null;

            const analysisText = await generateBetAnalysis({
              homeTeam: row.teamAName ?? "Casa",
              awayTeam: row.teamBName ?? "Visitante",
              scoreA: row.scoreA,
              scoreB: row.scoreB,
              predictedA: row.predictedScoreA ?? 0,
              predictedB: row.predictedScoreB ?? 0,
              resultType: (row.resultType as "exact" | "correct_result" | "wrong") ?? "wrong",
              totalPoints: row.pointsEarned ?? 0,
              isZebra: false,
              poolContext,
            });
            await dbBg.insert(gameBetAnalyses).values({
              gameId: row.gameId,
              userId: row.userId,
              poolId: row.poolId,
              analysisText,
            }).onDuplicateKeyUpdate({ set: { analysisText } });
            done++;
            if (done % 10 === 0) {
              logger.info(`[RegenerateAllBetAnalyses] Progresso: ${done}/${rows.length}`);
            }
          } catch (err) {
            logger.error({ err }, `[RegenerateAllBetAnalyses] Erro no bet ${row.id}`);
          }
        }
        logger.info(`[RegenerateAllBetAnalyses] Concluído: ${done}/${rows.length} análises regeneradas`);
      })().catch(err => logger.error({ err }, "[RegenerateAllBetAnalyses] Erro fatal"));

      return { started: true, message: `Iniciado: ${rows.length} análises serão regeneradas em background` };
    }),

  // ─── Backfill de análise de palpite (game_bet_analyses) ────────────────────
  backfillBetAnalyses: adminProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db) return { started: false, message: "DB indisponível" };

      const { gameBetAnalyses } = await import("../../drizzle/schema");
      const { generateBetAnalysis } = await import("../api-football/ai-analysis");

      const pending = await db.execute(sql`
        SELECT b.id, b.gameId, b.userId, b.poolId,
               b.predictedScoreA, b.predictedScoreB,
               b.pointsEarned, b.resultType,
               g.teamAName, g.teamBName, g.scoreA, g.scoreB
        FROM bets b
        JOIN games g ON b.gameId = g.id
        WHERE g.status = 'finished'
        AND g.scoreA IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM game_bet_analyses gba
          WHERE gba.gameId = b.gameId AND gba.userId = b.userId AND gba.poolId = b.poolId
        )
        LIMIT 100
      `) as any;

      const rows = (pending[0] ?? []) as Array<{
        id: number; gameId: number; userId: number; poolId: number;
        predictedScoreA: number; predictedScoreB: number;
        pointsEarned: number; resultType: string;
        teamAName: string; teamBName: string; scoreA: number; scoreB: number;
      }>;

      if (rows.length === 0) return { started: false, message: "Nenhum palpite pendente" };

      (async () => {
        for (const row of rows) {
          try {
            const analysisText = await generateBetAnalysis({
              homeTeam: row.teamAName ?? "Casa",
              awayTeam: row.teamBName ?? "Visitante",
              scoreA: row.scoreA,
              scoreB: row.scoreB,
              predictedA: row.predictedScoreA ?? 0,
              predictedB: row.predictedScoreB ?? 0,
              resultType: (row.resultType as "exact" | "correct_result" | "wrong") ?? "wrong",
              totalPoints: row.pointsEarned ?? 0,
              isZebra: false,
              poolContext: null,
            });
            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.insert(gameBetAnalyses).values({
                gameId: row.gameId,
                userId: row.userId,
                poolId: row.poolId,
                analysisText,
              }).onDuplicateKeyUpdate({ set: { analysisText } });
            }
            logger.info(`[BetAnalysisBackfill] Gerado para bet ${row.id} (jogo ${row.gameId}, user ${row.userId})`);
          } catch (err) {
            logger.error({ err }, `[BetAnalysisBackfill] Erro no bet ${row.id}`);
          }
        }
        logger.info(`[BetAnalysisBackfill] Concluído: ${rows.length} análises geradas`);
      })().catch(err => logger.error({ err }, "[BetAnalysisBackfill] Erro fatal"));

      return { started: true, message: `Iniciado: ${rows.length} análises serão geradas em background` };
    }),
});
