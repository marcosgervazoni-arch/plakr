/**
 * badges.ts — Motor de atribuição de badges
 * Calcula e atribui badges a usuários com base em critérios configurados pelo admin.
 */

import type { BadgeCriterionType } from "../drizzle/schema";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface BadgeWithStatus {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  criterionType: string;
  criterionValue: number;
  isActive: boolean;
  earned: boolean;
  earnedAt: Date | null;
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Calcula quais badges um usuário possui e quais ainda não conquistou.
 * Retorna todos os badges ativos com flag `earned`.
 */
export async function getUserBadgesWithStatus(userId: number): Promise<BadgeWithStatus[]> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];

  const { eq, and, sql } = await import("drizzle-orm");
  const { badges, userBadges } = await import("../drizzle/schema");

  // Buscar todos os badges ativos
  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));
  if (!allBadges.length) return [];

  // Buscar badges já conquistados pelo usuário
  const earned = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  const earnedMap = new Map(earned.map((ub) => [ub.badgeId, ub.earnedAt]));

  return allBadges.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    iconUrl: b.iconUrl,
    criterionType: b.criterionType,
    criterionValue: b.criterionValue,
    isActive: b.isActive,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) ?? null,
  }));
}

/**
 * Verifica se um usuário atende ao critério de um badge específico.
 * Retorna true se o critério for satisfeito.
 */
export async function checkCriterion(
  userId: number,
  criterionType: string,
  criterionValue: number
): Promise<boolean> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return false;

  const { eq, and, sql, gte, desc } = await import("drizzle-orm");
  const { bets, games, poolMemberStats, poolMembers } = await import("../drizzle/schema");

  switch (criterionType as BadgeCriterionType) {
    case "exact_scores_career": {
      // Conta placares exatos na carreira (pointsEarned > 0 e resultType = 'exact')
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bets)
        .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "zebra_scores_career": {
      // Conta zebras acertadas (jogo marcado como zebra + palpite correto)
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(
          and(
            eq(bets.userId, userId),
            eq(games.isZebraResult, true),
            sql`${bets.resultType} IN ('exact', 'correct_result')`
          )
        );
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "top3_pools": {
      // Conta bolões onde o usuário terminou em top 3
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMemberStats)
        .where(
          and(
            eq(poolMemberStats.userId, userId),
            sql`${poolMemberStats.rankPosition} <= 3`,
            sql`${poolMemberStats.rankPosition} IS NOT NULL`
          )
        );
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "first_place_pools": {
      // Conta bolões onde o usuário terminou em 1º lugar
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMemberStats)
        .where(
          and(
            eq(poolMemberStats.userId, userId),
            eq(poolMemberStats.rankPosition, 1)
          )
        );
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "accuracy_in_pool": {
      // Verifica se o usuário teve taxa de acerto >= criterionValue% em algum bolão com mín. 10 jogos
      const stats = await db
        .select({
          totalBets: poolMemberStats.totalBets,
          exactScoreCount: poolMemberStats.exactScoreCount,
          correctResultCount: poolMemberStats.correctResultCount,
        })
        .from(poolMemberStats)
        .where(
          and(
            eq(poolMemberStats.userId, userId),
            sql`${poolMemberStats.totalBets} >= 10`
          )
        );
      return stats.some((s) => {
        const total = Number(s.totalBets);
        const correct = Number(s.exactScoreCount) + Number(s.correctResultCount);
        return total > 0 && Math.round((correct / total) * 100) >= criterionValue;
      });
    }

    case "complete_pool_no_blank": {
      // Conta bolões completados sem nenhum jogo em branco
      // Um bolão "completado sem branco" = totalBets == número de jogos do bolão
      // Aproximação: totalBets >= 10 e wrongCount + exactCount + correctCount == totalBets
      const stats = await db
        .select({
          totalBets: poolMemberStats.totalBets,
          exactScoreCount: poolMemberStats.exactScoreCount,
          correctResultCount: poolMemberStats.correctResultCount,
          poolId: poolMemberStats.poolId,
        })
        .from(poolMemberStats)
        .where(
          and(
            eq(poolMemberStats.userId, userId),
            sql`${poolMemberStats.totalBets} >= 5`
          )
        );
      // Considera bolao completo se totalBets >= 5 e nenhum palpite pendente
      // Buscar o tournamentId de cada pool
      const { pools } = await import("../drizzle/schema");
      const completed = await Promise.all(
        stats.map(async (s) => {
          const [poolRow] = await db
            .select({ tournamentId: pools.tournamentId })
            .from(pools)
            .where(eq(pools.id, s.poolId))
            .limit(1);
          if (!poolRow) return false;
          const [pendingRow] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(bets)
            .innerJoin(games, eq(bets.gameId, games.id))
            .where(
              and(
                eq(bets.userId, userId),
                eq(games.tournamentId, poolRow.tournamentId),
                eq(bets.resultType, "pending")
              )
            );
          return Number(pendingRow?.count ?? 0) === 0;
        })
      );
      const completedCount = completed.filter(Boolean);
      return completedCount.length >= criterionValue;
    }

    case "consecutive_correct": {
      // Verifica se o usuário teve uma sequência de N acertos consecutivos
      const betRows = await db
        .select({ resultType: bets.resultType, matchDate: games.matchDate })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(
          and(
            eq(bets.userId, userId),
            sql`${games.status} = 'finished'`
          )
        )
        .orderBy(desc(games.matchDate));

      let maxStreak = 0;
      let currentStreak = 0;
      for (const bet of betRows) {
        if (bet.resultType === "exact" || bet.resultType === "correct_result") {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      return maxStreak >= criterionValue;
    }

    default:
      return false;
  }
}

/**
 * Verifica e atribui todos os badges pendentes para um usuário.
 * Retorna a lista de novos badges conquistados nesta execução.
 */
export async function calculateAndAssignBadges(userId: number): Promise<{ badgeId: number; name: string }[]> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];

  const { eq, and } = await import("drizzle-orm");
  const { badges, userBadges, notifications } = await import("../drizzle/schema");

  // Buscar todos os badges ativos
  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));
  if (!allBadges.length) return [];

  // Buscar badges já conquistados pelo usuário
  const earned = await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId));
  const earnedIds = new Set(earned.map((e) => e.badgeId));

  const newlyEarned: { badgeId: number; name: string }[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue; // já tem

    const qualifies = await checkCriterion(userId, badge.criterionType, badge.criterionValue);
    if (!qualifies) continue;

    // Atribuir badge
    await db.insert(userBadges).values({ userId, badgeId: badge.id, notified: false });

    // Criar notificação in-app
    await db.insert(notifications).values({
      userId,
      type: "system",
      title: `Badge desbloqueado: ${badge.name}!`,
      message: badge.description,
      isRead: false,
    }).catch(() => {}); // não falhar se notificação falhar

    newlyEarned.push({ badgeId: badge.id, name: badge.name });
  }

  return newlyEarned;
}

/**
 * Atribuição retroativa: verifica TODOS os usuários para um badge recém-criado.
 * Deve ser chamada ao publicar um badge com isRetroactive = true.
 */
export async function assignBadgeRetroactively(badgeId: number): Promise<number> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return 0;

  const { eq } = await import("drizzle-orm");
  const { badges, users, userBadges, notifications } = await import("../drizzle/schema");

  const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId)).limit(1);
  if (!badge || !badge.isActive) return 0;

  const allUsers = await db.select({ id: users.id }).from(users);
  let assigned = 0;

  for (const user of allUsers) {
    const alreadyHas = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(eq(userBadges.userId, user.id))
      .limit(1);

    // Verificar se já tem este badge específico
    const hasThisBadge = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(eq(userBadges.userId, user.id))
      .limit(1)
      .then((rows) => rows.some(() => true)); // simplificado — verificar por badgeId

    const existing = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, user.id))
      .then((rows) => rows.find((r) => r.badgeId === badgeId));

    if (existing) continue;

    const qualifies = await checkCriterion(user.id, badge.criterionType, badge.criterionValue);
    if (!qualifies) continue;

    await db.insert(userBadges).values({ userId: user.id, badgeId, notified: false });
    await db.insert(notifications).values({
      userId: user.id,
      type: "system",
      title: `Badge desbloqueado: ${badge.name}!`,
      message: badge.description,
      isRead: false,
    }).catch(() => {});

    assigned++;
  }

  return assigned;
}
