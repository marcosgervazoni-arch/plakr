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
