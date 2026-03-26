/**
 * Plakr! — Router de Configurações da Plataforma
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createAdminLog,
  getPlatformSettings,
  updatePlatformSettings,
} from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr, TournamentErr, UserErr } from "../errors";

export const platformRouter = router({
  // Dashboard global: métricas agregadas da plataforma
  getStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return { totalUsers: 0, totalPools: 0, activePools: 0, proPlans: 0, totalBets: 0, totalTournaments: 0 };
    const { users: usersT, pools: poolsT, bets: betsT, tournaments: tourT, userPlans: plansT } = await import("../../drizzle/schema");
    const { count, eq } = await import("drizzle-orm");
    const [[usersCount], [poolsCount], [activeCount], [proCount], [betsCount], [tourCount]] = await Promise.all([
      db.select({ c: count() }).from(usersT),
      db.select({ c: count() }).from(poolsT),
      db.select({ c: count() }).from(poolsT).where(eq(poolsT.status, "active")),
      db.select({ c: count() }).from(poolsT).where(eq(poolsT.plan, "pro")),
      db.select({ c: count() }).from(betsT),
      db.select({ c: count() }).from(tourT),
    ]);
    return {
      totalUsers: Number(usersCount?.c ?? 0),
      totalPools: Number(poolsCount?.c ?? 0),
      activePools: Number(activeCount?.c ?? 0),
      proPlans: Number(proCount?.c ?? 0),
      totalBets: Number(betsCount?.c ?? 0),
      totalTournaments: Number(tourCount?.c ?? 0),
    };
  }),

  // Retorna apenas campos seguros e não sensíveis para usuários autenticados
  getPublicSettings: protectedProcedure.query(async () => {
    const settings = await getPlatformSettings();
    if (!settings) return { restrictedInviteMessage: null };
    return {
      restrictedInviteMessage: settings.restrictedInviteMessage ?? null,
    };
  }),

  getSettings: adminProcedure.query(async () => {
    const settings = await getPlatformSettings();
    if (!settings) return null;
    // S10: vapidPrivateKey nunca é retornada para o frontend (segurança)
    const { vapidPrivateKey: _omit, ...safeSettings } = settings;
    return safeSettings;
  }),

  updateSettings: adminProcedure
    .input(z.object({
      freeMaxParticipants: z.number().optional(),
      freeMaxPools: z.number().optional(),
      poolArchiveDays: z.number().optional(),
      defaultScoringExact: z.number().optional(),
      defaultScoringCorrect: z.number().optional(),
      defaultScoringBonusGoals: z.number().optional(),
      defaultScoringBonusDiff: z.number().optional(),
      defaultScoringBonusUpset: z.number().optional(),
      defaultScoringBonusOneTeam: z.number().optional(),
      defaultScoringBonusLandslide: z.number().optional(),
      defaultLandslideMinDiff: z.number().min(1).max(10).optional(),
      defaultZebraThreshold: z.number().min(50).max(100).optional(),
      gaMeasurementId: z.string().optional(),
      fbPixelId: z.string().optional(),
      stripePriceIdPro: z.string().optional(),
      stripeMonthlyPrice: z.number().optional(),
      // VAPID / Push
      vapidPublicKey: z.string().optional(),
      vapidPrivateKey: z.string().optional(),
      // Aceita string vazia (campo não preenchido) ou e-mail válido.
      // String vazia é normalizada para undefined para não sobrescrever valor existente no banco.
      vapidEmail: z.union([z.string().email(), z.literal("")]).optional().transform(v => v === "" ? undefined : v),
      pushEnabled: z.boolean().optional(),
      adsEnabled: z.boolean().optional(),
      restrictedInviteMessage: z.string().max(500).optional().nullable(),
      cobaiaPoolId: z.number().int().positive().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updatePlatformSettings(input, ctx.user.id);
      await createAdminLog(ctx.user.id, "update_platform_settings", "platform_settings", 1);
      return { success: true };
    }),

  // Gerar novo par de VAPID keys (admin)
  generateVapidKeys: adminProcedure.mutation(async ({ ctx }) => {
    const { generateVapidKeys } = await import("../push");
    const keys = generateVapidKeys();
    // [LOG S2] Geração de novas chaves VAPID — ação destrutiva (invalida todas as assinaturas push)
    await createAdminLog(ctx.user.id, "vapid_keys_regenerated", "platform", 1, {
      note: "Todas as assinaturas push existentes foram invalidadas após regeneração das chaves VAPID",
    }, undefined, { level: "warn" });
    return keys;
  }),

  getAuditLogs: adminProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { adminLogs } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(input.limit);
    }),

  // Templates de notificação
  listNotificationTemplates: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { notificationTemplates } = await import("../../drizzle/schema");
    return db.select().from(notificationTemplates).orderBy(notificationTemplates.type);
  }),

  updateNotificationTemplate: adminProcedure
    .input(z.object({
      type: z.enum(["game_reminder", "result_available", "ranking_update"]),
      titleTemplate: z.string().min(1).max(255),
      bodyTemplate: z.string().min(1),
      pushTitleTemplate: z.string().max(255).optional(),
      pushBodyTemplate: z.string().optional(),
      emailSubjectTemplate: z.string().max(255).optional(),
      emailBodyTemplate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { notificationTemplates } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(notificationTemplates)
        .set({
          titleTemplate: input.titleTemplate,
          bodyTemplate: input.bodyTemplate,
          pushTitleTemplate: input.pushTitleTemplate ?? null,
          pushBodyTemplate: input.pushBodyTemplate ?? null,
          emailSubjectTemplate: input.emailSubjectTemplate ?? null,
          emailBodyTemplate: input.emailBodyTemplate ?? null,
          updatedBy: ctx.user.id,
        })
        .where(eq(notificationTemplates.type, input.type));
      // [LOG C1] Template de mensagem automática editado
      await createAdminLog(ctx.user.id, "notification_template_updated", "notification_template", undefined, {
        type: input.type,
        titleTemplate: input.titleTemplate,
      }, undefined, { level: "info" });
      return { success: true };
    }),

  toggleNotificationTemplate: adminProcedure
    .input(z.object({
      type: z.enum(["game_reminder", "result_available", "ranking_update"]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { notificationTemplates } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(notificationTemplates)
        .set({ enabled: input.enabled, updatedBy: ctx.user.id })
        .where(eq(notificationTemplates.type, input.type));
      // [LOG C2] Template de mensagem automática ativado ou desativado
      await createAdminLog(ctx.user.id, "notification_template_toggled", "notification_template", undefined, {
        type: input.type,
        enabled: input.enabled,
      }, undefined, { level: "info" });
      return { success: true };
    }),
});
