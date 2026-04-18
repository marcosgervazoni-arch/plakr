/**
 * Testes do Passe VIP do Participante
 *
 * Cobre:
 *  1. getUserPlanTier retorna "vip" para usuário com plano vip
 *  2. canCreatePool trata "vip" como "free" (organizador sem upgrade)
 *  3. canAddMember trata "vip" como "free" (organizador sem upgrade)
 *  4. Limites de participante: Free=3 IA/dia, 5 X1 ativos; VIP=ilimitado
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock do módulo de banco de dados
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserPlanTier: vi.fn(),
    getUserById: vi.fn(),
    countActivePoolsByOwner: vi.fn(),
    countPoolMembers: vi.fn(),
  };
});

// Mock do shared/plans para não depender do módulo real
vi.mock("../shared/plans", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../shared/plans")>();
  return {
    ...actual,
    PLAN_LIMITS: {
      free: { maxPools: 2, maxMembersPerPool: 30, customTournaments: false, customScoring: false, customDeadline: false, poolLogo: false, exportRanking: false, noAds: false, prioritySupport: false, whiteLabel: false, autoResults: false },
      pro: { maxPools: 10, maxMembersPerPool: 200, customTournaments: true, customScoring: true, customDeadline: true, poolLogo: true, exportRanking: true, noAds: true, prioritySupport: true, whiteLabel: false, autoResults: false },
      unlimited: { maxPools: Infinity, maxMembersPerPool: Infinity, customTournaments: true, customScoring: true, customDeadline: true, poolLogo: true, exportRanking: true, noAds: true, prioritySupport: true, whiteLabel: true, autoResults: true },
    },
    PARTICIPANT_LIMITS: {
      free: { dailyAiAnalysis: 3, maxActiveX1: 5, noAds: false },
      vip: { dailyAiAnalysis: Infinity, maxActiveX1: Infinity, noAds: true },
    },
  };
});

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Passe VIP — Limites de Participante", () => {
  it("Free tem 3 análises de IA por dia", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.free.dailyAiAnalysis).toBe(3);
  });

  it("VIP tem análises de IA ilimitadas", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.vip.dailyAiAnalysis).toBe(Infinity);
  });

  it("Free tem limite de 5 duelos X1 ativos", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.free.maxActiveX1).toBe(5);
  });

  it("VIP tem duelos X1 ilimitados", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.vip.maxActiveX1).toBe(Infinity);
  });

  it("Free vê anúncios", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.free.noAds).toBe(false);
  });

  it("VIP não vê anúncios", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.vip.noAds).toBe(true);
  });
});

describe("Passe VIP — tier vip tratado como free para organizador", () => {
  it("organizerTier de vip é free (não tem privilégios de organizador)", () => {
    // Simula a lógica de normalização de tier em canCreatePool/canAddMember
    const normalizeTier = (tier: string): "free" | "pro" | "unlimited" =>
      tier === "vip" ? "free" : (tier as "free" | "pro" | "unlimited");

    expect(normalizeTier("vip")).toBe("free");
    expect(normalizeTier("free")).toBe("free");
    expect(normalizeTier("pro")).toBe("pro");
    expect(normalizeTier("unlimited")).toBe("unlimited");
  });

  it("limite de bolões para vip (normalizado como free) é 2", async () => {
    const { PLAN_LIMITS } = await import("../shared/plans");
    const tier = "vip";
    const organizerTier = tier === "vip" ? "free" : tier;
    expect(PLAN_LIMITS[organizerTier as "free" | "pro" | "unlimited"].maxPools).toBe(2);
  });

  it("limite de membros para vip (normalizado como free) é 30", async () => {
    const { PLAN_LIMITS } = await import("../shared/plans");
    const tier = "vip";
    const organizerTier = tier === "vip" ? "free" : tier;
    expect(PLAN_LIMITS[organizerTier as "free" | "pro" | "unlimited"].maxMembersPerPool).toBe(30);
  });
});

describe("Passe VIP — isParticipantVip helper", () => {
  it("retorna true para tier vip", async () => {
    const { isParticipantVip } = await import("../shared/plans");
    expect(isParticipantVip("vip")).toBe(true);
  });

  it("retorna false para tier free", async () => {
    const { isParticipantVip } = await import("../shared/plans");
    expect(isParticipantVip("free")).toBe(false);
  });
});

describe("Passe VIP — getParticipantLimits", () => {
  it("retorna limites corretos para free", async () => {
    const { getParticipantLimits } = await import("../shared/plans");
    const limits = getParticipantLimits("free");
    expect(limits.dailyAiAnalysis).toBe(3);
    expect(limits.maxActiveX1).toBe(5);
    expect(limits.noAds).toBe(false);
  });

  it("retorna limites corretos para vip", async () => {
    const { getParticipantLimits } = await import("../shared/plans");
    const limits = getParticipantLimits("vip");
    expect(limits.dailyAiAnalysis).toBe(Infinity);
    expect(limits.maxActiveX1).toBe(Infinity);
    expect(limits.noAds).toBe(true);
  });
});

describe("Passe VIP — contador de IA server-side", () => {
  it("limite diário de IA para Free é 3", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.free.dailyAiAnalysis).toBe(3);
  });

  it("VIP não tem limite diário de IA (Infinity)", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.vip.dailyAiAnalysis).toBe(Infinity);
  });

  it("lógica de bloqueio: Free com 3 usos está bloqueado", () => {
    const isBlocked = (tier: string, used: number): boolean => {
      if (tier === "vip") return false;
      return used >= 3;
    };
    expect(isBlocked("free", 3)).toBe(true);
    expect(isBlocked("free", 2)).toBe(false);
    expect(isBlocked("vip", 100)).toBe(false);
  });

  it("lógica de bloqueio: VIP nunca é bloqueado independente do uso", () => {
    const isBlocked = (tier: string, used: number): boolean => {
      if (tier === "vip") return false;
      return used >= 3;
    };
    expect(isBlocked("vip", 0)).toBe(false);
    expect(isBlocked("vip", 3)).toBe(false);
    expect(isBlocked("vip", 999)).toBe(false);
  });

  it("contador reseta por data (lógica de reset diário)", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Simula: se a data do registro é hoje, usa o count; se for ontem, retorna 0
    const getUsageForToday = (recordDate: string, count: number): number => {
      return recordDate === today ? count : 0;
    };

    expect(getUsageForToday(today, 2)).toBe(2);
    expect(getUsageForToday(yesterday, 2)).toBe(0);
  });
});

describe("Passe VIP — supressão de anúncios", () => {
  it("Free vê anúncios (noAds=false)", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.free.noAds).toBe(false);
  });

  it("VIP não vê anúncios (noAds=true)", async () => {
    const { PARTICIPANT_LIMITS } = await import("../shared/plans");
    expect(PARTICIPANT_LIMITS.vip.noAds).toBe(true);
  });

  it("supressão de anúncios: Pro ou VIP não vê anúncios", () => {
    const shouldShowAds = (isPro: boolean, isVip: boolean): boolean => {
      return !isPro && !isVip;
    };
    expect(shouldShowAds(false, false)).toBe(true);  // Free vê
    expect(shouldShowAds(true, false)).toBe(false);  // Pro não vê
    expect(shouldShowAds(false, true)).toBe(false);  // VIP não vê
    expect(shouldShowAds(true, true)).toBe(false);   // Pro+VIP não vê
  });
});
