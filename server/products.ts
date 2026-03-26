/**
 * Configuração centralizada de produtos e preços do Stripe para o Plakr!.
 * O STRIPE_PRO_PRICE_ID é definido via variável de ambiente para flexibilidade entre ambientes.
 */

export const STRIPE_PRODUCTS = {
  pro: {
    name: "Plakr! Pro",
    description: "Plano Pro por bolão — participantes ilimitados, campeonatos personalizados e regras customizáveis.",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "", // Definir via Settings → Payment
  },
} as const;

export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
