/**
 * Plakr! — Cron Jobs de E-mail
 * Gerencia o envio periódico de e-mails:
 * - Processamento da fila a cada 5 minutos
 * - Lembretes de palpite a cada 15 minutos
 * - Alertas de expiração de plano diariamente às 9h
 */
import { processEmailQueue, scheduleBetReminders, sendPlanExpiryWarnings } from "./email";
import { logger } from "./logger";

let emailQueueInterval: ReturnType<typeof setInterval> | null = null;
let betReminderInterval: ReturnType<typeof setInterval> | null = null;
let planExpiryInterval: ReturnType<typeof setInterval> | null = null;

// [O3] Health tracking dos crons de email
export const emailCronHealth = {
  queue: { lastRunAt: null as Date | null, lastRunSuccess: null as boolean | null, lastError: null as string | null, runCount: 0 },
  betReminder: { lastRunAt: null as Date | null, lastRunSuccess: null as boolean | null, lastError: null as string | null, runCount: 0 },
  planExpiry: { lastRunAt: null as Date | null, lastRunSuccess: null as boolean | null, lastError: null as string | null, runCount: 0 },
};

export function startEmailCrons(): void {
  logger.info("[EmailCron] Starting email cron jobs...");

  // Process email queue every 5 minutes
  emailQueueInterval = setInterval(async () => {
    emailCronHealth.queue.runCount++;
    emailCronHealth.queue.lastRunAt = new Date();
    try {
      await processEmailQueue();
      emailCronHealth.queue.lastRunSuccess = true;
      emailCronHealth.queue.lastError = null;
    } catch (err) {
      emailCronHealth.queue.lastRunSuccess = false;
      emailCronHealth.queue.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "[EmailCron] Queue processing error");
    }
  }, 5 * 60 * 1000);

  // Schedule bet reminders every 15 minutes
  betReminderInterval = setInterval(async () => {
    emailCronHealth.betReminder.runCount++;
    emailCronHealth.betReminder.lastRunAt = new Date();
    try {
      await scheduleBetReminders();
      emailCronHealth.betReminder.lastRunSuccess = true;
      emailCronHealth.betReminder.lastError = null;
    } catch (err) {
      emailCronHealth.betReminder.lastRunSuccess = false;
      emailCronHealth.betReminder.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "[EmailCron] Bet reminder error");
    }
  }, 15 * 60 * 1000);

  // Plan expiry warnings: check daily at 9:00 AM
  planExpiryInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour === 9) {
      emailCronHealth.planExpiry.runCount++;
      emailCronHealth.planExpiry.lastRunAt = new Date();
      try {
        await sendPlanExpiryWarnings();
        emailCronHealth.planExpiry.lastRunSuccess = true;
        emailCronHealth.planExpiry.lastError = null;
      } catch (err) {
        emailCronHealth.planExpiry.lastRunSuccess = false;
        emailCronHealth.planExpiry.lastError = err instanceof Error ? err.message : String(err);
        logger.error({ err }, "[EmailCron] Plan expiry warning error");
      }
    }
  }, 60 * 60 * 1000);

  // Run queue processing immediately on startup to clear any backlog
  setTimeout(async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      logger.error({ err }, "[EmailCron] Initial queue processing error");
    }
  }, 10_000);

  logger.info("[EmailCron] Email cron jobs started ✓");
}

export function stopEmailCrons(): void {
  if (emailQueueInterval) clearInterval(emailQueueInterval);
  if (betReminderInterval) clearInterval(betReminderInterval);
  if (planExpiryInterval) clearInterval(planExpiryInterval);
  logger.info("[EmailCron] Email cron jobs stopped");
}
