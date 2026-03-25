/**
 * ApostAI — Router de Rankings
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { getPoolMember, getPoolRanking } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const rankingsRouter = router({
  getPoolRanking: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getPoolRanking(input.poolId);
    }),

  myPoolPosition: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const ranking = await getPoolRanking(input.poolId);
      const idx = ranking.findIndex((r) => r.user.id === ctx.user.id);
      if (idx === -1) return { position: null as number | null, points: null as number | null };
      return {
        position: idx + 1,
        points: ranking[idx].stats.totalPoints,
      };
    }),
});
