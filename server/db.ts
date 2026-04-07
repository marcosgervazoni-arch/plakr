import { and, asc, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import logger from "./logger";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Bet,
  Game,
  InsertBet,
  InsertPool,
  InsertTeam,
  InsertTournament,
  InsertUser,
  InsertUserPlan,
  Pool,
  PoolMember,
  PoolScoringRules,
  Tournament,
  User,
  UserPlan,
  ads,
  adminLogs,
  bets,
  emailQueue,
  games,
  notificationPreferences,
  notifications,
  platformSettings,
  poolMemberStats,
  poolMembers,
  poolScoringRules,
  pools,
  teams,
  tournamentPhases,
  tournaments,
  userPlans,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      logger.warn({ err: error }, "[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// [T3] cursor-based pagination: cursor é o ID do último item retornado
export async function getAllUsers(limit = 50, cursor?: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(cursor ? lt(users.id, cursor) : undefined)
    .orderBy(desc(users.id))
    .limit(limit);
}

export async function updateUserBlocked(userId: number, isBlocked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isBlocked }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── PLATFORM SETTINGS ───────────────────────────────────────────────────────

export async function getPlatformSettings() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  return result[0] ?? null;
}

export async function updatePlatformSettings(
  data: Partial<typeof platformSettings.$inferInsert>,
  updatedBy: number
) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformSettings).set({ ...data, updatedBy }).where(eq(platformSettings.id, 1));
}

// ─── USER PLANS ───────────────────────────────────────────────────────────────

export async function getUserPlan(userId: number): Promise<UserPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserPlan(data: InsertUserPlan) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userPlans).values(data).onDuplicateKeyUpdate({ set: data });
}

/**
 * Retorna o tier ativo do plano do usuário.
 * Considera expirado se planExpiresAt < agora.
 */
export async function getUserPlanTier(userId: number): Promise<"free" | "pro" | "unlimited"> {
  const plan = await getUserPlan(userId);
  if (!plan || !plan.isActive) return "free";
  if (plan.planExpiresAt && plan.planExpiresAt < new Date()) return "free";
  return (plan.plan as "free" | "pro" | "unlimited") ?? "free";
}

/**
 * Verifica se o usuário pode criar mais bolões com base no seu tier.
 * Retorna { allowed: true } ou { allowed: false, reason, limit }
 */
export async function canCreatePool(userId: number): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  // Super admins não têm limites de plano
  const user = await getUserById(userId);
  if (user?.role === "admin") return { allowed: true };
  const { PLAN_LIMITS } = await import("../shared/plans");
  const tier = await getUserPlanTier(userId);
  const limits = PLAN_LIMITS[tier];
  if (limits.maxPools === Infinity) return { allowed: true };
  const activeCount = await countActivePoolsByOwner(userId);
  if (activeCount >= limits.maxPools) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${limits.maxPools} bolões ativos do plano ${tier === "free" ? "Gratuito" : "Pro"}. Faça upgrade para criar mais bolões.`,
      limit: limits.maxPools,
    };
  }
  return { allowed: true };
}

/**
 * Verifica se o organizador do bolão pode adicionar mais participantes.
 * Retorna { allowed: true } ou { allowed: false, reason, limit }
 */
export async function canAddMember(poolId: number, ownerId: number): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  // Super admins não têm limites de plano
  const owner = await getUserById(ownerId);
  if (owner?.role === "admin") return { allowed: true };
  const { PLAN_LIMITS } = await import("../shared/plans");
  const tier = await getUserPlanTier(ownerId);
  const limits = PLAN_LIMITS[tier];
  if (limits.maxMembersPerPool === Infinity) return { allowed: true };
  const memberCount = await countPoolMembers(poolId);
  if (memberCount >= limits.maxMembersPerPool) {
    return {
      allowed: false,
      reason: `Este bolão atingiu o limite de ${limits.maxMembersPerPool} participantes do plano ${tier === "free" ? "Gratuito" : "Pro"}. Faça upgrade para adicionar mais participantes.`,
      limit: limits.maxMembersPerPool,
    };
  }
  return { allowed: true };
}

// ─── TOURNAMENTS ──────────────────────────────────────────────────────────────

export async function getGlobalTournaments(onlyAvailable = true): Promise<Tournament[]> {
  const db = await getDb();
  if (!db) return [];
  const condition = onlyAvailable
    ? and(eq(tournaments.isGlobal, true), eq(tournaments.isAvailable, true))
    : eq(tournaments.isGlobal, true);
  return db.select().from(tournaments).where(condition).orderBy(desc(tournaments.createdAt));
}

export async function getTournamentById(id: number): Promise<Tournament | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return result[0];
}

export async function createTournament(data: InsertTournament): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournaments).values(data);
  return (result[0] as any).insertId;
}

export async function updateTournament(id: number, data: Partial<InsertTournament>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournaments).set(data).where(eq(tournaments.id, id));
}

export async function getTournamentPhases(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tournamentPhases)
    .where(eq(tournamentPhases.tournamentId, tournamentId))
    .orderBy(asc(tournamentPhases.order));
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────

export async function getTeamsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(eq(teams.tournamentId, tournamentId)).orderBy(asc(teams.groupName), asc(teams.name));
}

export async function createTeam(data: InsertTeam): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(teams).values(data);
  return (result[0] as any).insertId;
}

// ─── GAMES ───────────────────────────────────────────────────────────────────────────────
/**
 * Calcula se as probabilidades pré-jogo de uma liga são confiáveis.
 *
 * Critério: stddev do comparison.total.home >= 20 para jogos agendados da liga.
 * Ligas com stddev alto têm dados genuinamente variados por jogo (Copa do Mundo,
 * Libertadores, Sudamericana). Ligas com stddev baixo usam buckets genéricos
 * (Brasileirão Série A/B/C/D).
 *
 * Resultado é calculado dinamicamente — reflete o estado atual dos dados no banco.
 */
export async function getPredictionReliability(apiFootballLeagueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.execute(sql`
      SELECT
        STDDEV(CAST(
          REPLACE(
            JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home')),
            '%', ''
          ) AS DECIMAL(5,1)
        )) as stddev_cmp
      FROM games g
      JOIN tournaments t ON g.tournamentId = t.id
      WHERE g.status = 'scheduled'
        AND g.aiPrediction IS NOT NULL
        AND JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home') IS NOT NULL
        AND t.apiFootballLeagueId = ${apiFootballLeagueId}
    `);
    const rows = result[0] as unknown as any[];
    const stddev = parseFloat(rows?.[0]?.stddev_cmp ?? "0");
    return stddev >= 20;
  } catch {
    return false;
  }
}

export async function getGamesByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(games)
    .where(eq(games.tournamentId, tournamentId))
    .orderBy(asc(games.matchDate));
}

export async function getGameById(id: number): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return result[0];
}

export async function createGame(data: typeof games.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(games).values(data);
  return (result[0] as any).insertId;
}

export async function updateGameResult(
  gameId: number,
  scoreA: number,
  scoreB: number,
  isZebra: boolean
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(games)
    .set({ scoreA, scoreB, status: "finished", isZebraResult: isZebra, manuallyEdited: true })
    .where(eq(games.id, gameId));
}

// ─── POOLS ────────────────────────────────────────────────────────────────────

export async function createPool(data: InsertPool): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pools).values(data);
  return (result[0] as any).insertId;
}

export async function getPoolById(id: number): Promise<Pool | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // Soft-delete: nunca expor bolões com status 'deleted'
  const result = await db.select().from(pools)
    .where(and(eq(pools.id, id), sql`${pools.status} != 'deleted'`))
    .limit(1);
  return result[0];
}

export async function getPoolBySlug(slug: string): Promise<Pool | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // Soft-delete: nunca expor bolões com status 'deleted'
  const result = await db.select().from(pools)
    .where(and(eq(pools.slug, slug), sql`${pools.status} != 'deleted'`))
    .limit(1);
  return result[0];
}

export async function getPoolByInviteToken(token: string): Promise<Pool | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pools).where(eq(pools.inviteToken, token)).limit(1);
  return result[0];
}

export async function getPoolByInviteCode(code: string): Promise<Pool | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pools).where(eq(pools.inviteCode, code.toUpperCase())).limit(1);
  return result[0];
}

export async function getPoolsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ pool: pools, member: poolMembers })
    .from(poolMembers)
    .innerJoin(pools, eq(poolMembers.poolId, pools.id))
    .where(
      and(
        eq(poolMembers.userId, userId),
        sql`${pools.status} IN ('active', 'finished', 'awaiting_conclusion', 'concluded')` // archived e deleted excluídos intencionalmente
      )
    )
    .orderBy(desc(pools.createdAt));
}

export async function updatePool(id: number, data: Partial<InsertPool>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pools).set(data).where(eq(pools.id, id));
}

export async function countActivePoolsByOwner(ownerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pools)
    .where(and(eq(pools.ownerId, ownerId), eq(pools.status, "active")));
  return result[0]?.count ?? 0;
}

// ─── POOL MEMBERS ─────────────────────────────────────────────────────────────

export async function addPoolMember(
  poolId: number,
  userId: number,
  role: "organizer" | "participant" = "participant"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(poolMembers)
    .values({ poolId, userId, role })
    .onDuplicateKeyUpdate({ set: { role } });
}

export async function getPoolMember(poolId: number, userId: number): Promise<PoolMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(poolMembers)
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getPoolMembers(poolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ member: poolMembers, user: users })
    .from(poolMembers)
    .innerJoin(users, eq(poolMembers.userId, users.id))
    .where(eq(poolMembers.poolId, poolId))
    .orderBy(asc(poolMembers.joinedAt));
}

export async function countPoolMembers(poolId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));
  return result[0]?.count ?? 0;
}

export async function removePoolMember(poolId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(poolMembers)
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)));
}

export async function updatePoolMemberRole(
  poolId: number,
  userId: number,
  role: "organizer" | "participant"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(poolMembers)
    .set({ role })
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)));
}

// ─── POOL SCORING RULES ───────────────────────────────────────────────────────

export async function getPoolScoringRules(poolId: number): Promise<PoolScoringRules | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(poolScoringRules)
    .where(eq(poolScoringRules.poolId, poolId))
    .limit(1);
  return result[0];
}

export async function upsertPoolScoringRules(
  poolId: number,
  data: Partial<typeof poolScoringRules.$inferInsert>,
  updatedBy: number
) {
  const db = await getDb();
  if (!db) return;
  const values = { poolId, ...data, updatedBy };
  await db
    .insert(poolScoringRules)
    .values(values)
    .onDuplicateKeyUpdate({ set: { ...data, updatedBy } });
}

// ─── POOL MEMBER STATS ────────────────────────────────────────────────────────

export async function getPoolRanking(poolId: number) {
  const db = await getDb();
  if (!db) return [];

  // LEFT JOIN: retorna TODOS os membros ativos, mesmo sem entrada em pool_member_stats
  // Membros sem pontuação aparecem com stats zeradas (0 pts)
  const rows = await db
    .select({
      // Campos do usuário
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
      userCreatedAt: users.createdAt,
      // Stats (null quando não há entrada em pool_member_stats)
      statsId: poolMemberStats.id,
      totalPoints: poolMemberStats.totalPoints,
      exactScoreCount: poolMemberStats.exactScoreCount,
      correctResultCount: poolMemberStats.correctResultCount,
      goalDiffCount: poolMemberStats.goalDiffCount,
      oneTeamGoalsCount: poolMemberStats.oneTeamGoalsCount,
      totalGoalsCount: poolMemberStats.totalGoalsCount,
      landslideCount: poolMemberStats.landslideCount,
      zebraCount: poolMemberStats.zebraCount,
      totalBets: poolMemberStats.totalBets,
      rankPosition: poolMemberStats.rankPosition,
      statsUpdatedAt: poolMemberStats.updatedAt,
    })
    .from(poolMembers)
    .innerJoin(users, eq(poolMembers.userId, users.id))
    .leftJoin(
      poolMemberStats,
      and(
        eq(poolMemberStats.poolId, poolMembers.poolId),
        eq(poolMemberStats.userId, poolMembers.userId)
      )
    )
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.isBlocked, false)))
    // Desempate conforme SISTEMA-PONTUACAO-PLAKR.md §8:
    // 1. Total de pontos (maior primeiro; NULL = 0 — vai para o fim)
    // 2. Placares exatos (maior primeiro)
    // 3. Resultados corretos (maior primeiro)
    // 4. Data de cadastro (mais antigo primeiro)
    .orderBy(
      desc(sql`COALESCE(${poolMemberStats.totalPoints}, 0)`),
      desc(sql`COALESCE(${poolMemberStats.exactScoreCount}, 0)`),
      desc(sql`COALESCE(${poolMemberStats.correctResultCount}, 0)`),
      asc(users.createdAt)
    );

  // Normalizar para o formato { stats, user } esperado pelo frontend
  return rows.map((r) => ({
    stats: {
      id: r.statsId ?? 0,
      poolId,
      userId: r.userId,
      totalPoints: r.totalPoints ?? 0,
      exactScoreCount: r.exactScoreCount ?? 0,
      correctResultCount: r.correctResultCount ?? 0,
      goalDiffCount: r.goalDiffCount ?? 0,
      oneTeamGoalsCount: r.oneTeamGoalsCount ?? 0,
      totalGoalsCount: r.totalGoalsCount ?? 0,
      landslideCount: r.landslideCount ?? 0,
      zebraCount: r.zebraCount ?? 0,
      totalBets: r.totalBets ?? 0,
      rankPosition: r.rankPosition ?? null,
      updatedAt: r.statsUpdatedAt ?? new Date(),
    },
    user: {
      id: r.userId,
      name: r.userName,
      email: r.userEmail,
      avatarUrl: r.userAvatarUrl,
      createdAt: r.userCreatedAt,
    },
    hasStats: r.statsId !== null, // indica se já tem pontuação real
  }));
}

export async function upsertPoolMemberStats(
  poolId: number,
  userId: number,
  data: Partial<typeof poolMemberStats.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(poolMemberStats)
    .values({ poolId, userId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ─── BETS ─────────────────────────────────────────────────────────────────────

export async function getBetsByPool(poolId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId
    ? and(eq(bets.poolId, poolId), eq(bets.userId, userId))
    : eq(bets.poolId, poolId);
  return db.select().from(bets).where(conditions).orderBy(desc(bets.createdAt));
}

export async function getBetByPoolUserGame(
  poolId: number,
  userId: number,
  gameId: number
): Promise<Bet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bets)
    .where(and(eq(bets.poolId, poolId), eq(bets.userId, userId), eq(bets.gameId, gameId)))
    .limit(1);
  return result[0];
}

export async function upsertBet(data: InsertBet) {
  const db = await getDb();
  if (!db) return;
  await db.insert(bets).values(data).onDuplicateKeyUpdate({
    set: {
      predictedScoreA: data.predictedScoreA,
      predictedScoreB: data.predictedScoreB,
    },
  });
}

export async function getBetsByGame(gameId: number, poolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bets)
    .where(and(eq(bets.gameId, gameId), eq(bets.poolId, poolId)));
}

export async function updateBetScore(betId: number, data: Partial<typeof bets.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bets).set(data).where(eq(bets.id, betId));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ─── ADS ──────────────────────────────────────────────────────────────────────

export async function getActiveAds(position?: string) {
  const db = await getDb();
  if (!db) return [];

  // [S-ADS-1] Verificar se Publicidade Local (banners próprios) está habilitada
  const settings = await db
    .select({ adsLocalEnabled: platformSettings.adsLocalEnabled })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  if (settings.length > 0 && settings[0].adsLocalEnabled === false) return [];

  const now = new Date();
  const conditions = position
    ? and(
        eq(ads.isActive, true),
        eq(ads.position, position as any),
        sql`(${ads.startAt} IS NULL OR ${ads.startAt} <= ${now})`,
        sql`(${ads.endAt} IS NULL OR ${ads.endAt} >= ${now})`
      )
    : and(
        eq(ads.isActive, true),
        sql`(${ads.startAt} IS NULL OR ${ads.startAt} <= ${now})`,
        sql`(${ads.endAt} IS NULL OR ${ads.endAt} >= ${now})`
      );
  return db.select().from(ads).where(conditions).orderBy(asc(ads.sortOrder));
}

// ─── ADMIN LOGS ───────────────────────────────────────────────────────────────

export async function createAdminLog(
  adminId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, unknown>,
  poolId?: number,
  opts?: {
    previousValue?: Record<string, unknown>;
    correlationId?: string;
    level?: "info" | "warn" | "error";
    ipAddress?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminLogs).values({
    adminId,
    action,
    entityType,
    entityId,
    details,
    poolId,
    previousValue: opts?.previousValue,
    correlationId: opts?.correlationId,
    level: opts?.level ?? "info",
    ipAddress: opts?.ipAddress,
  });
}

// ─── EMAIL QUEUE ──────────────────────────────────────────────────────────────

export async function enqueueEmail(data: typeof emailQueue.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailQueue).values(data);
}

export async function getPendingEmails(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailQueue)
    .where(and(eq(emailQueue.status, "pending"), lt(emailQueue.attempts, 3)))
    .orderBy(asc(emailQueue.createdAt))
    .limit(limit);
}

// ─── POOL DELETION CANDIDATES ─────────────────────────────────────────────────

export async function getPoolsDueForDeletion() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.status, "finished"),
        sql`${pools.scheduledDeleteAt} IS NOT NULL`,
        lt(pools.scheduledDeleteAt, now)
      )
    );
}

// ─── FASE 2 GAPS — Anonimização, Transferência Automática, Recálculo ──────────

/**
 * Anonimiza o nome de um usuário removido, preservando palpites e rankings históricos.
 * Formato: "Usuário_Removido_[ID_Curto]"
 */
export async function anonymizeUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const shortId = userId.toString(36).toUpperCase().slice(-6);
  await db
    .update(users)
    .set({ name: `Usuário_Removido_${shortId}`, email: null, isBlocked: true })
    .where(eq(users.id, userId));
}

/**
 * Busca o membro mais antigo de um bolão (excluindo o organizador atual) para transferência automática.
 */
export async function getOldestMember(poolId: number, excludeUserId: number): Promise<PoolMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(poolMembers)
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        eq(poolMembers.role, "participant"),
        sql`${poolMembers.userId} != ${excludeUserId}`
      )
    )
    .orderBy(asc(poolMembers.joinedAt))
    .limit(1);
  return result[0];
}

/**
 * Retorna todos os bolões onde o usuário é o único organizador.
 */
export async function getPoolsWhereOnlyOrganizer(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Bolões onde este usuário é organizador
  const ownedPools = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .where(and(eq(poolMembers.userId, userId), eq(poolMembers.role, "organizer")));

  const result = [];
  for (const { poolId } of ownedPools) {
    // Verificar se há outro organizador
    const otherOrganizers = await db
      .select()
      .from(poolMembers)
      .where(
        and(
          eq(poolMembers.poolId, poolId),
          eq(poolMembers.role, "organizer"),
          sql`${poolMembers.userId} != ${userId}`
        )
      )
      .limit(1);
    if (otherOrganizers.length === 0) {
      result.push(poolId);
    }
  }
  return result;
}

/**
 * Busca todos os palpites de um jogo em TODOS os bolões que usam aquele campeonato.
 * Usado para recálculo retroativo quando o resultado de um jogo é corrigido.
 */
export async function getBetsByGameAllPools(gameId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bets)
    .where(eq(bets.gameId, gameId));
}

/**
 * Retorna todos os bolões que contêm jogos de um determinado campeonato.
 */
export async function getPoolsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: pools.id, slug: pools.slug, ownerId: pools.ownerId })
    .from(pools)
    .where(and(eq(pools.tournamentId, tournamentId), eq(pools.status, "active")));
}

/**
 * Registra resultado de jogo por organizador Pro (apenas bolões com campeonato personalizado).
 */
export async function getGamesByPool(poolId: number) {
  const db = await getDb();
  if (!db) return [];
  // Busca o campeonato do bolão e retorna os jogos
  const pool = await getPoolById(poolId);
  if (!pool) return [];
  return db
    .select()
    .from(games)
    .where(eq(games.tournamentId, pool.tournamentId))
    .orderBy(asc(games.matchDate));
}

/**
 * Recalcula os stats de um membro específico num bolão com base em todos os seus palpites.
 */
export async function recalculateMemberStats(poolId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const memberBets = await db
    .select()
    .from(bets)
    .where(and(eq(bets.poolId, poolId), eq(bets.userId, userId)));

  let totalPoints = 0;
  let exactScoreCount = 0;
  let correctResultCount = 0;
  let wrongCount = 0;

  for (const bet of memberBets) {
    totalPoints += bet.pointsEarned ?? 0;
    if (bet.resultType === "exact") exactScoreCount++;
    else if (bet.resultType === "correct_result") correctResultCount++;
    else if (bet.resultType === "wrong") wrongCount++;
  }

  await upsertPoolMemberStats(poolId, userId, {
    totalPoints,
    exactScoreCount,
    correctResultCount,
    totalBets: memberBets.length,
  });
}

// ─── HISTÓRICO DE POSIÇÕES FINAIS ──────────────────────────────────────────

/**
 * Registra as posições finais de todos os membros ao encerrar um bolão.
 * Usa INSERT IGNORE para ser idempotente (não duplica se chamado duas vezes).
 */
export async function saveFinalPositions(
  poolId: number,
  poolName: string,
  tournamentName: string | null,
  ranking: Array<{ userId: number; position: number; totalPoints: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { poolFinalPositions } = await import("../drizzle/schema");
  const totalParticipants = ranking.length;
  for (const entry of ranking) {
    await db
      .insert(poolFinalPositions)
      .ignore()
      .values({
        userId: entry.userId,
        poolId,
        poolName,
        tournamentName: tournamentName ?? undefined,
        position: entry.position,
        totalPoints: entry.totalPoints,
        totalParticipants,
        finishedAt: new Date(),
      });
  }
}

/**
 * Retorna o histórico de posições finais de um usuário, ordenado por data decrescente.
 */
export async function getUserFinalPositions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { poolFinalPositions } = await import("../drizzle/schema");
  return db
    .select()
    .from(poolFinalPositions)
    .where(eq(poolFinalPositions.userId, userId))
    .orderBy(desc(poolFinalPositions.finishedAt));
}
