/**
 * ApostAI — Cron Jobs de E-mail
 * Gerencia o envio periódico de e-mails:
 * - Processamento da fila a cada 5 minutos
 * - Lembretes de palpite a cada 15 minutos
 * - Alertas de expiração de plano diariamente às 9h
 */
import { processEmailQueue, scheduleBetReminders, sendPlanExpiryWarnings } from "./email";

let emailQueueInterval: ReturnType<typeof setInterval> | null = null;
let betReminderInterval: ReturnType<typeof setInterval> | null = null;
let planExpiryInterval: ReturnType<typeof setInterval> | null = null;

export function startEmailCrons(): void {
  console.log("[EmailCron] Starting email cron jobs...");

  // Process email queue every 5 minutes
  emailQueueInterval = setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error("[EmailCron] Queue processing error:", err);
    }
  }, 5 * 60 * 1000);

  // Schedule bet reminders every 15 minutes
  betReminderInterval = setInterval(async () => {
    try {
      await scheduleBetReminders();
    } catch (err) {
      console.error("[EmailCron] Bet reminder error:", err);
    }
  }, 15 * 60 * 1000);

  // Plan expiry warnings: check daily at 9:00 AM
  // We use a 1-hour interval and check if it's close to 9 AM
  planExpiryInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    // Run between 9:00 and 9:59 AM
    if (hour === 9) {
      try {
        await sendPlanExpiryWarnings();
      } catch (err) {
        console.error("[EmailCron] Plan expiry warning error:", err);
      }
    }
  }, 60 * 60 * 1000);

  // Run queue processing immediately on startup to clear any backlog
  setTimeout(async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error("[EmailCron] Initial queue processing error:", err);
    }
  }, 10_000);

  console.log("[EmailCron] Email cron jobs started ✓");
}

export function stopEmailCrons(): void {
  if (emailQueueInterval) clearInterval(emailQueueInterval);
  if (betReminderInterval) clearInterval(betReminderInterval);
  if (planExpiryInterval) clearInterval(planExpiryInterval);
  console.log("[EmailCron] Email cron jobs stopped");
}
