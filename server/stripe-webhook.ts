/**
 * Webhook handler para eventos do Stripe.
 * Rota: POST /api/stripe/webhook
 * DEVE ser registrado ANTES do express.json() para que a verificação de assinatura funcione.
 */
import { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { createAdminLog, createNotification, getPoolById, updatePool, upsertUserPlan, getUserPlan } from "./db";
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

              // [LOG] Checkout Pro concluído (já existia)
              await createAdminLog(userId, "stripe_checkout_completed", "pool", poolId, {
                sessionId: session.id,
                subscriptionId: session.subscription,
              });

              logger.info({ poolId, userId }, "[Webhook] Pro plan activated");
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

                // [LOG F1] Assinatura Pro cancelada pelo Stripe
                await createAdminLog(userId, "stripe_subscription_cancelled", "pool", poolId ?? undefined, {
                  subscriptionId: subscription.id,
                  canceledAt: new Date().toISOString(),
                  reason: subscription.cancellation_details?.reason ?? "unknown",
                }, poolId ?? undefined, { level: "warn" });
              }

              logger.info({ poolId }, "[Webhook] Pro plan cancelled");
            }
            break;
          }

          // ─── Pagamento de fatura falhou: rebaixamento gracioso após 3 tentativas ─
          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const attemptCount = (invoice as unknown as { attempt_count?: number }).attempt_count ?? 1;
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

            if (poolId && userId) {
              if (attemptCount >= 3) {
                // Após 3 tentativas: rebaixar para Free
                await updatePool(poolId, { plan: "free", stripeSubscriptionId: null });
                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: "Plano Pro cancelado por falta de pagamento",
                  message:
                    "Após 3 tentativas sem sucesso, seu Plano Pro foi cancelado. O bolão continua ativo no plano gratuito. Atualize seu método de pagamento no painel do Stripe para reativar.",
                  priority: "high",
                });

                // [LOG F2] Pagamento falhou — 3ª tentativa → downgrade
                await createAdminLog(userId, "stripe_payment_failed", "pool", poolId ?? undefined, {
                  attemptCount,
                  invoiceId: invoice.id,
                  subscriptionId,
                  action: "downgraded_to_free",
                }, poolId ?? undefined, { level: "error" });

                logger.warn({ poolId }, "[Webhook] Payment failed 3x, pool downgraded to free");
              } else {
                // Tentativas 1 e 2: apenas avisar, manter Pro
                await createNotification({
                  userId,
                  type: "plan_expired",
                  title: `Pagamento falhou (tentativa ${attemptCount}/3)`,
                  message:
                    `Não foi possível processar o pagamento do Plano Pro (tentativa ${attemptCount} de 3). Atualize seu método de pagamento para evitar o cancelamento.`,
                  priority: "high",
                });

                // [LOG F2] Pagamento falhou — tentativa 1 ou 2
                await createAdminLog(userId, "stripe_payment_failed", "pool", poolId ?? undefined, {
                  attemptCount,
                  invoiceId: invoice.id,
                  subscriptionId,
                  action: "notified_keep_pro",
                }, poolId ?? undefined, { level: "warn" });

                logger.warn({ poolId, attemptCount }, "[Webhook] Payment failed attempt");
              }
            }
            break;
          }

          // ─── Assinatura renovada com sucesso ──────────────────────────
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

                // Notificar organizador sobre renovação bem-sucedida
                const expiryFormatted = newExpiry.toLocaleDateString("pt-BR");
                await createNotification({
                  userId,
                  type: "system",
                  title: "Plano Pro renovado com sucesso!",
                  message: `Seu Plano Pro foi renovado automaticamente e está ativo até ${expiryFormatted}. Obrigado pela confiança!`,
                  priority: "normal",
                });

                // [LOG F3] Renovação de assinatura bem-sucedida
                await createAdminLog(userId, "stripe_subscription_renewed", "pool", poolId ?? undefined, {
                  subscriptionId: invSubId,
                  invoiceId: invoicePaid.id,
                  newExpiresAt: newExpiry.toISOString(),
                }, poolId ?? undefined, { level: "info" });

                logger.info({ poolId, newExpiry }, "[Webhook] Subscription renewed");
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
