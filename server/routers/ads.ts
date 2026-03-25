// [T1] Router de anúncios extraído de routers.ts para modularização
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAdminLog, getActiveAds } from "../db";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const adsRouter = router({
  getActive: publicProcedure
    .input(z.object({ position: z.enum(["top", "sidebar", "between_sections", "bottom", "popup"]) }))
    .query(async ({ input }) => {
      return getActiveAds(input.position);
    }),

  list: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { ads: adsT } = await import("../../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    return db.select().from(adsT).orderBy(desc(adsT.createdAt));
  }),

  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      assetUrl: z.string().optional(),
      linkUrl: z.string().optional(),
      type: z.enum(["banner", "video", "script"]).default("banner"),
      position: z.enum(["sidebar", "top", "between_sections", "bottom", "popup"]).default("sidebar"),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { ads: adsT } = await import("../../drizzle/schema");
      await db.insert(adsT).values({
        title: input.title,
        assetUrl: input.assetUrl,
        linkUrl: input.linkUrl,
        type: input.type,
        position: input.position,
        isActive: input.isActive,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  toggle: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { ads: adsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(adsT).set({ isActive: input.isActive }).where(eq(adsT.id, input.id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { ads: adsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(adsT).where(eq(adsT.id, input.id));
      return { success: true };
    }),

  clicksByDay: adminProcedure
    .input(z.object({ adId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { adClicks, ads: adsT } = await import("../../drizzle/schema");
      const { eq, and, sql, desc } = await import("drizzle-orm");
      const conditions = input.adId ? [eq(adClicks.adId, input.adId)] : [];
      const rows = await db
        .select({
          adId: adClicks.adId,
          adTitle: adsT.title,
          day: sql<string>`DATE(${adClicks.createdAt})`,
          clicks: sql<number>`COUNT(*)`,
        })
        .from(adClicks)
        .innerJoin(adsT, eq(adClicks.adId, adsT.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(adClicks.adId, adsT.title, sql`DATE(${adClicks.createdAt})`)
        .orderBy(desc(sql`DATE(${adClicks.createdAt})`));
      return rows.map((r) => ({ ...r, clicks: Number(r.clicks) }));
    }),

  recordClick: publicProcedure
    .input(z.object({ adId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { success: false };
      const { adClicks } = await import("../../drizzle/schema");
      await db.insert(adClicks).values({ adId: input.adId, userId: ctx.user?.id ?? null });
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      assetUrl: z.string().optional().nullable(),
      linkUrl: z.string().optional().nullable(),
      type: z.enum(["banner", "video", "script"]).optional(),
      position: z.enum(["sidebar", "top", "between_sections", "bottom", "popup"]).optional(),
      isActive: z.boolean().optional(),
      device: z.string().optional(),
      startAt: z.date().optional().nullable(),
      endAt: z.date().optional().nullable(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { ads: adsT } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { id, ...updates } = input;
      await db.update(adsT).set(updates as Record<string, unknown>).where(eq(adsT.id, id));
      await createAdminLog(ctx.user.id, "ads.update", "ad", id, { updates });
      return { success: true };
    }),

  globalToggle: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB not available");
      const { platformSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(platformSettings).set({ adsEnabled: input.enabled }).where(eq(platformSettings.id, 1));
      await createAdminLog(ctx.user.id, "ads.globalToggle", "platform", 1, { adsEnabled: input.enabled });
      return { success: true };
    }),
});
