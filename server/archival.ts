/**
 * Serviço de Arquivamento Automático — Plakr!
 *
 * Ciclo de vida do bolão:
 *   active → finished → awaiting_conclusion → concluded → archived
 *
 * Este cron (executa a cada hora):
 * 1. Bolões `finished` → move para `awaiting_conclusion` (todos os jogos apurados)
 * 2. Bolões `awaiting_conclusion` há +3 dias sem confirmação → auto-conclui e gera retrospectiva
 * 3. Bolões `concluded` há +N dias → arquiva (soft delete)
 */

import { getDb } from "./db";
import { pools, poolMembers, retrospectiveConfig } from "../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { createNotification, getPoolMembers, getPlatformSettings } from "./db";
import { logger } from "./logger";

// ─── HEALTH TRACKING ─────────────────────────────────────────────────────────

export const archivalCronHealth = {
  lastRunAt: null as Date | null,
  lastRunSuccess: null as boolean | null,
  lastError: null as string | null,
  runCount: 0,
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

// AUTO_CONCLUDE_DAYS é lido dinâmicamente da tabela retrospective_config (default: 3)

// ─── JOB PRINCIPAL ────────────────────────────────────────────────────────────

export async function runArchivalJob() {
  const db = await getDb();
  if (!db) {
    logger.warn("[Archival] Database not available");
    return;
  }

  const settings = await getPlatformSettings();
  const archiveDays = settings?.poolArchiveDays ?? 10;

  const now = new Date();

  // ── 1. Bolões `finished` → `awaiting_conclusion` ──────────────────────────
  // O scoring.ts já move para `finished` quando todos os jogos são apurados.
  // Aqui garantimos que o status seja atualizado para `awaiting_conclusion`
  // caso o scoring não tenha feito isso ainda (fallback de segurança).
  const finishedPools = await db
    .select({ id: pools.id, name: pools.name, ownerId: pools.ownerId })
    .from(pools)
    .where(eq(pools.status, "finished"));

  for (const pool of finishedPools) {
    try {
      await db
        .update(pools)
        .set({
          status: "awaiting_conclusion",
          awaitingConclusionSince: now,
        })
        .where(eq(pools.id, pool.id));

      // Notificar o organizador
      if (pool.ownerId) {
        await createNotification({
          userId: pool.ownerId,
          poolId: pool.id,
          type: "system",
          title: `Bolão "${pool.name}" aguarda confirmação`,
          message: `Todos os jogos foram apurados. Confirma o encerramento do bolão para gerarmos o ranking final?`,
          actionUrl: `/pool/${pool.id}`,
          actionLabel: "Confirmar encerramento",
        });
      }

      logger.info({ poolId: pool.id }, "[Archival] Pool moved to awaiting_conclusion");
    } catch (err) {
      logger.error({ poolId: pool.id, err }, "[Archival] Failed to move pool to awaiting_conclusion");
    }
  }

  // ── 2. Auto-conclusão: `awaiting_conclusion` há +N dias (configurado em retrospective_config) ──────
  // Ler autoCloseDays da config dinâmicamente
  let autoCloseDays = 3;
  try {
    const [retConfig] = await db.select({ autoCloseDays: retrospectiveConfig.autoCloseDays }).from(retrospectiveConfig).limit(1);
    if (retConfig?.autoCloseDays) autoCloseDays = retConfig.autoCloseDays;
  } catch { /* usa default 3 */ }
  const autoConcludeCutoff = new Date(now.getTime() - autoCloseDays * 24 * 60 * 60 * 1000);

  const awaitingPools = await db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.status, "awaiting_conclusion"),
        lt(pools.awaitingConclusionSince, autoConcludeCutoff)
      )
    );

  for (const pool of awaitingPools) {
    try {
      await concludePool(pool.id, null, "auto"); // null = sistema concluiu
      logger.info({ poolId: pool.id, autoCloseDays }, "[Archival] Pool auto-concluded after configured days");
    } catch (err) {
      logger.error({ poolId: pool.id, err }, "[Archival] Failed to auto-conclude pool");
    }
  }

  // ── 3. Arquivamento: `concluded` há +N dias ───────────────────────────────
  const archiveCutoff = new Date(now.getTime() - archiveDays * 24 * 60 * 60 * 1000);

  const duePools = await db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.status, "concluded"),
        lt(pools.concludedAt, archiveCutoff)
      )
    );

  if (duePools.length === 0 && finishedPools.length === 0 && awaitingPools.length === 0) {
    logger.debug("[Archival] No pools due for processing");
    return;
  }

  for (const pool of duePools) {
    try {
      // Notificar membros antes de arquivar
      const members = await getPoolMembers(pool.id);
      for (const { member } of members) {
        await createNotification({
          userId: member.userId,
          poolId: pool.id,
          type: "pool_closing",
          title: `Bolão "${pool.name}" arquivado`,
          message: `O bolão "${pool.name}" foi arquivado após ${archiveDays} dias do encerramento.`,
        });
      }

      await db.update(pools).set({ status: "archived" }).where(eq(pools.id, pool.id));

      // ── Badge Cobaia: se este é o bolão de lançamento configurado
      if (settings?.cobaiaPoolId && settings.cobaiaPoolId === pool.id) {
        try {
          const { assignBadgeManually } = await import("./badges");
          const { badges: badgesTable } = await import("../drizzle/schema");

          const [cobaiaB] = await db
            .select()
            .from(badgesTable)
            .where(eq(badgesTable.criterionType, "manual"))
            .then((rows) => rows.filter((b) => b.name.toLowerCase().includes("cobaia")));

          if (cobaiaB) {
            const poolParticipants = await db
              .select({ userId: poolMembers.userId })
              .from(poolMembers)
              .where(eq(poolMembers.poolId, pool.id));

            let cobaiaCount = 0;
            for (const { userId } of poolParticipants) {
              const result = await assignBadgeManually(userId, cobaiaB.id);
              if (result.success && !result.alreadyHad) cobaiaCount++;
            }
            logger.info(
              { poolId: pool.id, badgeId: cobaiaB.id, assigned: cobaiaCount },
              "[Archival] Badge Cobaia atribuído aos participantes do bolão de lançamento"
            );
          }
        } catch (badgeErr) {
          logger.error({ err: badgeErr }, "[Archival] Erro ao atribuir badge Cobaia");
        }
      }

      logger.info({ poolId: pool.id, poolName: pool.name }, `[Archival] Archived pool ${pool.id}`);
    } catch (err) {
      logger.error({ poolId: pool.id, err }, `[Archival] Failed to archive pool ${pool.id}`);
    }
  }
}

// ─── CONCLUSÃO DO BOLÃO ───────────────────────────────────────────────────────
// Chamada tanto pelo organizador (via tRPC) quanto pelo cron de auto-conclusão.

export async function concludePool(
  poolId: number,
  concludedBy: number | null,
  source: "organizer" | "auto" | "admin"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  // Marcar como concluído e bloquear edições
  await db
    .update(pools)
    .set({
      status: "concluded",
      concludedAt: now,
      concludedBy: concludedBy ?? undefined,
    })
    .where(eq(pools.id, poolId));

  // Buscar dados do bolão
  const [pool] = await db
    .select({ id: pools.id, name: pools.name })
    .from(pools)
    .where(eq(pools.id, poolId))
    .limit(1);

  if (!pool) return;

  // Gerar retrospectiva para todos os participantes em background
  // Ao concluir, também envia notificação in-app para cada participante
  generateRetrospectivesForPool(poolId, pool.name, source).catch((err) =>
    logger.error({ poolId, err }, "[Archival] Erro ao gerar retrospectivas")
  );
}

// ─── GERAÇÃO DE RETROSPECTIVAS ────────────────────────────────────────────────

async function generateRetrospectivesForPool(
  poolId: number,
  poolName: string,
  source: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const participants = await db
    .select({ userId: poolMembers.userId })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));

  logger.info(
    { poolId, participants: participants.length, source },
    "[Archival] Generating retrospectives"
  );

  const { generateAndUploadRetrospective } = await import("./retrospective");

  // Buscar slug do bolão para o link da notificação
  let poolSlug: string | undefined;
  try {
    const db2 = await getDb();
    if (db2) {
      const [poolRow] = await db2.select({ slug: pools.slug }).from(pools).where(eq(pools.id, poolId)).limit(1);
      poolSlug = poolRow?.slug;
    }
  } catch { /* usa fallback sem link */ }

  for (const { userId } of participants) {
    try {
      await generateAndUploadRetrospective(poolId, userId);
      logger.info({ poolId, userId }, "[Archival] Retrospective generated");
    } catch (err) {
      logger.error({ poolId, userId, err }, "[Archival] Failed to generate retrospective");
    }

    // Notificar participante que a retrospectiva está pronta
    try {
      await createNotification({
        userId,
        poolId,
        type: "pool_concluded",
        title: `Sua retrospectiva do "${poolName}" está pronta!`,
        message: `O bolão foi encerrado. Veja como foi a sua jornada — estilo Spotify Wrapped.`,
        actionUrl: poolSlug ? `/pool/${poolSlug}/retrospectiva` : undefined,
        actionLabel: "Ver retrospectiva",
        priority: "high",
      });
    } catch (notifErr) {
      logger.error({ poolId, userId, err: notifErr }, "[Archival] Failed to send retrospective notification");
    }
  }

  logger.info({ poolId, poolName, notified: participants.length }, "[Archival] All retrospectives generated and participants notified");
}

// ─── CRON RUNNER ─────────────────────────────────────────────────────────────

let archivalInterval: NodeJS.Timeout | null = null;

export function startArchivalCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

  archivalInterval = setInterval(async () => {
    archivalCronHealth.runCount++;
    archivalCronHealth.lastRunAt = new Date();
    try {
      await runArchivalJob();
      archivalCronHealth.lastRunSuccess = true;
      archivalCronHealth.lastError = null;
    } catch (err) {
      archivalCronHealth.lastRunSuccess = false;
      archivalCronHealth.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "[Archival] Cron error");
    }
  }, INTERVAL_MS);

  logger.info("[Archival] Cron started (interval: 1h)");

  // Rodar imediatamente ao iniciar
  runArchivalJob().catch((err) => logger.error({ err }, "[Archival] Initial run error"));
}

export function stopArchivalCron() {
  if (archivalInterval) {
    clearInterval(archivalInterval);
    archivalInterval = null;
  }
}
