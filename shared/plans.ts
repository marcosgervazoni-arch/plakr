/**
 * Plakr! — Definição central de Planos
 * Fonte única de verdade para limites, preços e features por tier.
 * Usado tanto no servidor quanto no cliente.
 */

export type PlanTier = "free" | "pro" | "unlimited";

/**
 * Tier exclusivo para participantes de bolão (não organizadores).
 * Adquirido dentro do bolão via Passe VIP — R$4,90/mês.
 * Válido globalmente: todos os bolões enquanto a assinatura estiver ativa.
 */
export type ParticipantTier = "free" | "vip";

// ─── Limites do Passe VIP (participante) ─────────────────────────────────────

export const PARTICIPANT_LIMITS: Record<ParticipantTier, {
  dailyAiAnalysis: number;    // análises pré-jogo por dia (Infinity = ilimitado)
  maxActiveX1: number;        // duelos X1 ativos simultâneos (Infinity = ilimitado)
  noAds: boolean;             // sem anúncios
}> = {
  free: {
    dailyAiAnalysis: 3,
    maxActiveX1: 5,
    noAds: false,
  },
  vip: {
    dailyAiAnalysis: Infinity,
    maxActiveX1: Infinity,
    noAds: true,
  },
};

/** Preço do Passe VIP */
export const VIP_PRICE = {
  monthly: 4.90,
  currency: "BRL",
  label: "Passe VIP",
};

/** Verifica se o participante tem acesso VIP */
export function isParticipantVip(tier: ParticipantTier): boolean {
  return tier === "vip";
}

/** Retorna os limites do participante pelo tier */
export function getParticipantLimits(tier: ParticipantTier) {
  return PARTICIPANT_LIMITS[tier];
}

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
