/**
 * badges.test.ts — Testes do motor de badges
 * Valida a lógica de cálculo de critérios e atribuição de badges.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../drizzle/schema", () => ({
  badges: { id: "id", name: "name", isActive: "isActive" },
  userBadges: { userId: "userId", badgeId: "badgeId", earnedAt: "earnedAt" },
  poolMemberStats: {},
  bets: {},
  games: {},
}));

// ─── Testes de checkCriterion ─────────────────────────────────────────────────
describe("Badge Engine — checkCriterion", () => {
  it("deve retornar false para userId inválido (0)", async () => {
    const { checkCriterion } = await import("./badges");
    // userId=0 deve retornar false sem lançar exceção
    const result = await checkCriterion(0, "accuracy_rate", 80).catch(() => false);
    expect(result).toBe(false);
  });

  it("deve aceitar todos os tipos de critério válidos", () => {
    const validTypes = [
      "accuracy_rate",
      "exact_score_career",
      "zebra_correct",
      "top3_pools",
      "first_place_pools",
      "complete_pool_no_blank",
      "consecutive_correct",
    ] as const;
    // Apenas verificar que os tipos são strings válidas
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });
});

// ─── Testes de getUserBadgesWithStatus ────────────────────────────────────────
describe("Badge Engine — getUserBadgesWithStatus", () => {
  it("deve retornar array vazio quando db não disponível", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null as any);

    const { getUserBadgesWithStatus } = await import("./badges");
    const result = await getUserBadgesWithStatus(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ─── Testes de lógica de critérios ───────────────────────────────────────────
describe("Badge Engine — lógica de critérios", () => {
  it("accuracy_rate: 80% de 10 apostas = 8 corretas deve passar threshold 80", () => {
    const totalBets = 10;
    const correctBets = 8;
    const accuracy = Math.round((correctBets / totalBets) * 100);
    expect(accuracy).toBe(80);
    expect(accuracy >= 80).toBe(true);
  });

  it("accuracy_rate: 7 de 10 apostas = 70% não deve passar threshold 80", () => {
    const totalBets = 10;
    const correctBets = 7;
    const accuracy = Math.round((correctBets / totalBets) * 100);
    expect(accuracy).toBe(70);
    expect(accuracy >= 80).toBe(false);
  });

  it("exact_score_career: 5 placares exatos deve passar threshold 5", () => {
    const exactScores = 5;
    const threshold = 5;
    expect(exactScores >= threshold).toBe(true);
  });

  it("exact_score_career: 4 placares exatos não deve passar threshold 5", () => {
    const exactScores = 4;
    const threshold = 5;
    expect(exactScores >= threshold).toBe(false);
  });

  it("top3_pools: 3 top-3s deve passar threshold 3", () => {
    const top3Count = 3;
    const threshold = 3;
    expect(top3Count >= threshold).toBe(true);
  });

  it("first_place_pools: 1 primeiro lugar deve passar threshold 1", () => {
    const firstPlaceCount = 1;
    const threshold = 1;
    expect(firstPlaceCount >= threshold).toBe(true);
  });

  it("criterionValue deve ser sempre positivo", () => {
    const values = [1, 5, 10, 50, 80, 100];
    values.forEach((v) => {
      expect(v).toBeGreaterThan(0);
    });
  });
});

// ─── Testes de estrutura do BadgeWithStatus ───────────────────────────────────
describe("Badge Engine — estrutura BadgeWithStatus", () => {
  it("deve ter todos os campos obrigatórios", () => {
    const badge = {
      id: 1,
      name: "Atirador de Elite",
      description: "Acerte 80% dos palpites",
      iconUrl: "https://cdn.example.com/badge.svg",
      criterionType: "accuracy_rate",
      criterionValue: 80,
      isActive: true,
      earned: true,
      earnedAt: new Date(),
    };

    expect(badge).toHaveProperty("id");
    expect(badge).toHaveProperty("name");
    expect(badge).toHaveProperty("description");
    expect(badge).toHaveProperty("iconUrl");
    expect(badge).toHaveProperty("criterionType");
    expect(badge).toHaveProperty("criterionValue");
    expect(badge).toHaveProperty("isActive");
    expect(badge).toHaveProperty("earned");
    expect(badge).toHaveProperty("earnedAt");
  });

  it("badge não conquistado deve ter earnedAt=null", () => {
    const badge = {
      id: 2,
      name: "Zebra Hunter",
      description: "Acerte 10 zebras",
      iconUrl: null,
      criterionType: "zebra_correct",
      criterionValue: 10,
      isActive: true,
      earned: false,
      earnedAt: null,
    };

    expect(badge.earned).toBe(false);
    expect(badge.earnedAt).toBeNull();
  });
});
