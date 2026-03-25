/**
 * ApostAI — Router de Templates de Notificação (Admin)
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";

export const notificationTemplatesRouter = router({
  list: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { notificationTemplates } = await import("../../drizzle/schema");
    return db.select().from(notificationTemplates).orderBy(notificationTemplates.type);
  }),

  update: adminProcedure
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
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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
      return { success: true };
    }),

  toggle: adminProcedure
    .input(z.object({
      type: z.enum(["game_reminder", "result_available", "ranking_update"]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { notificationTemplates } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(notificationTemplates)
        .set({ enabled: input.enabled, updatedBy: ctx.user.id })
        .where(eq(notificationTemplates.type, input.type));
      return { success: true };
    }),
});
