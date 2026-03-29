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
   * Importa uma liga da API-Football como campeonato global no Plakr.
   */
  importLeagueFromApi: adminProcedure
    .input(z.object({
      leagueId: z.number(),
      name: z.string(),
      country: z.string().optional(),
      logoUrl: z.string().optional(),
      season: z.number(),
      makeAvailable: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw Err.internal("DB não disponível");

      // Verifica se já existe campeonato com esse leagueId
      const existing = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.apiFootballLeagueId, input.leagueId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(tournaments)
          .set({ isAvailable: input.makeAvailable })
          .where(eq(tournaments.id, existing[0].id));
        return { created: false, tournamentId: existing[0].id, message: "Campeonato já existe — disponibilidade atualizada" };
      }

      // Cria novo campeonato global
      const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.season}`;
      const result = await db.insert(tournaments).values({
        name: input.name,
        slug,
        logoUrl: input.logoUrl ?? null,
        isGlobal: true,
        createdBy: ctx.user.id,
        status: "active",
        country: input.country?.slice(0, 10) ?? null,
        season: String(input.season),
        format: "groups_knockout",
        isAvailable: input.makeAvailable,
        apiFootballLeagueId: input.leagueId,
        apiFootballSeason: input.season,
      });
      const tournamentId = (result[0] as any).insertId;

      // Disparar sync automático de times e fixtures em background
      // Usamos setImmediate para não bloquear a resposta HTTP
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
          });
          logger.info(
            `[ImportLeague] Fixtures sincronizados: created=${fixturesResult.gamesCreated} updated=${fixturesResult.gamesUpdated} req=${fixturesResult.requestsUsed}`
          );
        } catch (err) {
          logger.error({ err }, "[ImportLeague] Erro ao sincronizar fixtures");
        }
      });

      return {
        created: true,
        tournamentId,
        message: "Campeonato importado com sucesso — times e jogos sendo sincronizados em background (pode levar alguns segundos)",
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
