/**
 * Plakr! — Sub-router: Patrocínio de Bolões (Naming Rights)
 *
 * Permissões:
 *   - Super Admin (role=admin): acesso total, incluindo customSlug e enabledForOrganizer
 *   - Organizador Pro Ilimitado: pode editar campos parciais SE enabledForOrganizer=true
 *     (nunca pode alterar customSlug, enabledForOrganizer, enabledByAdminId)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { Err } from "../errors";

// ─── Schemas de validação ────────────────────────────────────────────────────

const sponsorBaseSchema = z.object({
  sponsorName: z.string().min(1).max(255),
  sponsorLogoUrl: z.string().url().nullable().optional(),
  welcomeMessage: z.string().max(1000).nullable().optional(),
  welcomeMessageActive: z.boolean().optional(),
  bannerImageUrl: z.string().url().nullable().optional(),
  bannerLinkUrl: z.string().url().nullable().optional(),
  bannerActive: z.boolean().optional(),
  popupTitle: z.string().max(255).nullable().optional(),
  popupText: z.string().max(2000).nullable().optional(),
  popupImageUrl: z.string().url().nullable().optional(),
  popupButtonText: z.string().max(100).nullable().optional(),
  popupButtonUrl: z.string().url().nullable().optional(),
  popupFrequency: z.enum(["once_per_member", "once_per_session", "always"]).optional(),
  popupDelaySeconds: z.number().int().min(0).max(60).optional(),
  popupActive: z.boolean().optional(),
  showLogoOnShareCard: z.boolean().optional(),
  sponsoredNotificationText: z.string().max(500).nullable().optional(),
  sponsoredNotificationActive: z.boolean().optional(),
  rankingNotificationText: z.string().max(500).nullable().optional(),
  rankingNotificationActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Campos exclusivos do Super Admin
const sponsorAdminOnlySchema = sponsorBaseSchema.extend({
  customSlug: z.string().min(3).max(128).regex(/^[a-z0-9-]+$/).nullable().optional(),
  enabledForOrganizer: z.boolean().optional(),
});

export const poolsSponsorRouter = router({

  // ─── GET: buscar patrocínio de um bolão ──────────────────────────────────
  getSponsor: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { poolSponsors, pools, poolMembers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Verificar se o usuário tem acesso ao bolão (membro, organizador ou admin)
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const [member] = await db
          .select({ id: poolMembers.id })
          .from(poolMembers)
          .where(eq(poolMembers.poolId, input.poolId))
          .limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [sponsor] = await db
        .select()
        .from(poolSponsors)
        .where(eq(poolSponsors.poolId, input.poolId))
        .limit(1);

      return sponsor ?? null;
    }),

  // ─── GET PUBLIC: dados mínimos para exibição no bolão (sem campos sensíveis) ─
  getSponsorPublic: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { poolSponsors } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [sponsor] = await db
        .select({
          sponsorName: poolSponsors.sponsorName,
          sponsorLogoUrl: poolSponsors.sponsorLogoUrl,
          welcomeMessage: poolSponsors.welcomeMessage,
          welcomeMessageActive: poolSponsors.welcomeMessageActive,
          bannerImageUrl: poolSponsors.bannerImageUrl,
          bannerLinkUrl: poolSponsors.bannerLinkUrl,
          bannerActive: poolSponsors.bannerActive,
          popupTitle: poolSponsors.popupTitle,
          popupText: poolSponsors.popupText,
          popupImageUrl: poolSponsors.popupImageUrl,
          popupButtonText: poolSponsors.popupButtonText,
          popupButtonUrl: poolSponsors.popupButtonUrl,
          popupFrequency: poolSponsors.popupFrequency,
          popupDelaySeconds: poolSponsors.popupDelaySeconds,
          popupActive: poolSponsors.popupActive,
          showLogoOnShareCard: poolSponsors.showLogoOnShareCard,
          id: poolSponsors.id,
          updatedAt: poolSponsors.updatedAt,
        })
        .from(poolSponsors)
        .where(
          and(
            eq(poolSponsors.poolId, input.poolId),
            eq(poolSponsors.isActive, true)
          )
        )
        .limit(1);

      return sponsor ?? null;
    }),

  // ─── UPSERT (Admin): criar ou atualizar patrocínio completo ─────────────
  adminUpsertSponsor: adminProcedure
    .input(sponsorAdminOnlySchema.extend({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolSponsors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { createAdminLog } = await import("../db");

      const { poolId, ...fields } = input;

      // Verificar se já existe
      const [existing] = await db
        .select({ id: poolSponsors.id })
        .from(poolSponsors)
        .where(eq(poolSponsors.poolId, poolId))
        .limit(1);

      if (existing) {
        await db.update(poolSponsors).set({
          ...fields,
          enabledByAdminId: ctx.user.id,
        }).where(eq(poolSponsors.poolId, poolId));
      } else {
        await db.insert(poolSponsors).values({
          poolId,
          ...fields,
          sponsorName: fields.sponsorName,
          enabledByAdminId: ctx.user.id,
        });
      }

      await createAdminLog(ctx.user.id, "upsert_pool_sponsor", "pool", poolId, { sponsorName: fields.sponsorName });
      return { success: true };
    }),

  // ─── UPSERT (Organizador Pro Ilimitado): editar campos parciais ──────────
  organizerUpsertSponsor: protectedProcedure
    .input(sponsorBaseSchema.extend({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolSponsors, pools, poolMembers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const { getUserPlanTier } = await import("../db");

      // Verificar plano unlimited
      const tier = await getUserPlanTier(ctx.user.id);
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin && tier !== "unlimited") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Recurso exclusivo do plano Ilimitado." });
      }

      // Verificar se é organizador do bolão
      if (!isAdmin) {
        const [pool] = await db
          .select({ ownerId: pools.ownerId })
          .from(pools)
          .where(eq(pools.id, input.poolId))
          .limit(1);
        if (!pool || pool.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode configurar o patrocínio." });
        }
      }

      // Verificar se enabledForOrganizer está ativo
      const [existing] = await db
        .select({ id: poolSponsors.id, enabledForOrganizer: poolSponsors.enabledForOrganizer })
        .from(poolSponsors)
        .where(eq(poolSponsors.poolId, input.poolId))
        .limit(1);

      if (!isAdmin && (!existing || !existing.enabledForOrganizer)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Patrocínio não habilitado para este bolão pelo administrador." });
      }

      const { poolId, ...fields } = input;

      if (existing) {
        // Nunca atualizar campos exclusivos do admin
        await db.update(poolSponsors).set(fields).where(eq(poolSponsors.poolId, poolId));
      } else {
        await db.insert(poolSponsors).values({ poolId, ...fields, sponsorName: fields.sponsorName });
      }

      return { success: true };
    }),

  // ─── DELETE (Admin): remover patrocínio ─────────────────────────────────
  adminDeleteSponsor: adminProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolSponsors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { createAdminLog } = await import("../db");

      await db.delete(poolSponsors).where(eq(poolSponsors.poolId, input.poolId));
      await createAdminLog(ctx.user.id, "delete_pool_sponsor", "pool", input.poolId, {});
      return { success: true };
    }),

  // ─── TOGGLE (Admin): ativar/desativar patrocínio ─────────────────────────
  adminToggleSponsor: adminProcedure
    .input(z.object({ poolId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolSponsors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { createAdminLog } = await import("../db");

      await db.update(poolSponsors)
        .set({ isActive: input.isActive })
        .where(eq(poolSponsors.poolId, input.poolId));

      await createAdminLog(ctx.user.id, input.isActive ? "activate_pool_sponsor" : "deactivate_pool_sponsor", "pool", input.poolId, {});
      return { success: true };
    }),

  // ─── TRACK EVENT: rastrear impressão/clique (fire-and-forget) ────────────
  trackSponsorEvent: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      sponsorId: z.number(),
      eventType: z.enum(["banner_impression", "banner_click", "popup_impression", "popup_click", "welcome_impression"]),
      sessionId: z.string().max(64).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await (await import("../db")).getDb();
        if (!db) return { success: false };
        const { poolSponsorEvents } = await import("../../drizzle/schema");
        await db.insert(poolSponsorEvents).values({
          poolId: input.poolId,
          sponsorId: input.sponsorId,
          eventType: input.eventType,
          sessionId: input.sessionId ?? null,
        });
        return { success: true };
      } catch {
        return { success: false };
      }
    }),

  // ─── GET SPONSOR REPORT (Admin): métricas agregadas por bolão ───────────
  getSponsorReport: adminProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { poolSponsorEvents, poolSponsors, pools, poolMembers } = await import("../../drizzle/schema");
      const { eq, count, and, gte, sql } = await import("drizzle-orm");

      const [sponsor] = await db
        .select()
        .from(poolSponsors)
        .where(eq(poolSponsors.poolId, input.poolId))
        .limit(1);

      if (!sponsor) return null;

      const [pool] = await db
        .select({ name: pools.name })
        .from(pools)
        .where(eq(pools.id, input.poolId))
        .limit(1);

      const [memberCountResult] = await db
        .select({ total: count() })
        .from(poolMembers)
        .where(eq(poolMembers.poolId, input.poolId));

      // Totais por tipo de evento
      const events = await db
        .select({ eventType: poolSponsorEvents.eventType, total: count() })
        .from(poolSponsorEvents)
        .where(eq(poolSponsorEvents.sponsorId, sponsor.id))
        .groupBy(poolSponsorEvents.eventType);

      // Eventos por dia (30 dias)
      const dailyEvents = await db
        .select({
          date: sql<string>`DATE(${poolSponsorEvents.createdAt})`,
          eventType: poolSponsorEvents.eventType,
          total: count(),
        })
        .from(poolSponsorEvents)
        .where(and(
          eq(poolSponsorEvents.sponsorId, sponsor.id),
          gte(poolSponsorEvents.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`)
        ))
        .groupBy(sql`DATE(${poolSponsorEvents.createdAt})`, poolSponsorEvents.eventType)
        .orderBy(sql`DATE(${poolSponsorEvents.createdAt})`);

      const totals = {
        banner_impression: 0, banner_click: 0,
        popup_impression: 0, popup_click: 0,
        welcome_impression: 0,
      };
      for (const e of events) totals[e.eventType] = Number(e.total);

      const bannerCtr = totals.banner_impression > 0
        ? ((totals.banner_click / totals.banner_impression) * 100).toFixed(1) : "0.0";
      const popupCtr = totals.popup_impression > 0
        ? ((totals.popup_click / totals.popup_impression) * 100).toFixed(1) : "0.0";

      return {
        sponsor,
        poolName: pool?.name ?? "",
        memberCount: Number(memberCountResult?.total ?? 0),
        totals,
        bannerCtr,
        popupCtr,
        dailyEvents,
        generatedAt: new Date().toISOString(),
      };
    }),

  // ─── ENABLE FOR ORGANIZER (Admin): liberar edição para o organizador ─────
  adminEnableForOrganizer: adminProcedure
    .input(z.object({ poolId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { poolSponsors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { createAdminLog } = await import("../db");

      await db.update(poolSponsors)
        .set({ enabledForOrganizer: input.enabled, enabledByAdminId: ctx.user.id })
        .where(eq(poolSponsors.poolId, input.poolId));

      await createAdminLog(ctx.user.id, input.enabled ? "enable_organizer_sponsor" : "disable_organizer_sponsor", "pool", input.poolId, {});
      return { success: true };
    }),
});
