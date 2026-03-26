/**
 * Plakr! — Sub-router: Bolões (Comunicação)
 * Procedures: sendInviteEmail, broadcastToMembers
 */
import { z } from "zod";
import {
  createAdminLog,
  createNotification,
  getPoolById,
  getPoolMember,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr } from "../errors";
import { ENV } from "../_core/env";

export const poolsCommunicationRouter = router({
  sendInviteEmail: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      email: z.string().email(),
      inviteeName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || member.role !== "organizer") throw Err.forbidden();
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      const { templatePoolInvite } = await import("../email");
      const inviteUrl = `${ENV.appBaseUrl}/join/${pool.inviteToken}`;
      const { subject, html } = templatePoolInvite({
        inviteeName: input.inviteeName ?? "Amigo",
        organizerName: ctx.user.name ?? "Organizador",
        poolName: pool.name,
        tournamentName: "Copa",
        memberCount: 0,
        inviteUrl,
      });
      const db = await (await import("../db")).getDb();
      if (db) {
        const { emailQueue } = await import("../../drizzle/schema");
        await db.insert(emailQueue).values({
          userId: ctx.user.id,
          toEmail: input.email,
          subject,
          htmlBody: html,
          status: "pending",
        });
      }
      return { success: true };
    }),

  broadcastToMembers: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw PoolErr.organizerOnly();
      }
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (pool.plan !== "pro" && ctx.user.role !== "admin") {
        throw PoolErr.proOnly("Comunicação com membros");
      }
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolMembers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const members = await db
        .select({ userId: poolMembers.userId })
        .from(poolMembers)
        .where(eq(poolMembers.poolId, input.poolId));
      let sent = 0;
      for (const m of members) {
        if (m.userId === ctx.user.id) continue;
        await createNotification({
          userId: m.userId,
          type: "system",
          title: `📢 ${input.title}`,
          message: input.message,
          actionUrl: `/pool/${pool.slug}`,
          actionLabel: "Ver bolão",
          priority: "normal",
          category: "communication",
        });
        sent++;
      }
      await createAdminLog(ctx.user.id, "pool_broadcast", "pool", input.poolId, {
        title: input.title,
        sent,
      });
      return { sent };
    }),
});
