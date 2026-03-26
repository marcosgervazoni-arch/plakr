/**
 * Plakr! — Admin Dashboard Router
 * Procedures exclusivas do Super Admin para inteligência de negócio,
 * saúde do sistema, assinaturas e gestão avançada.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAdminLog, getPlatformSettings, upsertUserPlan } from "../db";
import { Err, PoolErr, TournamentErr, UserErr } from "../errors";

// ─── MIDDLEWARE ADMIN ─────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw Err.adminOnly();
  }
  return next({ ctx });
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Retorna o início do mês N meses atrás (UTC) */
function monthStart(monthsAgo: number): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d;
}

/** Formata data como "MMM/YY" em pt-BR */
function fmtMonth(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export const adminDashboardRouter = router({

  // ─── SÉRIE TEMPORAL DE CRESCIMENTO ──────────────────────────────────────────
  getGrowthSeries: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { users: usersT, pools: poolsT, bets: betsT } = await import("../../drizzle/schema");
    const { count, gte, lt, and, ne } = await import("drizzle-orm");

    const months = 6;
    const series = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = monthStart(i);
      const end = monthStart(i - 1 < 0 ? -1 : i - 1);
      // Para o mês atual, end = agora
      const endDate = i === 0 ? new Date() : end;

      const [[usersCount], [poolsCount], [betsCount]] = await Promise.all([
        db.select({ c: count() }).from(usersT).where(
          and(gte(usersT.createdAt, start), lt(usersT.createdAt, endDate))
        ),
        db.select({ c: count() }).from(poolsT).where(
          and(gte(poolsT.createdAt, start), lt(poolsT.createdAt, endDate), ne(poolsT.status, "deleted"))
        ),
        db.select({ c: count() }).from(betsT).where(
          and(gte(betsT.createdAt, start), lt(betsT.createdAt, endDate))
        ),
      ]);

      series.push({
        month: fmtMonth(start),
        users: Number(usersCount?.c ?? 0),
        pools: Number(poolsCount?.c ?? 0),
        bets: Number(betsCount?.c ?? 0),
      });
    }

    return series;
  }),

  // ─── STATS ENRIQUECIDAS (DASHBOARD) ──────────────────────────────────────────
  getEnrichedStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { users: usersT, pools: poolsT, bets: betsT, tournaments: tourT, userPlans: plansT } = await import("../../drizzle/schema");
    const { count, eq, ne, gte, and, sql } = await import("drizzle-orm");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      [usersCount],
      [poolsCount],
      [activeCount],
      [proCount],
      [betsCount],
      [tourCount],
      [dauCount],
      [wauCount],
      [betsToday],
    ] = await Promise.all([
      db.select({ c: count() }).from(usersT),
      db.select({ c: count() }).from(poolsT).where(ne(poolsT.status, "deleted")),
      db.select({ c: count() }).from(poolsT).where(and(eq(poolsT.status, "active"), ne(poolsT.status, "deleted"))),
      db.select({ c: count() }).from(poolsT).where(and(eq(poolsT.plan, "pro"), ne(poolsT.status, "deleted"))),
      db.select({ c: count() }).from(betsT),
      db.select({ c: count() }).from(tourT),
      db.select({ c: count() }).from(usersT).where(gte(usersT.lastSignedIn, todayStart)),
      db.select({ c: count() }).from(usersT).where(gte(usersT.lastSignedIn, weekStart)),
      db.select({ c: count() }).from(betsT).where(gte(betsT.createdAt, todayStart)),
    ]);

    // MRR estimado: bolões Pro ativos × preço configurado
    const settings = await getPlatformSettings();
    const monthlyPrice = settings?.stripeMonthlyPrice ?? 2990; // centavos
    const totalPools = Number(poolsCount?.c ?? 0);
    const proPools = Number(proCount?.c ?? 0);
    const mrrCents = proPools * monthlyPrice;
    const conversionRate = totalPools > 0 ? Math.round((proPools / totalPools) * 100) : 0;

    return {
      totalUsers: Number(usersCount?.c ?? 0),
      totalPools,
      activePools: Number(activeCount?.c ?? 0),
      proPlans: proPools,
      totalBets: Number(betsCount?.c ?? 0),
      totalTournaments: Number(tourCount?.c ?? 0),
      dau: Number(dauCount?.c ?? 0),
      wau: Number(wauCount?.c ?? 0),
      betsToday: Number(betsToday?.c ?? 0),
      mrrCents,
      mrrBrl: mrrCents / 100,
      arrBrl: (mrrCents * 12) / 100,
      conversionRate,
    };
  }),

  // ─── ESTATÍSTICAS DE ASSINATURAS ──────────────────────────────────────────────
  getSubscriptionStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { pools: poolsT, users: usersT } = await import("../../drizzle/schema");
    const { eq, ne, and, gte, lt, isNotNull, sql } = await import("drizzle-orm");

    const settings = await getPlatformSettings();
    const monthlyPrice = settings?.stripeMonthlyPrice ?? 2990;

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Todos os bolões Pro (não deletados)
    const proPools = await db.select({
      id: poolsT.id,
      name: poolsT.name,
      slug: poolsT.slug,
      ownerId: poolsT.ownerId,
      planExpiresAt: poolsT.planExpiresAt,
      stripeSubscriptionId: poolsT.stripeSubscriptionId,
      createdAt: poolsT.createdAt,
    }).from(poolsT).where(
      and(eq(poolsT.plan, "pro"), ne(poolsT.status, "deleted"))
    );

    // Bolões que viraram Pro no último mês (novos)
    const newThisMonth = proPools.filter(p =>
      p.createdAt && p.createdAt >= thirtyDaysAgo
    ).length;

    // Bolões Pro que expiraram no último mês (churn)
    const churnedLastMonth = await db.select({ c: sql<number>`COUNT(*)` })
      .from(poolsT)
      .where(and(
        eq(poolsT.plan, "free"),
        ne(poolsT.status, "deleted"),
        isNotNull(poolsT.stripeSubscriptionId),
        gte(poolsT.updatedAt, thirtyDaysAgo),
      ));
    const churned = Number(churnedLastMonth[0]?.c ?? 0);

    // Vencendo em 7 dias
    const expiringSoon = proPools.filter(p =>
      p.planExpiresAt && p.planExpiresAt <= sevenDaysFromNow && p.planExpiresAt > now
    );

    // Buscar nomes dos donos
    const ownerIds = Array.from(new Set(proPools.map(p => p.ownerId)));
    let ownerMap: Record<number, string> = {};
    if (ownerIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const owners = await db.select({ id: usersT.id, name: usersT.name, email: usersT.email })
        .from(usersT).where(inArray(usersT.id, ownerIds));
      ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name ?? o.email ?? `#${o.id}`]));
    }

    const mrrCents = proPools.length * monthlyPrice;
    const ticketMedio = proPools.length > 0 ? monthlyPrice / 100 : 0;
    const prevMonthPro = proPools.length - newThisMonth + churned;
    const churnRate = prevMonthPro > 0 ? Math.round((churned / prevMonthPro) * 100) : 0;

    return {
      totalPro: proPools.length,
      newThisMonth,
      churned,
      churnRate,
      mrrBrl: mrrCents / 100,
      arrBrl: (mrrCents * 12) / 100,
      ticketMedio,
      expiringSoon: expiringSoon.length,
      subscriptions: proPools.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        ownerId: p.ownerId,
        ownerName: ownerMap[p.ownerId] ?? `#${p.ownerId}`,
        planExpiresAt: p.planExpiresAt,
        stripeSubscriptionId: p.stripeSubscriptionId,
        status: !p.planExpiresAt
          ? "active"
          : p.planExpiresAt < now
          ? "expired"
          : p.planExpiresAt <= sevenDaysFromNow
          ? "expiring_soon"
          : "active",
      })),
    };
  }),

  // ─── SAÚDE DO SISTEMA ──────────────────────────────────────────────────────────
  getSystemHealth: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { emailQueue, pushSubscriptions, adminLogs } = await import("../../drizzle/schema");
    const { count, eq, gte, desc } = await import("drizzle-orm");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      [pendingEmails],
      [sentToday],
      [failedEmails],
      [pushSubs],
      recentErrors,
    ] = await Promise.all([
      db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "pending")),
      db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "sent")).then(async () => {
        return db.select({ c: count() }).from(emailQueue).where(
          eq(emailQueue.status, "sent")
        );
      }),
      db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "failed")),
      db.select({ c: count() }).from(pushSubscriptions),
      db.select({
        id: adminLogs.id,
        action: adminLogs.action,
        entityType: adminLogs.entityType,
        level: adminLogs.level,
        createdAt: adminLogs.createdAt,
      }).from(adminLogs)
        .where(eq(adminLogs.level, "error"))
        .orderBy(desc(adminLogs.createdAt))
        .limit(5),
    ]);

    // Sent today separado
    const [sentTodayCount] = await db.select({ c: count() }).from(emailQueue).where(
      eq(emailQueue.status, "sent")
    );

    return {
      emailQueue: {
        pending: Number(pendingEmails?.c ?? 0),
        sentToday: Number(sentTodayCount?.c ?? 0),
        failed: Number(failedEmails?.c ?? 0),
      },
      pushSubscriptions: Number(pushSubs?.c ?? 0),
      recentErrors,
      // Status dos cron jobs (inferido pelo timestamp do último log)
      serverTime: now.toISOString(),
    };
  }),

  // ─── PROGRAMA DE CONVITES ──────────────────────────────────────────────────────
  getReferralStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { referrals, users: usersT } = await import("../../drizzle/schema");
    const { count, eq, isNotNull, sql } = await import("drizzle-orm");

    const [[total], [accepted]] = await Promise.all([
      db.select({ c: count() }).from(referrals),
      db.select({ c: count() }).from(referrals).where(isNotNull(referrals.registeredAt)),
    ]);

    const totalCount = Number(total?.c ?? 0);
    const acceptedCount = Number(accepted?.c ?? 0);
    const conversionRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

    // Top convitadores
    const topInviters = await db.select({
      inviterId: referrals.inviterId,
      name: usersT.name,
      email: usersT.email,
      avatarUrl: usersT.avatarUrl,
      total: count(),
      accepted: sql<number>`SUM(CASE WHEN ${referrals.registeredAt} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
      .from(referrals)
      .leftJoin(usersT, eq(usersT.id, referrals.inviterId))
      .groupBy(referrals.inviterId, usersT.name, usersT.email, usersT.avatarUrl)
      .orderBy(sql`SUM(CASE WHEN ${referrals.registeredAt} IS NOT NULL THEN 1 ELSE 0 END) DESC`)
      .limit(10);

    return {
      total: totalCount,
      accepted: acceptedCount,
      pending: totalCount - acceptedCount,
      conversionRate,
      topInviters: topInviters.map(r => ({
        userId: r.inviterId,
        name: r.name ?? r.email ?? `#${r.inviterId}`,
        avatarUrl: r.avatarUrl,
        total: Number(r.total),
        accepted: Number(r.accepted),
      })),
    };
  }),

  // ─── LOGS DE AUDITORIA COM PAGINAÇÃO ──────────────────────────────────────────
  getAuditLogsPaged: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      cursor: z.number().optional(), // ID do último item carregado
      adminId: z.number().optional(),
      level: z.enum(["all", "info", "warn", "error"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { logs: [], nextCursor: null };
      const { adminLogs, users: usersT } = await import("../../drizzle/schema");
      const { desc, eq, lt, and, inArray } = await import("drizzle-orm");

      const conditions = [];
      if (input.cursor) conditions.push(lt(adminLogs.id, input.cursor));
      if (input.adminId) conditions.push(eq(adminLogs.adminId, input.adminId));
      if (input.level !== "all") conditions.push(eq(adminLogs.level, input.level as "info" | "warn" | "error"));

      const logs = await db.select({
        id: adminLogs.id,
        adminId: adminLogs.adminId,
        action: adminLogs.action,
        entityType: adminLogs.entityType,
        entityId: adminLogs.entityId,
        details: adminLogs.details,
        previousValue: adminLogs.previousValue,
        correlationId: adminLogs.correlationId,
        level: adminLogs.level,
        ipAddress: adminLogs.ipAddress,
        createdAt: adminLogs.createdAt,
      }).from(adminLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adminLogs.id))
        .limit(input.limit + 1);

      const hasMore = logs.length > input.limit;
      const items = hasMore ? logs.slice(0, input.limit) : logs;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      // Buscar nomes dos admins
      const adminIds = Array.from(new Set(items.map(l => l.adminId)));
      let adminMap: Record<number, string> = {};
      if (adminIds.length > 0) {
        const { inArray: inArr } = await import("drizzle-orm");
        const admins = await db.select({ id: usersT.id, name: usersT.name })
          .from(usersT).where(inArr(usersT.id, adminIds));
        adminMap = Object.fromEntries(admins.map(a => [a.id, a.name ?? `Admin #${a.id}`]));
      }

      return {
        logs: items.map(l => ({ ...l, adminName: adminMap[l.adminId] ?? `Admin #${l.adminId}` })),
        nextCursor,
      };
    }),

  // ─── LISTA DE ADMINS (para filtro de logs) ────────────────────────────────────
  getAdminList: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { users: usersT } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return db.select({ id: usersT.id, name: usersT.name, avatarUrl: usersT.avatarUrl })
      .from(usersT).where(eq(usersT.role, "admin"));
  }),

  // ─── UPGRADE MANUAL DE PLANO DE BOLÃO ────────────────────────────────────────
  grantPoolPro: adminProcedure
    .input(z.object({
      poolId: z.number(),
      durationDays: z.number().min(1).max(365).default(30),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { pools: poolsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [pool] = await db.select().from(poolsT).where(eq(poolsT.id, input.poolId)).limit(1);
      if (!pool) throw PoolErr.notFound();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.durationDays);

      await db.update(poolsT).set({
        plan: "pro",
        planExpiresAt: expiresAt,
      }).where(eq(poolsT.id, input.poolId));

      await createAdminLog(ctx.user.id, "admin_grant_pool_pro", "pool", input.poolId, {
        durationDays: input.durationDays,
        expiresAt: expiresAt.toISOString(),
        reason: input.reason ?? "Concessão manual pelo admin",
      });

      return { success: true, expiresAt };
    }),

  // ─── REVOGAR PLANO PRO DE BOLÃO ───────────────────────────────────────────────
  revokePoolPro: adminProcedure
    .input(z.object({
      poolId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { pools: poolsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db.update(poolsT).set({
        plan: "free",
        planExpiresAt: null,
      }).where(eq(poolsT.id, input.poolId));

      await createAdminLog(ctx.user.id, "admin_revoke_pool_pro", "pool", input.poolId, {
        reason: input.reason ?? "Revogação manual pelo admin",
      });

      return { success: true };
    }),

  // ─── ALERTAS CONTEXTUAIS DO DASHBOARD ────────────────────────────────────────
  getDashboardAlerts: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { pools: poolsT, emailQueue, games: gamesT, adminLogs } = await import("../../drizzle/schema");
    const { count, eq, ne, and, gte, lt, isNotNull, desc } = await import("drizzle-orm");

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(now.getHours() - 24);

    const alerts: { type: "warning" | "error" | "info"; message: string; action?: string; actionPath?: string }[] = [];

    // Bolões Pro vencendo hoje
    const [expiringToday] = await db.select({ c: count() }).from(poolsT).where(
      and(eq(poolsT.plan, "pro"), ne(poolsT.status, "deleted"), lt(poolsT.planExpiresAt, todayEnd), gte(poolsT.planExpiresAt, now))
    );
    if (Number(expiringToday?.c ?? 0) > 0) {
      alerts.push({
        type: "warning",
        message: `${expiringToday.c} bolão(ões) Pro vencem hoje`,
        action: "Ver assinaturas",
        actionPath: "/admin/subscriptions",
      });
    }

    // Fila de email acumulada
    const [pendingEmails] = await db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "pending"));
    if (Number(pendingEmails?.c ?? 0) > 10) {
      alerts.push({
        type: "warning",
        message: `${pendingEmails.c} e-mails pendentes na fila`,
        action: "Ver saúde do sistema",
        actionPath: "/admin/system",
      });
    }

    // E-mails com falha
    const [failedEmails] = await db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "failed"));
    if (Number(failedEmails?.c ?? 0) > 0) {
      alerts.push({
        type: "error",
        message: `${failedEmails.c} e-mail(s) falharam no envio`,
        action: "Ver saúde do sistema",
        actionPath: "/admin/system",
      });
    }

    // Erros recentes nos logs
    const [recentErrors] = await db.select({ c: count() }).from(adminLogs).where(
      and(eq(adminLogs.level, "error"), gte(adminLogs.createdAt, twentyFourHoursAgo))
    );
    if (Number(recentErrors?.c ?? 0) > 0) {
      alerts.push({
        type: "error",
        message: `${recentErrors.c} erro(s) registrado(s) nas últimas 24h`,
        action: "Ver logs",
        actionPath: "/admin/audit",
      });
    }

    return alerts;
  }),

  // ─── JOGOS PENDENTES DE RESULTADO ────────────────────────────────────────────
  getPendingGames: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { games: gamesT, tournaments: tourT } = await import("../../drizzle/schema");
    const { eq, isNull, and, lt, desc } = await import("drizzle-orm");

    const now = new Date();

    // Jogos que já deveriam ter resultado (data passada) mas não têm
    const pending = await db.select({
      id: gamesT.id,
      teamAName: gamesT.teamAName,
      teamBName: gamesT.teamBName,
      matchDate: gamesT.matchDate,
      tournamentId: gamesT.tournamentId,
      tournamentName: tourT.name,
      phase: gamesT.phase,
    })
      .from(gamesT)
      .leftJoin(tourT, eq(tourT.id, gamesT.tournamentId))
      .where(and(
        lt(gamesT.matchDate, now),
        isNull(gamesT.scoreA),
      ))
      .orderBy(desc(gamesT.matchDate))
      .limit(20);

    return pending;
  }),

  // ─── EXPORT CSV DE USUÁRIOS ───────────────────────────────────────────────────
  exportUsersCsv: adminProcedure
    .input(z.object({
      inactiveDays: z.number().optional(),
      role: z.enum(["all", "admin", "user"]).default("all"),
      isBlocked: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return "";
      const { users: usersT } = await import("../../drizzle/schema");
      const { eq, lte, and } = await import("drizzle-orm");

      const conditions = [];
      if (input.role !== "all") conditions.push(eq(usersT.role, input.role as "admin" | "user"));
      if (input.isBlocked !== undefined) conditions.push(eq(usersT.isBlocked, input.isBlocked));
      if (input.inactiveDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - input.inactiveDays);
        conditions.push(lte(usersT.lastSignedIn, cutoff));
      }

      const users = await db.select({
        id: usersT.id,
        name: usersT.name,
        email: usersT.email,
        role: usersT.role,
        isBlocked: usersT.isBlocked,
        createdAt: usersT.createdAt,
        lastSignedIn: usersT.lastSignedIn,
      }).from(usersT).where(conditions.length > 0 ? and(...conditions) : undefined);

      // Gerar CSV
      const header = "ID,Nome,Email,Role,Bloqueado,Criado em,Último login";
      const rows = users.map(u =>
        [
          u.id,
          `"${(u.name ?? "").replace(/"/g, '""')}"`,
          u.email ?? "",
          u.role,
          u.isBlocked ? "Sim" : "Não",
          u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "",
          u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "",
        ].join(",")
      );

      return [header, ...rows].join("\n");
    }),

  // ─── LOG DE IMPORTAÇÕES (GOOGLE SHEETS) ──────────────────────────────────────
  getImportLogs: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      cursor: z.number().optional(),
      tournamentId: z.number().optional(),
      status: z.enum(["all", "success", "error", "partial"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { items: [], hasMore: false };
      const { sheetsSyncLog, tournaments: tourT, users: usersT } = await import("../../drizzle/schema");
      const { eq, lt, and, desc } = await import("drizzle-orm");
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.cursor) conditions.push(lt(sheetsSyncLog.id, input.cursor) as ReturnType<typeof eq>);
      if (input.tournamentId) conditions.push(eq(sheetsSyncLog.tournamentId, input.tournamentId));
      if (input.status !== "all") conditions.push(eq(sheetsSyncLog.status, input.status as "success" | "error" | "partial"));
      const logs = await db.select({
        id: sheetsSyncLog.id,
        tournamentId: sheetsSyncLog.tournamentId,
        tournamentName: tourT.name,
        sheetUrl: sheetsSyncLog.sheetUrl,
        status: sheetsSyncLog.status,
        gamesImported: sheetsSyncLog.gamesImported,
        gamesUpdated: sheetsSyncLog.gamesUpdated,
        errors: sheetsSyncLog.errors,
        triggeredByName: usersT.name,
        createdAt: sheetsSyncLog.createdAt,
      })
        .from(sheetsSyncLog)
        .leftJoin(tourT, eq(tourT.id, sheetsSyncLog.tournamentId))
        .leftJoin(usersT, eq(usersT.id, sheetsSyncLog.triggeredBy))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sheetsSyncLog.id))
        .limit(input.limit + 1);
      const hasMore = logs.length > input.limit;
      return { items: hasMore ? logs.slice(0, input.limit) : logs, hasMore, nextCursor: hasMore ? logs[input.limit - 1]?.id : undefined };
    }),

  // ─── EXPORT CSV DE LOGS DE AUDITORIA ─────────────────────────────────────────
  exportAuditCsv: adminProcedure
    .input(z.object({
      adminId: z.number().optional(),
      level: z.enum(["all", "info", "warn", "error"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return "";
      const { adminLogs, users: usersT } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.adminId) conditions.push(eq(adminLogs.adminId, input.adminId));
      if (input.level !== "all") conditions.push(eq(adminLogs.level, input.level as "info" | "warn" | "error"));
      const logs = await db.select({
        id: adminLogs.id,
        adminName: usersT.name,
        action: adminLogs.action,
        entityType: adminLogs.entityType,
        entityId: adminLogs.entityId,
        level: adminLogs.level,
        createdAt: adminLogs.createdAt,
      })
        .from(adminLogs)
        .leftJoin(usersT, eq(usersT.id, adminLogs.adminId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adminLogs.id))
        .limit(5000);
      const header = "ID,Admin,Ação,Tipo,ID Entidade,Nível,Data";
      const rows = logs.map(l =>
        [
          l.id,
          `"${(l.adminName ?? "Sistema").replace(/"/g, '""')}"`,
          `"${l.action.replace(/"/g, '""')}"`,
          l.entityType ?? "",
          l.entityId ?? "",
          l.level,
          l.createdAt ? new Date(l.createdAt).toLocaleString("pt-BR") : "",
        ].join(",")
      );
      return [header, ...rows].join("\n");
    }),
});
