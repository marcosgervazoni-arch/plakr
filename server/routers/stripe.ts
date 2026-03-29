/**
 * Plakr! — Router Stripe
 * Modelo: Pro por Conta — o plano é do usuário, não do bolão.
 * Tiers: free | pro (R$ 39,90/mês) | unlimited (R$ 89,90/mês)
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getPlatformSettings, getUserPlan, getUserPlanTier } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err } from "../errors";

export const stripeRouter = router({
  /**
   * Criar sessão de checkout para assinar um plano (pro ou unlimited).
   * Não requer bolão — o plano é ativado na conta do usuário.
   */
  createCheckout: protectedProcedure
    .input(z.object({
      tier: z.enum(["pro", "unlimited"]),
      billing: z.enum(["monthly", "annual"]).default("monthly"),
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se já tem plano ativo
      const currentTier = await getUserPlanTier(ctx.user.id);
      if (currentTier === input.tier) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Você já possui o plano ${input.tier === "pro" ? "Pro" : "Ilimitado"} ativo.`,
        });
      }

      const Stripe = (await import("stripe")).default;
      // Ler configurações do banco (chave secreta e Price IDs configuráveis via painel Admin → Configurações)
      const platformConfig = await getPlatformSettings();
      const stripeSecretKey = (platformConfig as any)?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
      });

      // Selecionar Price ID conforme tier e billing
      let priceId: string | null | undefined;
      if (input.tier === "pro") {
        priceId = input.billing === "annual"
          ? platformConfig?.stripePriceIdProAnnual ?? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
          : platformConfig?.stripePriceIdPro ?? process.env.STRIPE_PRO_PRICE_ID;
      } else {
        priceId = input.billing === "annual"
          ? platformConfig?.stripePriceIdUnlimitedAnnual ?? process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID
          : platformConfig?.stripePriceIdUnlimited ?? process.env.STRIPE_UNLIMITED_PRICE_ID;
      }

      if (!priceId) {
        throw Err.internal(
          `Price ID do plano ${input.tier} (${input.billing}) não configurado. Acesse Admin → Configurações e insira os Price IDs do Stripe.`
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          tier: input.tier,
          billing: input.billing,
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
        },
        subscription_data: {
          metadata: {
            user_id: ctx.user.id.toString(),
            tier: input.tier,
            billing: input.billing,
          },
        },
        allow_promotion_codes: true,
        success_url: `${input.origin}/upgrade?checkout=success&tier=${input.tier}`,
        cancel_url: `${input.origin}/upgrade?checkout=cancelled`,
      });

      return { checkoutUrl: session.url };
    }),

  /**
   * Abrir portal de gestão de assinatura Stripe.
   * Permite ao usuário cancelar, trocar plano ou atualizar pagamento.
   */
  createPortalSession: protectedProcedure
    .input(z.object({
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const plan = await getUserPlan(ctx.user.id);
      if (!plan?.stripeCustomerId) {
        throw Err.notFound("Nenhuma assinatura ativa encontrada.");
      }

      const Stripe = (await import("stripe")).default;
      const platformConfigPortal = await getPlatformSettings();
      const stripeSecretKeyPortal = (platformConfigPortal as any)?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";
      const stripe = new Stripe(stripeSecretKeyPortal, {
        apiVersion: "2026-02-25.clover" as "2026-02-25.clover",
      });

      const session = await stripe.billingPortal.sessions.create({
        customer: plan.stripeCustomerId,
        return_url: `${input.origin}/dashboard`,
      });

      return { portalUrl: session.url };
    }),

  /** Retorna o plano atual do usuário autenticado */
  getMyPlan: protectedProcedure
    .query(async ({ ctx }) => {
      const plan = await getUserPlan(ctx.user.id);
      const tier = await getUserPlanTier(ctx.user.id);
      return {
        tier,
        plan: plan ?? null,
        isActive: tier !== "free",
      };
    }),
});
