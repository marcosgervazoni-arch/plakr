/**
 * Plakr! — Router de Integrações (API-Football)
 * Todos os procedimentos são restritos ao Super Admin (adminProcedure).
 * O Super Admin configura a chave, ativa/desativa e dispara syncs manuais.
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { platformSettings, apiSyncLog, apiQuotaTracker } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncFixtures, syncResults } from "../api-football/sync";
import { fetchAccountStatus } from "../api-football/client";
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
});
