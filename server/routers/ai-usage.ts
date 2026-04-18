/**
 * ai-usage.ts — Controle server-side do limite de análises de IA pré-jogo
 *
 * Regras:
 *  - Free: máx 3 análises/dia (reset automático por data UTC)
 *  - VIP / Pro / Unlimited: ilimitado
 *
 * Procedures:
 *  - checkAiLimit   → retorna { allowed, used, limit, isVip }
 *  - incrementAiUsage → incrementa o contador e retorna o estado atualizado
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getUserPlanTier } from "../db";
import { aiDailyUsage } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;

// Tiers que têm IA ilimitada
const UNLIMITED_TIERS = new Set(["vip", "pro", "unlimited"]);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Retorna a data de hoje no formato YYYY-MM-DD (UTC) */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Busca ou cria o registro de uso diário do usuário */
async function getOrCreateUsage(userId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db
    .select()
    .from(aiDailyUsage)
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.date, date)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Inserir novo registro (upsert via INSERT IGNORE + SELECT)
  await db
    .insert(aiDailyUsage)
    .values({ userId, date, count: 0 })
    .onDuplicateKeyUpdate({ set: { count: sql`0` } });

  const created = await db
    .select()
    .from(aiDailyUsage)
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.date, date)))
    .limit(1);

  return created[0];
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const aiUsageRouter = router({
  /**
   * Verifica se o usuário pode usar mais uma análise de IA hoje.
   * Retorna: { allowed, used, limit, isUnlimited }
   */
  checkAiLimit: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const tier = await getUserPlanTier(userId);
    const isUnlimited = UNLIMITED_TIERS.has(tier);

    if (isUnlimited) {
      return {
        allowed: true,
        used: 0,
        limit: null, // null = ilimitado
        isUnlimited: true,
        tier,
      };
    }

    const date = todayUTC();
    const usage = await getOrCreateUsage(userId, date);
    const used = usage?.count ?? 0;

    return {
      allowed: used < FREE_DAILY_LIMIT,
      used,
      limit: FREE_DAILY_LIMIT,
      isUnlimited: false,
      tier,
    };
  }),

  /**
   * Incrementa o contador de uso de IA do usuário para hoje.
   * Deve ser chamado APÓS a análise ser gerada com sucesso.
   * Retorna o estado atualizado.
   */
  incrementAiUsage: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const tier = await getUserPlanTier(userId);
    const isUnlimited = UNLIMITED_TIERS.has(tier);

    // VIP/Pro/Unlimited: não incrementa (ilimitado)
    if (isUnlimited) {
      return {
        allowed: true,
        used: 0,
        limit: null,
        isUnlimited: true,
        tier,
      };
    }

    const date = todayUTC();

    const db = await getDb();
    if (!db) throw new Error("DB not available");
    // Upsert: incrementa atomicamente via onDuplicateKeyUpdate
    await db
      .insert(aiDailyUsage)
      .values({ userId, date, count: 1 })
      .onDuplicateKeyUpdate({ set: { count: sql`${aiDailyUsage.count} + 1` } });

    // Buscar o valor atualizado
    const usage = await getOrCreateUsage(userId, date);
    const used = usage?.count ?? 1;

    return {
      allowed: used < FREE_DAILY_LIMIT,
      used,
      limit: FREE_DAILY_LIMIT,
      isUnlimited: false,
      tier,
    };
  }),
});
