/**
 * API-Football Cron Health Tracking
 * ─────────────────────────────────────────────────────────────────────────────
 * Mantém estado em memória de última execução, sucesso/falha e contagem
 * de cada job da API-Football. Exportado para o adminDashboard.getSystemHealth.
 */

export type CronJobHealth = {
  lastRunAt: Date | null;
  lastRunSuccess: boolean | null;
  lastError: string | null;
  runCount: number;
};

function makeHealth(): CronJobHealth {
  return {
    lastRunAt: null,
    lastRunSuccess: null,
    lastError: null,
    runCount: 0,
  };
}

export const apiFootballCronHealth = {
  syncFixtures: makeHealth(),
  syncResults: makeHealth(),
  syncTeams: makeHealth(),
  recalcularFormatos: makeHealth(),
  gerarAnalisesPrejogo: makeHealth(),
};

/**
 * Registra o início e resultado de uma execução de job.
 * Deve ser chamado no wrapper de cada job no cron.ts.
 */
export function recordJobRun(
  jobKey: keyof typeof apiFootballCronHealth,
  success: boolean,
  error?: string
) {
  const h = apiFootballCronHealth[jobKey];
  h.lastRunAt = new Date();
  h.lastRunSuccess = success;
  h.lastError = success ? null : (error ?? "Erro desconhecido");
  h.runCount++;
}
