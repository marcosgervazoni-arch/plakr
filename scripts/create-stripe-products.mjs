/**
 * Script para criar produtos e preços no Stripe Sandbox do Plakr!
 * Executa: node scripts/create-stripe-products.mjs
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  console.log("🔧 Criando produtos e preços no Stripe Sandbox...\n");

  // ─── Produto Pro ──────────────────────────────────────────────────────────
  const proProd = await stripe.products.create({
    name: "Plakr! Pro",
    description: "Plano Pro — até 10 bolões, 200 participantes por bolão, regras customizáveis, campeonatos personalizados.",
    metadata: { tier: "pro" },
  });
  console.log(`✅ Produto Pro criado: ${proProd.id}`);

  const proMonthly = await stripe.prices.create({
    product: proProd.id,
    unit_amount: 3990, // R$ 39,90
    currency: "brl",
    recurring: { interval: "month" },
    nickname: "Pro Mensal",
    metadata: { tier: "pro", billing: "monthly" },
  });
  console.log(`✅ Preço Pro Mensal: ${proMonthly.id} (R$ 39,90/mês)`);

  const proAnnual = await stripe.prices.create({
    product: proProd.id,
    unit_amount: 39900, // R$ 399,00
    currency: "brl",
    recurring: { interval: "year" },
    nickname: "Pro Anual",
    metadata: { tier: "pro", billing: "annual" },
  });
  console.log(`✅ Preço Pro Anual: ${proAnnual.id} (R$ 399,00/ano)`);

  // ─── Produto Unlimited ────────────────────────────────────────────────────
  const unlimitedProd = await stripe.products.create({
    name: "Plakr! Ilimitado",
    description: "Plano Ilimitado — bolões ilimitados, participantes ilimitados, API de resultados automática.",
    metadata: { tier: "unlimited" },
  });
  console.log(`\n✅ Produto Ilimitado criado: ${unlimitedProd.id}`);

  const unlimitedMonthly = await stripe.prices.create({
    product: unlimitedProd.id,
    unit_amount: 8990, // R$ 89,90
    currency: "brl",
    recurring: { interval: "month" },
    nickname: "Ilimitado Mensal",
    metadata: { tier: "unlimited", billing: "monthly" },
  });
  console.log(`✅ Preço Ilimitado Mensal: ${unlimitedMonthly.id} (R$ 89,90/mês)`);

  const unlimitedAnnual = await stripe.prices.create({
    product: unlimitedProd.id,
    unit_amount: 89900, // R$ 899,00
    currency: "brl",
    recurring: { interval: "year" },
    nickname: "Ilimitado Anual",
    metadata: { tier: "unlimited", billing: "annual" },
  });
  console.log(`✅ Preço Ilimitado Anual: ${unlimitedAnnual.id} (R$ 899,00/ano)`);

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("📋 PRICE IDs para atualizar no banco:");
  console.log(`  stripePriceIdPro:              ${proMonthly.id}`);
  console.log(`  stripePriceIdProAnnual:        ${proAnnual.id}`);
  console.log(`  stripePriceIdUnlimited:        ${unlimitedMonthly.id}`);
  console.log(`  stripePriceIdUnlimitedAnnual:  ${unlimitedAnnual.id}`);
  console.log("─────────────────────────────────────────────────────────\n");

  return {
    stripePriceIdPro: proMonthly.id,
    stripePriceIdProAnnual: proAnnual.id,
    stripePriceIdUnlimited: unlimitedMonthly.id,
    stripePriceIdUnlimitedAnnual: unlimitedAnnual.id,
  };
}

main().catch(console.error);
