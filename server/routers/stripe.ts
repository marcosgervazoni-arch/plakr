/**
 * ApostAI — Router Stripe
 * [T1] Modularizado a partir de server/routers.ts
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getPoolById, getPoolMember, getPlatformSettings, getUserPlan } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const stripeRouter = router({
  // Criar sessão de checkout para ativar o Plano Pro num bolão
  createCheckout: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolById(input.poolId);
      if (!pool) throw new TRPCError({ code: "NOT_FOUND" });
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || member.role !== "organizer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o organizador pode assinar o Plano Pro." });
      }
      if (pool.plan === "pro") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este bolão já possui o Plano Pro." });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
        apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
      });

      // Ler Price ID do banco (configurável via painel Admin → Configurações)
      const platformConfig = await getPlatformSettings();
      const priceId = platformConfig?.stripePriceIdPro || process.env.STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Price ID do Plano Pro não configurado. Acesse Admin → Configurações e insira o Price ID do Stripe.",
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          pool_id: input.poolId.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
        },
        subscription_data: {
          metadata: {
            user_id: ctx.user.id.toString(),
            pool_id: input.poolId.toString(),
          },
        },
        allow_promotion_codes: true,
        success_url: `${input.origin}/pool/${pool.slug}/manage?checkout=success`,
        cancel_url: `${input.origin}/pool/${pool.slug}/manage?checkout=cancelled`,
      });

      return { checkoutUrl: session.url };
    }),

  // Abrir portal de gestão de assinatura Stripe
  createPortalSession: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const plan = await getUserPlan(ctx.user.id);
      if (!plan?.stripeCustomerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma assinatura ativa encontrada.",
        });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
        apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
      });

      const session = await stripe.billingPortal.sessions.create({
        customer: plan.stripeCustomerId,
        return_url: `${input.origin}/pool/${input.poolId}/manage`,
      });

      return { portalUrl: session.url };
    }),
});
