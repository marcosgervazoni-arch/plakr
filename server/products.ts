/**
 * Configuração centralizada de produtos e preços do Stripe para o Plakr!
 *
 * Modelo: Pro por Conta — o plano é vinculado ao usuário, não ao bolão.
 * Tiers: free | pro (R$ 39,90/mês) | unlimited (R$ 89,90/mês)
 *
 * Os Price IDs são lidos do banco (platform_settings) em tempo de execução.
 * Os valores aqui servem apenas como fallback de desenvolvimento.
 * Em produção, configure via Admin → Configurações da Plataforma.
 */

export const STRIPE_PRODUCTS = {
  pro: {
    name: "Plakr! Pro",
    description: "Plano Pro — até 10 bolões, 200 participantes por bolão, regras customizáveis, campeonatos personalizados.",
    priceIdMonthly: process.env.STRIPE_PRO_PRICE_ID ?? "price_1TFMnDPT1hcFZLKGqNMDHfpg",
    priceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "price_1TFMnDPT1hcFZLKG6EITylxP",
    monthlyAmount: 3990,   // R$ 39,90
    annualAmount: 39900,   // R$ 399,00
  },
  unlimited: {
    name: "Plakr! Ilimitado",
    description: "Plano Ilimitado — bolões ilimitados, participantes ilimitados, API de resultados automática.",
    priceIdMonthly: process.env.STRIPE_UNLIMITED_PRICE_ID ?? "price_1TFMnEPT1hcFZLKGd6XsiR4H",
    priceIdAnnual: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID ?? "price_1TFMnEPT1hcFZLKGdlvhlgXv",
    monthlyAmount: 8990,   // R$ 89,90
    annualAmount: 89900,   // R$ 899,00
  },
} as const;

export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
