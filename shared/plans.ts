/**
 * Plakr! — Definição central de Planos
 * Fonte única de verdade para limites, preços e features por tier.
 * Usado tanto no servidor quanto no cliente.
 */

export type PlanTier = "free" | "pro" | "unlimited";

// ─── Limites por tier ────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanTier, {
  maxPools: number;          // bolões simultâneos como organizador
  maxMembersPerPool: number; // participantes por bolão
  customTournaments: boolean;
  customScoring: boolean;
  customDeadline: boolean;
  poolLogo: boolean;
  exportRanking: boolean;
  noAds: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;       // futuro
  autoResults: boolean;      // futuro — integração com API de resultados
}> = {
  free: {
    maxPools: 2,
    maxMembersPerPool: 30,
    customTournaments: false,
    customScoring: false,
    customDeadline: false,
    poolLogo: false,
    exportRanking: false,
    noAds: false,
    prioritySupport: false,
    whiteLabel: false,
    autoResults: false,
  },
  pro: {
    maxPools: 10,
    maxMembersPerPool: 200,
    customTournaments: true,
    customScoring: true,
    customDeadline: true,
    poolLogo: true,
    exportRanking: true,
    noAds: true,
    prioritySupport: true,
    whiteLabel: false,
    autoResults: false,
  },
  unlimited: {
    maxPools: Infinity,
    maxMembersPerPool: Infinity,
    customTournaments: true,
    customScoring: true,
    customDeadline: true,
    poolLogo: true,
    exportRanking: true,
    noAds: true,
    prioritySupport: true,
    whiteLabel: true,
    autoResults: true,
  },
};

// ─── Preços ──────────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<Exclude<PlanTier, "free">, {
  monthly: number;
  annual: number;
  annualMonthly: number; // preço mensal equivalente no plano anual
  currency: string;
  label: string;
}> = {
  pro: {
    monthly: 39.90,
    annual: 399.00,
    annualMonthly: 33.25,
    currency: "BRL",
    label: "Pro",
  },
  unlimited: {
    monthly: 89.90,
    annual: 899.00,
    annualMonthly: 74.92,
    currency: "BRL",
    label: "Ilimitado",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna os limites do tier informado */
export function getLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier];
}

/** Verifica se um tier tem acesso a um recurso específico */
export function hasFeature(tier: PlanTier, feature: keyof typeof PLAN_LIMITS.free): boolean {
  const limits = PLAN_LIMITS[tier];
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/** Verifica se o tier é Pro ou superior */
export function isProOrAbove(tier: PlanTier): boolean {
  return tier === "pro" || tier === "unlimited";
}

/** Verifica se o tier é Unlimited */
export function isUnlimited(tier: PlanTier): boolean {
  return tier === "unlimited";
}

/** Formata o preço em BRL */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
