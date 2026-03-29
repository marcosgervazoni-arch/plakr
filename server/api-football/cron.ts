/**
 * API-Football Cron Jobs
 * ─────────────────────────────────────────────────────────────────────────────
 * Registra dois jobs de sincronização automática:
 *
 *  1. syncFixtures — 2x por dia (06:00 e 18:00 UTC)
 *     Busca jogos agendados dos próximos 14 dias.
 *     Consome ~1 requisição por execução.
 *
 *  2. syncResults — A cada 2 horas
 *     Busca resultados finais (FT) dos jogos do dia.
 *     Aplica pontuação nos bolões afetados.
 *     Consome ~1 requisição por execução.
 *
 * Ambos os jobs verificam se a integração está habilitada antes de executar.
 * O controle é feito pelo Super Admin em Admin → Integrações.
 */

import logger from "../logger";
import { syncFixtures, syncResults } from "./sync";

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

// ─── Registro dos cron jobs ───────────────────────────────────────────────────

export function registerApiFootballCronJobs() {
  // Job 1: Sincronizar fixtures 2x por dia (06:00 e 18:00 UTC)
  scheduleDaily([6, 18], "syncFixtures", async () => {
    const result = await syncFixtures({ triggeredBy: "cron" });
    logger.info(
      `[ApiFootball][Cron] syncFixtures completed: created=${result.gamesCreated} updated=${result.gamesUpdated} req=${result.requestsUsed}`
    );
  });

  // Job 2: Sincronizar resultados a cada 2 horas
  scheduleInterval(2 * 60 * 60 * 1000, "syncResults", async () => {
    const result = await syncResults({ triggeredBy: "cron" });
    logger.info(
      `[ApiFootball][Cron] syncResults completed: applied=${result.resultsApplied} req=${result.requestsUsed}`
    );
  });

  logger.info("[ApiFootball][Cron] All API-Football cron jobs registered ✓");
}
