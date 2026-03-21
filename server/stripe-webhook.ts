/**
 * Webhook handler para eventos do Stripe.
 * Rota: POST /api/stripe/webhook
 * DEVE ser registrado ANTES do express.json() para que a verificação de assinatura funcione.
 */
import { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { createAdminLog, createNotification, getPoolById, updatePool, upsertUserPlan } from "./db";

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
        console.error("[Webhook] Signature verification failed:", message);
        return res.status(400).send(`Webhook Error: ${message}`);
      }

      // Detectar eventos de teste — retornar verificação imediatamente
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Webhook] Event received: ${event.type} | ${event.id}`);

      try {
        switch (event.type) {
          // ─── Checkout concluído: ativar Plano Pro ──────────────────────────
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const poolId = session.metadata?.pool_id ? parseInt(session.metadata.pool_id) : null;
            const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;

            if (poolId && userId) {
              // Atualizar bolão para plano Pro
              await updatePool(poolId, {
                plan: "pro",
                stripeSubscriptionId: session.subscription as string ?? null,
              });

              // Registrar plano do usuário
              const expiresAt = new Date();
              expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 ano por padrão
              await upsertUserPlan({
                userId,
                plan: "pro",
                stripeCustomerId: session.customer as string ?? null,
                stripeSubscriptionId: session.subscription as string ?? null,
                planExpiresAt: expiresAt,
              });

              // Notificar organizador
              await createNotification({
                userId,
                type: "system",
                title: "Plano Pro ativado!",
                message: "Seu bolão foi atualizado para o Plano Pro. Aproveite todos os recursos avançados!",
              });

              await createAdminLog(userId, "stripe_checkout_completed", "pool", poolId, {
                sessionId: session.id,
                subscriptionId: session.subscription,
              });

              console.log(`[Webhook] Pro plan activated for pool ${poolId}, user ${userId}`);
            }
            break;
          }

          // ─── Assinatura cancelada: rebaixar para gratuito ─────────────────
          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const poolId = subscription.metadata?.pool_id
              ? parseInt(subscription.metadata.pool_id)
              : null;
            const userId = subscription.metadata?.user_id
              ? parseInt(subscription.metadata.user_id)
              : null;

            if (poolId) {
              await updatePool(poolId, {
                plan: "free",
                stripeSubscriptionId: null,
              });

              if (userId) {
                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: "Plano Pro cancelado",
                  message:
                    "Seu Plano Pro foi cancelado. O bolão continua ativo no plano gratuito com funcionalidades limitadas.",
                });
              }

              console.log(`[Webhook] Pro plan cancelled for pool ${poolId}`);
            }
            break;
          }

          // ─── Pagamento de fatura falhou: notificar e rebaixar ─────────────
          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
            const subscription = subscriptionId
              ? await stripe.subscriptions.retrieve(subscriptionId)
              : null;
            const poolId = subscription?.metadata?.pool_id
              ? parseInt(subscription.metadata.pool_id)
              : null;
            const userId = subscription?.metadata?.user_id
              ? parseInt(subscription.metadata.user_id)
              : null;

            if (poolId) {
              await updatePool(poolId, { plan: "free" });

              if (userId) {
                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: "Pagamento falhou",
                  message:
                    "Não foi possível processar o pagamento do Plano Pro. O bolão foi rebaixado para o plano gratuito. Atualize seu método de pagamento.",
                });
              }

              console.log(`[Webhook] Payment failed, pool ${poolId} downgraded to free`);
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
              const poolId = sub?.metadata?.pool_id
                ? parseInt(sub.metadata.pool_id)
                : null;
              const userId = sub?.metadata?.user_id
                ? parseInt(sub.metadata.user_id)
                : null;

              if (poolId && userId && sub) {
                const subData = sub as unknown as { current_period_end?: number };
                const newExpiry = new Date((subData.current_period_end ?? 0) * 1000);
                await upsertUserPlan({
                  userId,
                  plan: "pro",
                  stripeCustomerId: invoicePaid.customer as string ?? null,
                  stripeSubscriptionId: invSubId ?? null,
                  planExpiresAt: newExpiry,
                });
                console.log(`[Webhook] Subscription renewed for pool ${poolId} until ${newExpiry}`);
              }
            }
            break;
          }

          default:
            console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Webhook] Error processing event:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      return res.json({ received: true });
    }
  );
}
