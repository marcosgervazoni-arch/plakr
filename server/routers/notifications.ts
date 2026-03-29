/**
 * Plakr! — Router de Notificações
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  countUnreadNotifications,
  createAdminLog,
  createNotification,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

// [S6] Escape HTML para prevenir XSS em dados interpolados em templates de e-mail
function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return getUserNotifications(ctx.user.id, input.limit);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { notificationPreferences } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
    if (rows[0]) return rows[0];
    await db.insert(notificationPreferences).values({ userId: ctx.user.id }).onDuplicateKeyUpdate({ set: { userId: ctx.user.id } });
    const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, ctx.user.id)).limit(1);
    return created[0] ?? null;
  }),

  updatePreferences: protectedProcedure
    .input(z.object({
      inAppGameReminder: z.boolean().optional(),
      inAppRankingUpdate: z.boolean().optional(),
      inAppResultAvailable: z.boolean().optional(),
      inAppSystem: z.boolean().optional(),
      inAppAd: z.boolean().optional(),
      pushGameReminder: z.boolean().optional(),
      pushRankingUpdate: z.boolean().optional(),
      pushResultAvailable: z.boolean().optional(),
      pushSystem: z.boolean().optional(),
      pushAd: z.boolean().optional(),
      emailGameReminder: z.boolean().optional(),
      emailRankingUpdate: z.boolean().optional(),
      emailResultAvailable: z.boolean().optional(),
      emailSystem: z.boolean().optional(),
      emailAd: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { success: false };
      const { notificationPreferences } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.insert(notificationPreferences).values({ userId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: input });
      return { success: true };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return { count: await countUnreadNotifications(ctx.user.id) };
  }),

  markReadMany: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { success: false };
      const { notifications: notifT } = await import("../../drizzle/schema");
      const { and, inArray, eq } = await import("drizzle-orm");
      await db
        .update(notifT)
        .set({ isRead: true })
        .where(and(inArray(notifT.id, input.ids), eq(notifT.userId, ctx.user.id)));
      return { success: true };
    }),

  // Chave pública VAPID para o Service Worker (sem auth)
  getVapidPublicKey: publicProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return { publicKey: null, pushEnabled: false };
    const { platformSettings: psT } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ vapidPublicKey: psT.vapidPublicKey, pushEnabled: psT.pushEnabled })
      .from(psT)
      .where(eq(psT.id, 1))
      .limit(1);
    return {
      publicKey: rows[0]?.vapidPublicKey ?? null,
      pushEnabled: rows[0]?.pushEnabled ?? false,
    };
  }),

  subscribePush: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { saveSubscription } = await import("../push");
      await saveSubscription(
        ctx.user.id,
        { endpoint: input.endpoint, keys: { p256dh: input.p256dh, auth: input.auth } },
        input.userAgent
      );
      return { success: true };
    }),

  unsubscribePush: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { removeSubscription } = await import("../push");
      await removeSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),

  unsubscribeAllPush: protectedProcedure.mutation(async ({ ctx }) => {
    const { removeAllSubscriptions } = await import("../push");
    await removeAllSubscriptions(ctx.user.id);
    return { success: true };
  }),

  pushStats: adminProcedure.query(async () => {
    const { getPushStats } = await import("../push");
    return getPushStats();
  }),

  broadcast: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      content: z.string().min(1).max(2000),
      audience: z.enum(["all", "pro", "free"]).default("all"),
      channels: z.object({
        inApp: z.boolean().default(true),
        push: z.boolean().default(false),
        email: z.boolean().default(false),
      }).default({ inApp: true, push: false, email: false }),
      category: z.enum(["game_reminder", "result_available", "ranking_update", "advertising", "communication"]).default("communication"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      imageUrl: z.string().url().optional().or(z.literal("")),
      actionUrl: z.string().optional(),
      actionLabel: z.string().max(50).optional(),
      emoji: z.string().max(10).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { users: usersT, userPlans } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      let userIds: number[] = [];
      if (input.audience === "all") {
        const rows = await db.select({ id: usersT.id, isBlocked: usersT.isBlocked }).from(usersT);
        userIds = rows.filter((r) => !r.isBlocked).map((r) => r.id);
      } else if (input.audience === "pro") {
        const rows = await db
          .select({ userId: userPlans.userId })
          .from(userPlans)
          .innerJoin(usersT, eq(usersT.id, userPlans.userId))
          .where(eq(userPlans.plan, "pro"));
        userIds = rows.map((r) => r.userId);
      } else {
        const proRows = await db.select({ userId: userPlans.userId }).from(userPlans).where(eq(userPlans.plan, "pro"));
        const proIds = new Set(proRows.map((r) => r.userId));
        const allRows = await db.select({ id: usersT.id, isBlocked: usersT.isBlocked }).from(usersT);
        userIds = allRows.filter((r) => !r.isBlocked && !proIds.has(r.id)).map((r) => r.id);
      }
      let inAppSent = 0;
      let pushSent = 0;
      let emailSent = 0;
      const notifTypeMap: Record<string, "game_reminder" | "result_available" | "ranking_update" | "ad" | "system"> = {
        game_reminder: "game_reminder",
        result_available: "result_available",
        ranking_update: "ranking_update",
        advertising: "ad",
        communication: "system",
      };
      const notifType = notifTypeMap[input.category] ?? "system";
      const titleWithEmoji = input.emoji ? `${input.emoji} ${input.title}` : input.title;
      // Strip HTML tags for plain-text channels (in-app, push)
      const plainTextContent = input.content
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (input.channels.inApp) {
        for (const uid of userIds) {
          await createNotification({
            userId: uid,
            type: notifType,
            title: titleWithEmoji,
            message: plainTextContent,
            imageUrl: input.imageUrl || undefined,
            actionUrl: input.actionUrl || undefined,
            actionLabel: input.actionLabel || undefined,
            priority: input.priority,
            category: input.category,
          });
          inAppSent++;
        }
      }
      if (input.channels.push) {
        const { broadcastPush } = await import("../push");
        const result = await broadcastPush(userIds, { title: titleWithEmoji, body: plainTextContent, url: input.actionUrl || "/notifications" }, "pushSystem");
        pushSent = result.sent;
      }
      if (input.channels.email) {
        const { enqueueEmail } = await import("../email");
        const emailRows = await db
          .select({ id: usersT.id, email: usersT.email, name: usersT.name })
          .from(usersT)
          .where(eq(usersT.isBlocked, false));
        const emailMap = new Map(emailRows.map((r) => [r.id, r]));
        for (const uid of userIds) {
          const u = emailMap.get(uid);
          if (!u?.email) continue;
          const emailHtml = `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0f0f0f;color:#e5e5e5;">
  <div style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    ${input.imageUrl ? `<img src="${esc(input.imageUrl)}" alt="" style="width:100%;max-height:200px;object-fit:cover;display:block;">` : ''}
    <div style="padding:24px;">
      ${input.emoji ? `<div style="font-size:32px;margin-bottom:12px;">${esc(input.emoji)}</div>` : ''}
      <h2 style="margin:0 0 12px;color:#fff;font-size:20px;">${esc(input.title)}</h2>
      <div style="margin:0 0 20px;color:#ccc;line-height:1.6;">${input.content}</div>
      ${input.actionUrl ? `<a href="${esc(input.actionUrl)}" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${esc(input.actionLabel ?? 'Ver mais')}</a>` : ''}
    </div>
  </div>
</body></html>`;
          await enqueueEmail({
            toUserId: u.id,
            toEmail: u.email,
            type: "pool_invite",
            subject: titleWithEmoji,
            html: emailHtml,
          });
          emailSent++;
        }
      }
      await createAdminLog(ctx.user.id, "broadcast", "platform", undefined, {
        inAppSent, pushSent, emailSent, audience: input.audience, channels: input.channels,
      });
      return { inAppSent, pushSent, emailSent, total: userIds.length };
    }),

  emailQueue: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      status: z.enum(["pending", "sent", "failed", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { emailQueue: eqT } = await import("../../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      if (input.status === "all") {
        return db.select().from(eqT).orderBy(desc(eqT.createdAt)).limit(input.limit);
      }
      return db.select().from(eqT).where(eq(eqT.status, input.status)).orderBy(desc(eqT.createdAt)).limit(input.limit);
    }),
});
