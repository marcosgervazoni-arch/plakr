/**
 * badges.ts — Motor de atribuição de badges
 * Calcula e atribui badges a usuários com base em critérios configurados.
 *
 * Critérios suportados:
 *   Categoria Precisão:
 *     exact_scores_career      — Placares exatos na carreira >= N
 *     exact_scores_in_pool     — Placares exatos no mesmo bolão >= N
 *   Categoria Ranking:
 *     first_place_pools        — 1º lugar em bolões >= N
 *     first_place_margin       — Vencer com >= N% de vantagem sobre o 2º
 *     first_place_large_pool   — Vencer bolão com >= N participantes
 *     rank_jump                — Subir >= N posições em um único recálculo (não retroativo)
 *     rank_hold_1st            — Manter 1º por >= N recálculos consecutivos (não retroativo)
 *   Categoria Zebra:
 *     zebra_scores_career      — Zebras acertadas na carreira >= N
 *     zebra_in_pool            — Zebras acertadas no mesmo bolão >= N
 *     zebra_exact_score        — Acertar placar exato de uma zebra >= N
 *   Categoria Comunidade:
 *     first_bet                — Fez pelo menos 1 palpite
 *     all_bets_in_pool         — Palpitou em todos os jogos de pelo menos 1 bolão
 *     created_pool             — Criou pelo menos 1 bolão
 *     pool_members_via_invite  — Trouxe >= N membros via convite para um bolão
 *     organized_pools          — Organizou >= N bolões
 *     early_bet                — Palpitou com >= 24h de antecedência em >= N jogos
 *     participated_pools       — Participou de >= N bolões diferentes
 *   Categoria Exclusivo:
 *     manual                   — Atribuição manual pelo admin (isManual=true)
 *     early_user               — Um dos primeiros N usuários (userId <= N)
 */

import logger from "./logger";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface BadgeWithStatus {
  id: number;
  name: string;
  emoji: string | null;
  category: string | null;
  description: string;
  iconUrl: string | null;
  criterionType: string;
  criterionValue: number;
  isManual: boolean;
  isActive: boolean;
  earned: boolean;
  earnedAt: Date | null;
}

// ─── VERIFICAÇÃO DE CRITÉRIO ──────────────────────────────────────────────────

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

  const { eq, and, sql, desc } = await import("drizzle-orm");
  const { bets, games, poolMemberStats, poolMembers, pools, referrals, users } =
    await import("../drizzle/schema");

  switch (criterionType) {
    // ── PRECISÃO ──────────────────────────────────────────────────────────────

    case "exact_scores_career": {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bets)
        .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "exact_scores_in_pool": {
      // Verifica se o usuário tem >= N placares exatos em algum bolão específico
      const rows = await db
        .select({
          poolId: bets.poolId,
          count: sql<number>`COUNT(*)`,
        })
        .from(bets)
        .where(and(eq(bets.userId, userId), eq(bets.resultType, "exact")))
        .groupBy(bets.poolId);
      return rows.some((r) => Number(r.count) >= criterionValue);
    }

    // ── RANKING ───────────────────────────────────────────────────────────────

    case "first_place_pools": {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMemberStats)
        .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "first_place_margin": {
      // Vencer com >= criterionValue% de vantagem sobre o 2º colocado
      // Busca bolões onde o usuário está em 1º
      const firstPlacePools = await db
        .select({ poolId: poolMemberStats.poolId, totalPoints: poolMemberStats.totalPoints })
        .from(poolMemberStats)
        .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));

      for (const fp of firstPlacePools) {
        // Busca o 2º colocado no mesmo bolão
        const [second] = await db
          .select({ totalPoints: poolMemberStats.totalPoints })
          .from(poolMemberStats)
          .where(
            and(
              eq(poolMemberStats.poolId, fp.poolId),
              eq(poolMemberStats.rankPosition, 2)
            )
          )
          .limit(1);

        if (!second) continue;
        const firstPts = Number(fp.totalPoints);
        const secondPts = Number(second.totalPoints);
        if (secondPts <= 0) continue;
        const margin = ((firstPts - secondPts) / secondPts) * 100;
        if (margin >= criterionValue) return true;
      }
      return false;
    }

    case "first_place_large_pool": {
      // Vencer bolão com >= criterionValue participantes
      const firstPlacePools = await db
        .select({ poolId: poolMemberStats.poolId })
        .from(poolMemberStats)
        .where(and(eq(poolMemberStats.userId, userId), eq(poolMemberStats.rankPosition, 1)));

      for (const fp of firstPlacePools) {
        const [countRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(poolMembers)
          .where(eq(poolMembers.poolId, fp.poolId));
        if (Number(countRow?.count ?? 0) >= criterionValue) return true;
      }
      return false;
    }

    case "rank_jump":
    case "rank_hold_1st": {
      // Não retroativos — calculados em tempo real pelo motor de scoring
      // Aqui retornam false (a atribuição é feita diretamente em processGameScoring)
      return false;
    }

    // ── ZEBRA ─────────────────────────────────────────────────────────────────

    case "zebra_scores_career": {
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

    case "zebra_in_pool": {
      // >= N zebras acertadas no mesmo bolão
      const rows = await db
        .select({
          poolId: bets.poolId,
          count: sql<number>`COUNT(*)`,
        })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(
          and(
            eq(bets.userId, userId),
            eq(games.isZebraResult, true),
            sql`${bets.resultType} IN ('exact', 'correct_result')`
          )
        )
        .groupBy(bets.poolId);
      return rows.some((r) => Number(r.count) >= criterionValue);
    }

    case "zebra_exact_score": {
      // Acertar placar exato de uma zebra
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(
          and(
            eq(bets.userId, userId),
            eq(games.isZebraResult, true),
            eq(bets.resultType, "exact")
          )
        );
      return Number(row?.count ?? 0) >= criterionValue;
    }

    // ── COMUNIDADE ────────────────────────────────────────────────────────────

    case "first_bet": {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bets)
        .where(eq(bets.userId, userId));
      return Number(row?.count ?? 0) >= 1;
    }

    case "all_bets_in_pool": {
      // Palpitou em todos os jogos de pelo menos 1 bolão
      // Verifica bolões onde o usuário é membro e compara totalBets com total de jogos do torneio
      const memberPools = await db
        .select({ poolId: poolMembers.poolId })
        .from(poolMembers)
        .where(eq(poolMembers.userId, userId));

      for (const mp of memberPools) {
        const [poolRow] = await db
          .select({ tournamentId: pools.tournamentId })
          .from(pools)
          .where(eq(pools.id, mp.poolId))
          .limit(1);
        if (!poolRow) continue;

        // Total de jogos finalizados no torneio
        const [totalGamesRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(games)
          .where(
            and(
              eq(games.tournamentId, poolRow.tournamentId),
              sql`${games.status} = 'finished'`
            )
          );
        const totalGames = Number(totalGamesRow?.count ?? 0);
        if (totalGames < 5) continue; // mínimo de 5 jogos para considerar

        // Total de palpites do usuário neste bolão
        const [userBetsRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(bets)
          .where(
            and(
              eq(bets.userId, userId),
              eq(bets.poolId, mp.poolId),
              sql`${bets.resultType} != 'pending'`
            )
          );
        const userBets = Number(userBetsRow?.count ?? 0);

        if (userBets >= totalGames) return true;
      }
      return false;
    }

    case "created_pool": {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(pools)
        .where(eq(pools.ownerId, userId));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "pool_members_via_invite": {
      // Trouxe >= N membros via convite para um único bolão
      // Conta membros com joinSource = 'link' em bolões onde o usuário é organizador
      const organizerPools = await db
        .select({ poolId: poolMembers.poolId })
        .from(poolMembers)
        .where(
          and(
            eq(poolMembers.userId, userId),
            eq(poolMembers.role, "organizer")
          )
        );

      for (const op of organizerPools) {
        const [countRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(poolMembers)
          .where(
            and(
              eq(poolMembers.poolId, op.poolId),
              sql`${poolMembers.joinSource} = 'link'`
            )
          );
        if (Number(countRow?.count ?? 0) >= criterionValue) return true;
      }
      return false;
    }

    case "organized_pools": {
      // Organizou >= N bolões
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(poolMembers)
        .where(
          and(
            eq(poolMembers.userId, userId),
            eq(poolMembers.role, "organizer")
          )
        );
      return Number(row?.count ?? 0) >= criterionValue;
    }

    case "early_bet": {
      // Palpitou com >= 24h de antecedência em >= N jogos
      const earlyBets = await db
        .select({ betCreatedAt: bets.createdAt, matchDate: games.matchDate })
        .from(bets)
        .innerJoin(games, eq(bets.gameId, games.id))
        .where(eq(bets.userId, userId));

      const earlyCount = earlyBets.filter((b) => {
        const betTime = new Date(b.betCreatedAt).getTime();
        const matchTime = new Date(b.matchDate).getTime();
        return matchTime - betTime >= 24 * 60 * 60 * 1000; // 24h em ms
      }).length;

      return earlyCount >= criterionValue;
    }

    case "participated_pools": {
      // Participou de >= N bolões diferentes
      const [row] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${poolMembers.poolId})` })
        .from(poolMembers)
        .where(eq(poolMembers.userId, userId));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    // ── EXCLUSIVO ─────────────────────────────────────────────────────────────

    case "early_user": {
      // Um dos primeiros N usuários (id <= N)
      return userId <= criterionValue;
    }

    case "manual": {
      // Atribuição exclusivamente manual pelo admin — nunca calculado automaticamente
      return false;
    }

    // Critérios legados (mantidos para compatibilidade)
    case "top3_pools": {
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

    case "accuracy_in_pool": {
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
      const stats = await db
        .select({
          totalBets: poolMemberStats.totalBets,
          poolId: poolMemberStats.poolId,
        })
        .from(poolMemberStats)
        .where(
          and(
            eq(poolMemberStats.userId, userId),
            sql`${poolMemberStats.totalBets} >= 5`
          )
        );
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
      return completed.filter(Boolean).length >= criterionValue;
    }

    case "consecutive_correct": {
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

    case "referrals_count": {
      const { referrals: referralsT } = await import("../drizzle/schema");
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(referralsT)
        .where(and(eq(referralsT.inviterId, userId), sql`${referralsT.registeredAt} IS NOT NULL`));
      return Number(row?.count ?? 0) >= criterionValue;
    }

    default:
      return false;
  }
}

// ─── CÁLCULO E ATRIBUIÇÃO ─────────────────────────────────────────────────────

/**
 * Verifica e atribui todos os badges pendentes para um usuário.
 * Ignora badges manuais (isManual=true) — esses só o admin atribui.
 * Retorna a lista de novos badges conquistados nesta execução.
 */
export async function calculateAndAssignBadges(
  userId: number
): Promise<{ badgeId: number; name: string; emoji: string | null }[]> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];

  const { eq, and } = await import("drizzle-orm");
  const { badges, userBadges, notifications } = await import("../drizzle/schema");

  // Buscar todos os badges ativos e não-manuais
  const allBadges = await db
    .select()
    .from(badges)
    .where(and(eq(badges.isActive, true), eq(badges.isManual, false)));
  if (!allBadges.length) return [];

  // Buscar badges já conquistados pelo usuário
  const earned = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedIds = new Set(earned.map((e) => e.badgeId));

  const newlyEarned: { badgeId: number; name: string; emoji: string | null }[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    const qualifies = await checkCriterion(userId, badge.criterionType, badge.criterionValue);
    if (!qualifies) continue;

    // Atribuir badge
    await db.insert(userBadges).values({ userId, badgeId: badge.id, notified: false });

    // Notificação in-app
    const badgeLabel = badge.emoji ? `${badge.emoji} ${badge.name}` : badge.name;
    await db
      .insert(notifications)
      .values({
        userId,
        type: "system",
        title: `🏅 Badge desbloqueado: ${badgeLabel}!`,
        message: badge.description,
        isRead: false,
        imageUrl: badge.iconUrl ?? undefined,
        actionUrl: `/profile/me`,
        actionLabel: "Ver meu perfil",
        priority: "high",
        category: "badge_unlocked",
      })
      .catch(() => {});

    newlyEarned.push({ badgeId: badge.id, name: badge.name, emoji: badge.emoji });
    logger.info({ userId, badgeId: badge.id, name: badge.name }, "[Badges] Badge atribuído");
  }

  return newlyEarned;
}

/**
 * Atribui um badge manualmente a um usuário (usado pelo admin para badges exclusivos).
 */
export async function assignBadgeManually(
  userId: number,
  badgeId: number
): Promise<{ success: boolean; alreadyHad: boolean }> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return { success: false, alreadyHad: false };

  const { eq, and } = await import("drizzle-orm");
  const { badges, userBadges, notifications } = await import("../drizzle/schema");

  const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId)).limit(1);
  if (!badge || !badge.isActive) return { success: false, alreadyHad: false };

  // Verificar se já tem
  const existing = await db
    .select({ id: userBadges.id })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .limit(1);

  if (existing.length > 0) return { success: true, alreadyHad: true };

  await db.insert(userBadges).values({ userId, badgeId, notified: false });

  const badgeLabel = badge.emoji ? `${badge.emoji} ${badge.name}` : badge.name;
  await db
    .insert(notifications)
    .values({
      userId,
      type: "system",
      title: `🏅 Badge especial desbloqueado: ${badgeLabel}!`,
      message: badge.description,
      isRead: false,
      imageUrl: badge.iconUrl ?? undefined,
      actionUrl: `/profile/me`,
      actionLabel: "Ver meu perfil",
      priority: "high",
      category: "badge_unlocked",
    })
    .catch(() => {});

  logger.info({ userId, badgeId, name: badge.name }, "[Badges] Badge manual atribuído");
  return { success: true, alreadyHad: false };
}

/**
 * Remove um badge de um usuário (usado pelo admin).
 */
export async function revokeBadge(userId: number, badgeId: number): Promise<boolean> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return false;

  const { eq, and } = await import("drizzle-orm");
  const { userBadges } = await import("../drizzle/schema");

  await db
    .delete(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));

  logger.info({ userId, badgeId }, "[Badges] Badge revogado");
  return true;
}

/**
 * Atribuição retroativa: verifica TODOS os usuários para um badge recém-criado.
 */
export async function assignBadgeRetroactively(badgeId: number): Promise<number> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return 0;

  const { eq, and } = await import("drizzle-orm");
  const { badges, users, userBadges, notifications } = await import("../drizzle/schema");

  const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId)).limit(1);
  if (!badge || !badge.isActive || badge.isManual) return 0;

  const allUsers = await db.select({ id: users.id }).from(users);
  let assigned = 0;

  for (const user of allUsers) {
    const existing = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, badgeId)))
      .limit(1);

    if (existing.length > 0) continue;

    const qualifies = await checkCriterion(user.id, badge.criterionType, badge.criterionValue);
    if (!qualifies) continue;

    await db.insert(userBadges).values({ userId: user.id, badgeId, notified: false });

    const badgeLabel = badge.emoji ? `${badge.emoji} ${badge.name}` : badge.name;
    await db
      .insert(notifications)
      .values({
        userId: user.id,
        type: "system",
        title: `🏅 Badge desbloqueado: ${badgeLabel}!`,
        message: badge.description,
        isRead: false,
        imageUrl: badge.iconUrl ?? undefined,
        actionUrl: `/profile/me`,
        actionLabel: "Ver meu perfil",
        priority: "high",
        category: "badge_unlocked",
      })
      .catch(() => {});

    assigned++;
  }

  logger.info({ badgeId, assigned }, "[Badges] Atribuição retroativa concluída");
  return assigned;
}

/**
 * Calcula quais badges um usuário possui e quais ainda não conquistou.
 */
export async function getUserBadgesWithStatus(userId: number): Promise<BadgeWithStatus[]> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];

  const { eq } = await import("drizzle-orm");
  const { badges, userBadges } = await import("../drizzle/schema");

  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));
  if (!allBadges.length) return [];

  const earned = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  const earnedMap = new Map(earned.map((ub) => [ub.badgeId, ub.earnedAt]));

  return allBadges.map((b) => ({
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    category: b.category,
    description: b.description,
    iconUrl: b.iconUrl,
    criterionType: b.criterionType,
    criterionValue: b.criterionValue,
    isManual: b.isManual,
    isActive: b.isActive,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) ?? null,
  }));
}
