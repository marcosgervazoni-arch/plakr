import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getPlatformSettings } from "../db";

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

  // Público: retorna apenas os IDs de analytics (sem dados sensíveis)
  getAnalyticsConfig: publicProcedure.query(async () => {
    const settings = await getPlatformSettings();
    return {
      gaMeasurementId: settings?.gaMeasurementId ?? null,
      fbPixelId: settings?.fbPixelId ?? null,
    };
  }),
});
