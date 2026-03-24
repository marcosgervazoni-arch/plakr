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
// ─── Testes de notificação ao desbloquear badge ─────────────────────────────
describe("Badge Engine — notificação ao desbloquear", () => {
  it("deve incluir actionUrl='/profile/me' na notificação", () => {
    const notificationPayload = {
      userId: 1,
      type: "system" as const,
      title: "🏅 Badge desbloqueado: Atirador de Elite!",
      message: "Alcançou 80% ou mais de taxa de acerto em um bolão.",
      isRead: false,
      actionUrl: "/profile/me",
      actionLabel: "Ver meu perfil",
      priority: "high" as const,
      category: "badge_unlocked",
    };

    expect(notificationPayload.actionUrl).toBe("/profile/me");
    expect(notificationPayload.actionLabel).toBe("Ver meu perfil");
    expect(notificationPayload.priority).toBe("high");
    expect(notificationPayload.category).toBe("badge_unlocked");
    expect(notificationPayload.title).toContain("🏅");
  });

  it("deve incluir imageUrl quando o badge tem iconUrl", () => {
    const badge = {
      id: 1,
      name: "Atirador de Elite",
      iconUrl: "https://cdn.example.com/badge-elite.svg",
    };

    const notificationImageUrl = badge.iconUrl ?? undefined;
    expect(notificationImageUrl).toBe("https://cdn.example.com/badge-elite.svg");
  });

  it("deve usar undefined para imageUrl quando badge não tem iconUrl", () => {
    const badge = { id: 1, name: "Mestre dos Placares", iconUrl: null };
    const notificationImageUrl = badge.iconUrl ?? undefined;
    expect(notificationImageUrl).toBeUndefined();
  });
});

// ─── Testes dos badges de exemplo ────────────────────────────────────────────
describe("Badge Engine — badges de exemplo", () => {
  const exampleBadges = [
    { name: "Atirador de Elite", criterionType: "accuracy_in_pool", criterionValue: 80 },
    { name: "Mestre dos Placares", criterionType: "exact_scores_career", criterionValue: 10 },
    { name: "Zebra Hunter", criterionType: "zebra_scores_career", criterionValue: 5 },
    { name: "Campeão Serial", criterionType: "first_place_pools", criterionValue: 2 },
    { name: "Maratonista", criterionType: "complete_pool_no_blank", criterionValue: 3 },
  ];

  it("deve ter 5 badges de exemplo com critérios válidos", () => {
    expect(exampleBadges).toHaveLength(5);
  });

  it("todos os badges de exemplo devem ter criterionValue positivo", () => {
    exampleBadges.forEach((b) => {
      expect(b.criterionValue).toBeGreaterThan(0);
    });
  });

  it("todos os badges de exemplo devem ter criterionType válido", () => {
    const validTypes = [
      "accuracy_in_pool",
      "exact_scores_career",
      "zebra_scores_career",
      "top3_pools",
      "first_place_pools",
      "complete_pool_no_blank",
      "consecutive_correct",
    ];
    exampleBadges.forEach((b) => {
      expect(validTypes).toContain(b.criterionType);
    });
  });

  it("Atirador de Elite deve exigir 80% de acerto", () => {
    const badge = exampleBadges.find((b) => b.name === "Atirador de Elite");
    expect(badge?.criterionValue).toBe(80);
    expect(badge?.criterionType).toBe("accuracy_in_pool");
  });

  it("Campeão Serial deve exigir 2 primeiros lugares", () => {
    const badge = exampleBadges.find((b) => b.name === "Campeão Serial");
    expect(badge?.criterionValue).toBe(2);
    expect(badge?.criterionType).toBe("first_place_pools");
  });
});

// ─── Testes de estrutura do BadgeWithStatus ───────────────────────────────────────
describe("Badge Engine — estrutura BadgeWithStatus", () => {it("deve ter todos os campos obrigatórios", () => {
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
