import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getPlatformSettings } from "../db";
import { archivalCronHealth } from "../archival";
import { emailCronHealth } from "../emailCron";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // [O3] Health check dos cron jobs — apenas admin
  cronHealth: adminProcedure.query(() => ({
    archival: archivalCronHealth,
    email: emailCronHealth,
  })),

  // Público: retorna apenas os IDs de analytics (sem dados sensíveis)
  getAnalyticsConfig: publicProcedure.query(async () => {
    const settings = await getPlatformSettings();
    return {
      gaMeasurementId: settings?.gaMeasurementId ?? null,
      fbPixelId: settings?.fbPixelId ?? null,
    };
  }),
});
