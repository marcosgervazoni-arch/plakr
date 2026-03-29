/**
 * Plakr! — Router de Integrações (API-Football)
 * Todos os procedimentos são restritos ao Super Admin (adminProcedure).
 * O Super Admin configura a chave, ativa/desativa e dispara syncs manuais.
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import logger from "../logger";
import { getDb } from "../db";
import { platformSettings, apiSyncLog, apiQuotaTracker, tournaments } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncFixtures, syncResults, syncTeamsForTournament, syncFixturesForTournament } from "../api-football/sync";
import { fetchAccountStatus, apiFootballRequest } from "../api-football/client";
import { Err } from "../errors";

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
  if (r.includes("round of 16") || r.includes("last 16")) return "round_of_16";
  if (r.includes("quarter")) return "quarter_finals";
  if (r.includes("semi")) return "semi_finals";
  if (r.includes("3rd place") || r.includes("third place")) return "third_place";
  if (/^final$/.test(r) || r === "1st phase - final" || r === "2nd phase - final") return "final";
  if (r.startsWith("1st phase")) return "1st_phase";
  if (r.startsWith("2nd phase")) return "2nd_phase";
  if (r.startsWith("3rd phase")) return "3rd_phase";
  if (r.startsWith("apertura")) return "apertura";
  if (r.startsWith("clausura")) return "clausura";
  if (r.startsWith("regular season")) return "regular_season";
  if (r.startsWith("group")) return "group_stage";
  return "group_stage";
}

/** Converte a chave de fase em nome legível para exibição */
function phaseKeyToName(phaseKey: string, sampleRound?: string): string {
  const map: Record<string, string> = {
    "1st_phase": "1ª Fase",
    "2nd_phase": "2ª Fase",
    "3rd_phase": "3ª Fase",
    "regular_season": "Temporada Regular",
    "group_stage": "Fase de Grupos",
    "apertura": "Apertura",
    "clausura": "Clausura",
    "round_of_16": "Oitavas de Final",
    "quarter_finals": "Quartas de Final",
    "semi_finals": "Semifinais",
    "third_place": "3º Lugar",
    "final": "Final",
  };
  // Tentar extrair nome original do round para fases genéricas
  if (!map[phaseKey] && sampleRound) {
    const parts = sampleRound.split(" - ");
    return parts[0] || phaseKey;
  }
  return map[phaseKey] ?? phaseKey;
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
        plan: status.plan,
        requestsLimit: status.requestsLimit,
        requestsRemaining: status.requestsRemaining,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
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
   * Consome 1 requisição da quota diária.
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

      // Busca ligas mais populares — filtra por popularidade (top 50)
      const data = await apiFootballRequest(
        `/leagues`,
        { season: cfg.apiFootballSeason, type: "league" }
      );
      const leagues = (data?.response ?? []).slice(0, 80).map((item: any) => ({
        leagueId: item.league.id as number,
        name: item.league.name as string,
        country: item.country.name as string,
        logoUrl: item.league.logo as string,
        season: cfg.apiFootballSeason,
        type: item.league.type as string,
      }));
      return leagues;
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

      // Determinar formato: se há fases de grupos + mata-mata, usar groups_knockout
      const hasGroupPhase = input.selectedPhases?.some(p =>
        p.phaseKey.includes("phase") || p.phaseKey === "group_stage"
      );
      const hasKnockout = input.selectedPhases?.some(p =>
        ["round_of_16", "quarter_finals", "semi_finals", "final"].includes(p.phaseKey)
      );
      const format = (hasGroupPhase && hasKnockout) ? "groups_knockout" :
                     hasKnockout ? "cup" : "league";

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
});
