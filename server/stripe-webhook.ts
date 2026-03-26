/**
 * Webhook handler para eventos do Stripe.
 * Rota: POST /api/stripe/webhook
 * Modelo: Pro por Conta — plano vinculado ao usuário, não ao bolão.
 * DEVE ser registrado ANTES do express.json() para que a verificação de assinatura funcione.
 */
import { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { createAdminLog, createNotification, upsertUserPlan, getUserPlan } from "./db";
import logger from "./logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-02-25.clover",
});

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logger.error({ message }, "[Webhook] Signature verification failed");
        return res.status(400).send(`Webhook Error: ${message}`);
      }

      // Detectar eventos de teste — retornar verificação imediatamente
      if (event.id.startsWith("evt_test_")) {
        logger.info("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      logger.info({ eventType: event.type, eventId: event.id }, "[Webhook] Event received");

      try {
        switch (event.type) {
          // ─── Checkout concluído: ativar plano na conta do usuário ─────────
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
            const tier = (session.metadata?.tier ?? "pro") as "pro" | "unlimited";

            if (userId) {
              // Calcular expiração: mensal = 1 mês, anual = 1 ano
              const billing = session.metadata?.billing ?? "monthly";
              const expiresAt = new Date();
              if (billing === "annual") {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
              } else {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
              }

              await upsertUserPlan({
                userId,
                plan: tier,
                stripeCustomerId: session.customer as string ?? null,
                stripeSubscriptionId: session.subscription as string ?? null,
                planStartAt: new Date(),
                planExpiresAt: expiresAt,
                isActive: true,
              });

              const tierLabel = tier === "unlimited" ? "Ilimitado" : "Pro";
              await createNotification({
                userId,
                type: "system",
                title: `Plano ${tierLabel} ativado!`,
                message: `Sua conta foi atualizada para o Plano ${tierLabel}. Aproveite todos os recursos avançados!`,
              });

              await createAdminLog(userId, "stripe_checkout_completed", "user", userId, {
                sessionId: session.id,
                subscriptionId: session.subscription,
                tier,
                billing,
              });

              logger.info({ userId, tier }, "[Webhook] Plan activated");
            }
            break;
          }

          // ─── Assinatura cancelada: rebaixar para gratuito ─────────────────
          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.user_id
              ? parseInt(subscription.metadata.user_id)
              : null;

            if (userId) {
              await upsertUserPlan({
                userId,
                plan: "free",
                stripeCustomerId: subscription.customer as string ?? null,
                stripeSubscriptionId: null,
                planExpiresAt: new Date(),
                isActive: false,
              });

              await createNotification({
                userId,
                type: "plan_expired",
                title: "Plano cancelado",
                message:
                  "Seu plano pago foi cancelado. Sua conta continua ativa no plano gratuito com funcionalidades limitadas.",
              });

              await createAdminLog(userId, "stripe_subscription_cancelled", "user", userId, {
                subscriptionId: subscription.id,
                canceledAt: new Date().toISOString(),
                reason: subscription.cancellation_details?.reason ?? "unknown",
              }, undefined, { level: "warn" });

              logger.info({ userId }, "[Webhook] Plan cancelled, downgraded to free");
            }
            break;
          }

          // ─── Pagamento de fatura falhou ───────────────────────────────────
          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const attemptCount = (invoice as unknown as { attempt_count?: number }).attempt_count ?? 1;
            const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
            const subscription = subscriptionId
              ? await stripe.subscriptions.retrieve(subscriptionId)
              : null;
            const userId = subscription?.metadata?.user_id
              ? parseInt(subscription.metadata.user_id)
              : null;

            if (userId) {
              if (attemptCount >= 3) {
                // Após 3 tentativas: rebaixar para Free
                await upsertUserPlan({
                  userId,
                  plan: "free",
                  stripeCustomerId: subscription?.customer as string ?? null,
                  stripeSubscriptionId: null,
                  planExpiresAt: new Date(),
                  isActive: false,
                });

                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: "Plano cancelado por falta de pagamento",
                  message:
                    "Após 3 tentativas sem sucesso, seu plano pago foi cancelado. Sua conta continua ativa no plano gratuito. Atualize seu método de pagamento no painel do Stripe para reativar.",
                  priority: "high",
                });

                await createAdminLog(userId, "stripe_payment_failed", "user", userId, {
                  attemptCount,
                  invoiceId: invoice.id,
                  subscriptionId,
                  action: "downgraded_to_free",
                }, undefined, { level: "error" });

                logger.warn({ userId }, "[Webhook] Payment failed 3x, downgraded to free");
              } else {
                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: `Pagamento falhou (tentativa ${attemptCount}/3)`,
                  message:
                    `Não foi possível processar o pagamento do seu plano (tentativa ${attemptCount} de 3). Atualize seu método de pagamento para evitar o cancelamento.`,
                  priority: "high",
                });

                await createAdminLog(userId, "stripe_payment_failed", "user", userId, {
                  attemptCount,
                  invoiceId: invoice.id,
                  subscriptionId,
                  action: "notified_keep_plan",
                }, undefined, { level: "warn" });

                logger.warn({ userId, attemptCount }, "[Webhook] Payment failed attempt");
              }
            }
            break;
          }

          // ─── Assinatura renovada com sucesso ──────────────────────────────
          case "invoice.paid": {
            const invoicePaid = event.data.object as Stripe.Invoice;
            if (invoicePaid.billing_reason === "subscription_cycle") {
              const invSubId = (invoicePaid as unknown as { subscription?: string }).subscription;
              const sub = invSubId
                ? await stripe.subscriptions.retrieve(invSubId)
                : null;
              const userId = sub?.metadata?.user_id
                ? parseInt(sub.metadata.user_id)
                : null;
              const tier = (sub?.metadata?.tier ?? "pro") as "pro" | "unlimited";

              if (userId && sub) {
                const subData = sub as unknown as { current_period_end?: number };
                const newExpiry = new Date((subData.current_period_end ?? 0) * 1000);

                await upsertUserPlan({
                  userId,
                  plan: tier,
                  stripeCustomerId: invoicePaid.customer as string ?? null,
                  stripeSubscriptionId: invSubId ?? null,
                  planExpiresAt: newExpiry,
                  isActive: true,
                });

                const tierLabel = tier === "unlimited" ? "Ilimitado" : "Pro";
                const expiryFormatted = newExpiry.toLocaleDateString("pt-BR");
                await createNotification({
                  userId,
                  type: "system",
                  title: `Plano ${tierLabel} renovado com sucesso!`,
                  message: `Seu Plano ${tierLabel} foi renovado automaticamente e está ativo até ${expiryFormatted}. Obrigado pela confiança!`,
                  priority: "normal",
                });

                await createAdminLog(userId, "stripe_subscription_renewed", "user", userId, {
                  subscriptionId: invSubId,
                  invoiceId: invoicePaid.id,
                  newExpiresAt: newExpiry.toISOString(),
                  tier,
                }, undefined, { level: "info" });

                logger.info({ userId, newExpiry, tier }, "[Webhook] Subscription renewed");
              }
            }
            break;
          }

          default:
            logger.info({ eventType: event.type }, "[Webhook] Unhandled event type");
        }
      } catch (err) {
        logger.error({ err }, "[Webhook] Error processing event");
        return res.status(500).json({ error: "Internal server error" });
      }

      return res.json({ received: true });
    }
  );
}
