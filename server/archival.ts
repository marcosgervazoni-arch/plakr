/**
 * Serviço de Arquivamento Automático — ApostAI
 * Executa exclusão automática de bolões encerrados há mais de 10 dias.
 * Roda como cron job a cada hora.
 */

import { getDb } from "./db";
import { pools, poolMembers, bets, poolMemberStats, notifications, poolScoringRules } from "../drizzle/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { createNotification, getPoolMembers, getPlatformSettings } from "./db";

export async function runArchivalJob() {
  const db = await getDb();
  if (!db) {
    console.warn("[Archival] Database not available");
    return;
  }

  const settings = await getPlatformSettings();
  const archiveDays = settings?.poolArchiveDays ?? 10;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - archiveDays);

  // Buscar bolões encerrados há mais de N dias
  const duePools = await db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.status, "finished"),
        lt(pools.updatedAt, cutoffDate)
      )
    );

  if (duePools.length === 0) {
    console.log("[Archival] No pools due for deletion");
    return;
  }

  console.log(`[Archival] Found ${duePools.length} pools to archive`);

  for (const pool of duePools) {
    try {
      // Notificar membros antes de excluir
      const members = await getPoolMembers(pool.id);
      for (const { member } of members) {
        await createNotification({
          userId: member.userId,
          poolId: pool.id,
          type: "pool_closing",
          title: `Bolão "${pool.name}" encerrado`,
          message: `O bolão "${pool.name}" foi encerrado e seus dados foram arquivados após ${archiveDays} dias.`,
        });
      }

      // Anonimizar e arquivar (soft delete — muda status para "archived")
      await db.update(pools).set({ status: "archived" }).where(eq(pools.id, pool.id));

      console.log(`[Archival] Archived pool ${pool.id}: "${pool.name}"`);
    } catch (err) {
      console.error(`[Archival] Failed to archive pool ${pool.id}:`, err);
    }
  }
}

// Cron runner (chama a cada hora se Redis disponível, ou pode ser chamado manualmente)
let archivalInterval: NodeJS.Timeout | null = null;

export function startArchivalCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

  archivalInterval = setInterval(async () => {
    try {
      await runArchivalJob();
    } catch (err) {
      console.error("[Archival] Cron error:", err);
    }
  }, INTERVAL_MS);

  console.log("[Archival] Cron started (interval: 1h)");

  // Rodar imediatamente ao iniciar
  runArchivalJob().catch(console.error);
}

export function stopArchivalCron() {
  if (archivalInterval) {
    clearInterval(archivalInterval);
    archivalInterval = null;
  }
}
