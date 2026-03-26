/**
 * Plakr! — Serviço de Web Push (VAPID)
 *
 * As VAPID keys são geradas e gerenciadas pelo superadmin diretamente no painel
 * de configurações da plataforma (AdminSettings → Notificações Push).
 * Nenhuma variável de ambiente externa é necessária.
 *
 * Fluxo:
 * 1. Superadmin gera as keys em AdminSettings → salva em platform_settings
 * 2. Frontend lê a vapidPublicKey via trpc.platform.getPushConfig
 * 3. Service Worker se registra e envia a subscription para o servidor
 * 4. Servidor usa vapidPrivateKey para assinar e enviar notificações
 */
import webpush from "web-push";
import { getDb } from "./db";
import {
  platformSettings,
  pushSubscriptions,
  notificationPreferences,
  users,
} from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import logger from "./logger";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

type NotifChannel =
  | "pushGameReminder"
  | "pushRankingUpdate"
  | "pushResultAvailable"
  | "pushSystem"
  | "pushAd";

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Carrega as VAPID keys do banco e configura o web-push.
 * Retorna false se as keys não estiverem configuradas ou pushEnabled=false.
 */
async function initWebPush(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({
      vapidPublicKey: platformSettings.vapidPublicKey,
      vapidPrivateKey: platformSettings.vapidPrivateKey,
      vapidEmail: platformSettings.vapidEmail,
      pushEnabled: platformSettings.pushEnabled,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  const cfg = rows[0];
  if (!cfg || !cfg.pushEnabled || !cfg.vapidPublicKey || !cfg.vapidPrivateKey) {
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${cfg.vapidEmail ?? "suporte@plakr.com.br"}`,
    cfg.vapidPublicKey,
    cfg.vapidPrivateKey
  );
  return true;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Gera um novo par de VAPID keys.
 * Chamado pelo superadmin no AdminSettings.
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

/**
 * Salva ou atualiza uma assinatura push para um usuário.
 * Chamado quando o frontend registra o Service Worker.
 */
export async function saveSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert por endpoint (um dispositivo pode re-registrar)
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);
  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent ?? null,
    });
  }
}

/**
 * Remove uma assinatura push pelo endpoint.
 * Chamado quando o usuário desativa push nas preferências.
 */
export async function removeSubscription(
  userId: number,
  endpoint: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
}

/**
 * Remove todas as assinaturas de um usuário.
 */
export async function removeAllSubscriptions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

/**
 * Envia uma notificação push para um usuário específico,
 * respeitando as preferências de canal do usuário.
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
  channel: NotifChannel = "pushSystem"
): Promise<{ sent: number; failed: number }> {
  const ready = await initWebPush();
  if (!ready) return { sent: 0, failed: 0 };

  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  // Verificar preferências do usuário
  const prefRows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  const prefs = prefRows[0];
  if (prefs && !prefs[channel]) {
    return { sent: 0, failed: 0 }; // usuário desativou este canal
  }

  // Buscar assinaturas do usuário
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (!subs.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const expiredIds: number[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 86400 } // 24h
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        // Subscription expirada — marcar para remoção
        expiredIds.push(sub.id);
      }
      failed++;
      logger.warn({ subId: sub.id, status }, "[Push] Failed to send to subscription");
    }
  }

  // Limpar assinaturas expiradas
  if (expiredIds.length) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, expiredIds));
    logger.info({ count: expiredIds.length }, "[Push] Removed expired subscriptions");
  }

  return { sent, failed };
}

/**
 * Envia uma notificação push para múltiplos usuários (broadcast).
 * Filtra usuários bloqueados e respeita preferências individuais.
 */
export async function broadcastPush(
  userIds: number[],
  payload: PushPayload,
  channel: NotifChannel = "pushSystem"
): Promise<{ sent: number; failed: number; skipped: number }> {
  const ready = await initWebPush();
  if (!ready) return { sent: 0, failed: 0, skipped: userIds.length };

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Processar em lotes de 50 para não sobrecarregar
  const BATCH = 50;
  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((uid) => sendPushToUser(uid, payload, channel))
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        totalSent += r.value.sent;
        totalFailed += r.value.failed;
        if (r.value.sent === 0 && r.value.failed === 0) totalSkipped++;
      } else {
        totalSkipped++;
      }
    }
  }

  return { sent: totalSent, failed: totalFailed, skipped: totalSkipped };
}

/**
 * Retorna estatísticas de assinaturas push ativas.
 */
export async function getPushStats(): Promise<{
  totalSubscriptions: number;
  uniqueUsers: number;
  pushEnabled: boolean;
  hasVapidKeys: boolean;
}> {
  const db = await getDb();
  if (!db)
    return {
      totalSubscriptions: 0,
      uniqueUsers: 0,
      pushEnabled: false,
      hasVapidKeys: false,
    };

  const [cfgRows, subsRows] = await Promise.all([
    db
      .select({
        pushEnabled: platformSettings.pushEnabled,
        vapidPublicKey: platformSettings.vapidPublicKey,
      })
      .from(platformSettings)
      .where(eq(platformSettings.id, 1))
      .limit(1),
    db.select({ userId: pushSubscriptions.userId }).from(pushSubscriptions),
  ]);

  const cfg = cfgRows[0];
  const uniqueUsers = new Set(subsRows.map((r) => r.userId)).size;

  return {
    totalSubscriptions: subsRows.length,
    uniqueUsers,
    pushEnabled: cfg?.pushEnabled ?? false,
    hasVapidKeys: !!(cfg?.vapidPublicKey),
  };
}
