import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── USUÁRIOS E PLATAFORMA ────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  whatsappLink: varchar("whatsappLink", { length: 255 }),
  telegramLink: varchar("telegramLink", { length: 255 }),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CONFIGURAÇÕES DA PLATAFORMA (single-row) ─────────────────────────────────

export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").primaryKey().default(1),
  freeMaxParticipants: int("freeMaxParticipants").default(50).notNull(),
  freeMaxPools: int("freeMaxPools").default(2).notNull(),
  poolArchiveDays: int("poolArchiveDays").default(10).notNull(),
  defaultScoringExact: int("defaultScoringExact").default(10).notNull(),
  defaultScoringCorrect: int("defaultScoringCorrect").default(5).notNull(),
  defaultScoringBonusGoals: int("defaultScoringBonusGoals").default(3).notNull(),
  defaultScoringBonusDiff: int("defaultScoringBonusDiff").default(3).notNull(),
  defaultScoringBonusUpset: int("defaultScoringBonusUpset").default(1).notNull(),
  defaultScoringBonusOneTeam: int("defaultScoringBonusOneTeam").default(2).notNull(),
  defaultScoringBonusLandslide: int("defaultScoringBonusLandslide").default(5).notNull(),
  defaultLandslideMinDiff: int("defaultLandslideMinDiff").default(4).notNull(), // diferença mínima de gols para goleada (padrão da plataforma)
  defaultZebraThreshold: int("defaultZebraThreshold").default(75).notNull(), // % mínimo de apostas no favorito para zebra (padrão da plataforma)
  defaultTiebreakOrder: json("defaultTiebreakOrder")
    .$type<string[]>()
    .default(["points", "exact", "correct", "wrong", "registration_date"]),
  gaMeasurementId: varchar("gaMeasurementId", { length: 64 }),
  fbPixelId: varchar("fbPixelId", { length: 64 }),
  adNetworkScripts: json("adNetworkScripts").$type<Record<string, string>>(),
  stripePriceIdPro: varchar("stripePriceIdPro", { length: 128 }),
  stripeMonthlyPrice: int("stripeMonthlyPrice").default(2990),
  // VAPID keys para Web Push — gerenciadas pelo superadmin no painel
  vapidPublicKey: text("vapidPublicKey"),
  vapidPrivateKey: text("vapidPrivateKey"),
  vapidEmail: varchar("vapidEmail", { length: 320 }),
  pushEnabled: boolean("pushEnabled").default(false).notNull(),
  adsEnabled: boolean("adsEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;

// ─── PLANOS DE USUÁRIO (Stripe) ───────────────────────────────────────────────

export const userPlans = mysqlTable("user_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  plan: mysqlEnum("plan", ["free", "pro", "unlimited"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  planStartAt: timestamp("planStartAt"),
  planExpiresAt: timestamp("planExpiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPlan = typeof userPlans.$inferSelect;

// ─── CAMPEONATOS ──────────────────────────────────────────────────────────────

export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  isGlobal: boolean("isGlobal").default(false).notNull(),
  poolId: int("poolId"), // null = global, set = personalizado
  createdBy: int("createdBy").references(() => users.id),
  status: mysqlEnum("status", ["active", "finished", "archived"]).default("active").notNull(),
  country: varchar("country", { length: 10 }),
  season: varchar("season", { length: 10 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// ─── FASES DO CAMPEONATO ──────────────────────────────────────────────────────

export const tournamentPhases = mysqlTable("tournament_phases", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  key: varchar("key", { length: 64 }).notNull(), // ex: group_stage, round_of_16
  label: varchar("label", { length: 128 }).notNull(), // ex: Fase de Grupos
  enabled: boolean("enabled").default(true).notNull(),
  order: int("order").notNull(),
  slots: int("slots"),
  isKnockout: boolean("isKnockout").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TournamentPhase = typeof tournamentPhases.$inferSelect;

// ─── TIMES ────────────────────────────────────────────────────────────────────

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 10 }), // ex: BRA, ARG
  flagUrl: text("flagUrl"),
  groupName: varchar("groupName", { length: 10 }), // ex: A, B, ... L
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── JOGOS ────────────────────────────────────────────────────────────────────

export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  externalId: varchar("externalId", { length: 64 }),
  teamAId: int("teamAId").references(() => teams.id),
  teamBId: int("teamBId").references(() => teams.id),
  teamAName: varchar("teamAName", { length: 128 }), // fallback para mata-mata sem times definidos
  teamBName: varchar("teamBName", { length: 128 }),
  teamAFlag: text("teamAFlag"),
  teamBFlag: text("teamBFlag"),
  groupName: varchar("groupName", { length: 10 }),
  phase: varchar("phase", { length: 64 }).notNull().default("group_stage"),
  matchDate: timestamp("matchDate").notNull(),
  venue: varchar("venue", { length: 255 }),
  status: mysqlEnum("status", ["scheduled", "live", "finished", "cancelled"]).default("scheduled").notNull(),
  scoreA: int("scoreA"),
  scoreB: int("scoreB"),
  matchNumber: int("matchNumber"),
  sourceMatchAId: int("sourceMatchAId"), // FK self-reference
  sourceMatchBId: int("sourceMatchBId"), // FK self-reference
  sourceMatchARole: mysqlEnum("sourceMatchARole", ["winner", "runner_up"]),
  sourceMatchBRole: mysqlEnum("sourceMatchBRole", ["winner", "runner_up"]),
  isZebraResult: boolean("isZebraResult").default(false).notNull(),
  manuallyEdited: boolean("manuallyEdited").default(false).notNull(),
  importedFromSheets: boolean("importedFromSheets").default(false).notNull(),
  reminderSentAt: timestamp("reminderSentAt"), // controle de lembretes automáticos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

// ─── LOG DE IMPORTAÇÃO DE PLANILHAS ──────────────────────────────────────────

export const sheetsSyncLog = mysqlTable("sheets_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  sheetUrl: text("sheetUrl"),
  status: mysqlEnum("status", ["success", "error", "partial"]).notNull(),
  gamesImported: int("gamesImported").default(0).notNull(),
  gamesUpdated: int("gamesUpdated").default(0).notNull(),
  errors: json("errors").$type<string[]>(),
  triggeredBy: int("triggeredBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── BOLÕES ───────────────────────────────────────────────────────────────────

export const pools = mysqlTable("pools", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"),
  accessType: mysqlEnum("accessType", ["public", "private_code", "private_link"])
    .default("private_link")
    .notNull(),
  inviteCode: varchar("inviteCode", { length: 16 }),
  inviteToken: varchar("inviteToken", { length: 64 }),
  status: mysqlEnum("status", ["active", "finished", "archived", "deleted"])
    .default("active")
    .notNull(),
  finishedAt: timestamp("finishedAt"),
  scheduledDeleteAt: timestamp("scheduledDeleteAt"),
  ownerId: int("ownerId")
    .notNull()
    .references(() => users.id),
  tournamentId: int("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  plan: mysqlEnum("plan", ["free", "pro"]).default("free").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  planExpiresAt: timestamp("planExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pool = typeof pools.$inferSelect;
// ─── MEMBROS DO BOLÃO ─────────────────────────────────────────────────────────

export const poolMembers = mysqlTable(
  "pool_members",
  {
    id: int("id").autoincrement().primaryKey(),
    poolId: int("poolId")
      .notNull()
      .references(() => pools.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    role: mysqlEnum("role", ["organizer", "participant"]).default("participant").notNull(),
    isBlocked: boolean("isBlocked").default(false).notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (t) => [unique("pool_member_unique").on(t.poolId, t.userId)]
);

export type PoolMember = typeof poolMembers.$inferSelect;
export type InsertPoolMember = typeof poolMembers.$inferInsert;

// ─── REGRAS DE PONTUAÇÃO DO BOLÃO ────────────────────────────────────────────

export const poolScoringRules = mysqlTable("pool_scoring_rules", {
  id: int("id").autoincrement().primaryKey(),
  poolId: int("poolId")
    .notNull()
    .unique()
    .references(() => pools.id),
  exactScorePoints: int("exactScorePoints").default(10).notNull(),
  correctResultPoints: int("correctResultPoints").default(5).notNull(),
  totalGoalsPoints: int("totalGoalsPoints").default(3).notNull(),
  goalDiffPoints: int("goalDiffPoints").default(3).notNull(),
  oneTeamGoalsPoints: int("oneTeamGoalsPoints").default(2).notNull(),
  landslidePoints: int("landslidePoints").default(5).notNull(),
  zebraPoints: int("zebraPoints").default(1).notNull(),
  zebraThreshold: int("zebraThreshold").default(75).notNull(), // % mínimo de apostas no favorito para considerar zebra
  landslideMinDiff: int("landslideMinDiff").default(4).notNull(), // diferença mínima de gols para goleada
  zebraCountDraw: boolean("zebraCountDraw").default(false).notNull(),
  zebraEnabled: boolean("zebraEnabled").default(true).notNull(),
  bettingDeadlineMinutes: int("bettingDeadlineMinutes").default(60).notNull(), // minutos antes do jogo
  tiebreakOrder: json("tiebreakOrder")
    .$type<string[]>()
    .default(["points", "exact", "correct", "wrong", "registration_date"]),
  publicProfilesEnabled: boolean("publicProfilesEnabled").default(true).notNull(),
  groupLinksEnabled: boolean("groupLinksEnabled").default(false).notNull(),
  whatsappGroupLink: varchar("whatsappGroupLink", { length: 255 }),
  telegramGroupLink: varchar("telegramGroupLink", { length: 255 }),
  groupLinksText: varchar("groupLinksText", { length: 255 }),
  poolSubtitle: varchar("poolSubtitle", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id),
});

export type PoolScoringRules = typeof poolScoringRules.$inferSelect;
export type InsertPoolScoringRules = typeof poolScoringRules.$inferInsert;

// ─── ESTATÍSTICAS DE MEMBROS DO BOLÃO ────────────────────────────────────────

export const poolMemberStats = mysqlTable(
  "pool_member_stats",
  {
    id: int("id").autoincrement().primaryKey(),
    poolId: int("poolId")
      .notNull()
      .references(() => pools.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    totalPoints: int("totalPoints").default(0).notNull(),
    exactScoreCount: int("exactScoreCount").default(0).notNull(),
    correctResultCount: int("correctResultCount").default(0).notNull(),
    goalDiffCount: int("goalDiffCount").default(0).notNull(),
    oneTeamGoalsCount: int("oneTeamGoalsCount").default(0).notNull(),
    totalGoalsCount: int("totalGoalsCount").default(0).notNull(),
    landslideCount: int("landslideCount").default(0).notNull(),
    zebraCount: int("zebraCount").default(0).notNull(),
    totalBets: int("totalBets").default(0).notNull(),
    rankPosition: int("rankPosition"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [unique("pool_member_stats_unique").on(t.poolId, t.userId)]
);

export type PoolMemberStats = typeof poolMemberStats.$inferSelect;

// ─── PALPITES ─────────────────────────────────────────────────────────────────

export const bets = mysqlTable(
  "bets",
  {
    id: int("id").autoincrement().primaryKey(),
    poolId: int("poolId")
      .notNull()
      .references(() => pools.id),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    gameId: int("gameId")
      .notNull()
      .references(() => games.id),
    predictedScoreA: int("predictedScoreA").notNull(),
    predictedScoreB: int("predictedScoreB").notNull(),
    pointsEarned: int("pointsEarned").default(0).notNull(),
    pointsExactScore: int("pointsExactScore").default(0).notNull(),
    pointsCorrectResult: int("pointsCorrectResult").default(0).notNull(),
    pointsTotalGoals: int("pointsTotalGoals").default(0).notNull(),
    pointsGoalDiff: int("pointsGoalDiff").default(0).notNull(),
    pointsOneTeamGoals: int("pointsOneTeamGoals").default(0).notNull(),
    pointsLandslide: int("pointsLandslide").default(0).notNull(),
    pointsZebra: int("pointsZebra").default(0).notNull(),
    isZebra: boolean("isZebra").default(false).notNull(),
    resultType: mysqlEnum("resultType", ["exact", "correct_result", "wrong", "pending"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [unique("bet_unique").on(t.poolId, t.userId, t.gameId)]
);

export type Bet = typeof bets.$inferSelect;
// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  poolId: int("poolId").references(() => pools.id),
  type: mysqlEnum("type", [
    "game_reminder",
    "ranking_update",
    "result_available",
    "system",
    "ad",
    "pool_closing",
    "pool_invite",
    "plan_expired",
    "plan_expiring",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedGameId: int("relatedGameId").references(() => games.id),
  // Rich notification fields
  imageUrl: varchar("imageUrl", { length: 500 }),
  actionUrl: varchar("actionUrl", { length: 500 }),
  actionLabel: varchar("actionLabel", { length: 100 }),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── PREFERÊNCIAS DE NOTIFICAÇÃO ─────────────────────────────────────────────

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id),
  // In-App (canal base — sempre ativo por padrão)
  inAppGameReminder: boolean("inAppGameReminder").default(true).notNull(),
  inAppRankingUpdate: boolean("inAppRankingUpdate").default(true).notNull(),
  inAppResultAvailable: boolean("inAppResultAvailable").default(true).notNull(),
  inAppSystem: boolean("inAppSystem").default(true).notNull(),
  inAppAd: boolean("inAppAd").default(true).notNull(),
  // Push (Web Push — ativo por padrão apenas para eventos relevantes)
  pushGameReminder: boolean("pushGameReminder").default(true).notNull(),
  pushRankingUpdate: boolean("pushRankingUpdate").default(false).notNull(),
  pushResultAvailable: boolean("pushResultAvailable").default(true).notNull(),
  pushSystem: boolean("pushSystem").default(false).notNull(),
  pushAd: boolean("pushAd").default(false).notNull(),
  // E-mail (opt-in explícito — inativo por padrão)
  emailGameReminder: boolean("emailGameReminder").default(false).notNull(),
  emailRankingUpdate: boolean("emailRankingUpdate").default(false).notNull(),
  emailResultAvailable: boolean("emailResultAvailable").default(false).notNull(),
  emailSystem: boolean("emailSystem").default(false).notNull(),
  emailAd: boolean("emailAd").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ASSINATURAS PUSH (Web Push VAPID) ──────────────────────────────────────

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 128 }).notNull(),
  userAgent: varchar("userAgent", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── FILA DE E-MAILS ──────────────────────────────────────────────────────────

export const emailQueue = mysqlTable("email_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  toName: varchar("toName", { length: 255 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PUBLICIDADE ──────────────────────────────────────────────────────────────

export const ads = mysqlTable("ads", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["banner", "video", "script"]).notNull(),
  assetUrl: text("assetUrl"),
  scriptCode: text("scriptCode"),
  linkUrl: text("linkUrl"),
  position: mysqlEnum("position", ["sidebar", "top", "between_sections", "bottom", "popup"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  startAt: timestamp("startAt"),
  endAt: timestamp("endAt"),
  popupFrequency: mysqlEnum("popupFrequency", ["session", "daily", "always"]).default("session"),
  device: mysqlEnum("device", ["all", "desktop", "mobile"]).default("all").notNull(),
  carouselInterval: int("carouselInterval").default(5000).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const adClicks = mysqlTable("ad_clicks", {
  id: int("id").autoincrement().primaryKey(),
  adId: int("adId")
    .notNull()
    .references(() => ads.id),
  userId: int("userId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── LOGS DE ADMINISTRAÇÃO ────────────────────────────────────────────────────

export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId")
    .notNull()
    .references(() => users.id),
  poolId: int("poolId").references(() => pools.id),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  details: json("details").$type<Record<string, unknown>>(),
  previousValue: json("previousValue").$type<Record<string, unknown>>(),
  correlationId: varchar("correlationId", { length: 36 }),
  level: mysqlEnum("level", ["info", "warn", "error"]).default("info").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── TEMPLATES DE MENSAGENS AUTOMÁTICAS ─────────────────────────────────────
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["game_reminder", "result_available", "ranking_update"]).notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  // Templates in-app
  titleTemplate: varchar("titleTemplate", { length: 255 }).notNull(),
  bodyTemplate: text("bodyTemplate").notNull(),
  // Templates push
  pushTitleTemplate: varchar("pushTitleTemplate", { length: 255 }),
  pushBodyTemplate: text("pushBodyTemplate"),
  // Templates e-mail
  emailSubjectTemplate: varchar("emailSubjectTemplate", { length: 255 }),
  emailBodyTemplate: text("emailBodyTemplate"),
  updatedBy: int("updatedBy").references(() => users.id),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// ─── BADGES CONFIGURÁVEIS ───────────────────────────────────────────────────

// Tipos de critério disponíveis para badges
export const BADGE_CRITERION_TYPES = [
  "exact_scores_career",       // Placares exatos na carreira >= N
  "zebra_scores_career",       // Zebras acertadas na carreira >= N
  "top3_pools",                // Top 3 em bolões >= N
  "first_place_pools",         // 1º lugar em bolões >= N
  "accuracy_in_pool",          // Taxa de acerto >= N% em um bolão completo (mín. 10 jogos)
  "complete_pool_no_blank",    // Bolões completados sem jogo em branco >= N
  "consecutive_correct",       // Sequência de acertos consecutivos >= N
  "referrals_count",           // Convites aceitos (cadastros via link) >= N
] as const;

export type BadgeCriterionType = typeof BADGE_CRITERION_TYPES[number];

export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  iconUrl: text("iconUrl"),                          // URL S3 do SVG
  criterionType: varchar("criterionType", { length: 64 }).notNull(), // BadgeCriterionType
  criterionValue: int("criterionValue").notNull(),   // Valor mínimo para o critério
  isRetroactive: boolean("isRetroactive").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: int("badgeId").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  notified: boolean("notified").default(false).notNull(), // se já enviou notificação
}, (t) => ({
  unique_user_badge: unique().on(t.userId, t.badgeId),
}));

export type UserBadge = typeof userBadges.$inferSelect;

// ─── PROGRAMA DE CONVITES (MEMBER-GET-MEMBER) ───────────────────────────────

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  // Código único gerado para o usuário convidador (base36, 8 chars)
  inviteCode: varchar("inviteCode", { length: 16 }).notNull().unique(),
  // Usuário que gerou o convite
  inviterId: int("inviterId").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Usuário que se cadastrou via convite (null enquanto não usado)
  inviteeId: int("inviteeId").references(() => users.id, { onDelete: "set null" }),
  // Quando o convidado se cadastrou
  registeredAt: timestamp("registeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── EXPORTS DE TIPOS ADICIONAIS ────────────────────────────────────────────
export type InsertUserPlan = typeof userPlans.$inferInsert;
export type InsertPool = typeof pools.$inferInsert;
export type InsertBet = typeof bets.$inferInsert;
