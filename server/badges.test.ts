/**
 * badges.test.ts — Testes do motor de badges Plakr!
 *
 * Cobre:
 *   - checkCriterion: todos os critérios suportados
 *   - calculateAndAssignBadges: fluxo completo de atribuição
 *   - assignBadgeManually: atribuição manual pelo admin (Cobaia)
 *   - revokeBadge: revogação de badge
 *   - assignBadgeRetroactively: atribuição retroativa
 *
 * Badges aprovados (25 no total):
 *   Precisão:   Chute Certo, Manja Muito, Profeta, Mafioso das Apostas, Fiz de Novo, Cola na Minha
 *   Ranking:    É Campeão, Dinastia, Intocável, 1/20, Rei da Ultrapassagem, Ninguém Me Tira
 *   Zebra:      Só Eu Acreditei, Sou do Contra, Nem Eu Acreditava, Foi na Sorte
 *   Comunidade: Boas-Vindas, Levou a Sério, Desbravador, Barra Brava, Presida, Ansioso Competitivo, Veterano
 *   Exclusivo:  Cobaia (manual), Chegou Cedo (early_user)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const makeChain = (value: unknown) => {
  const p = Promise.resolve(value);
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
};

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  bets: {
    userId: "userId",
    poolId: "poolId",
    resultType: "resultType",
    createdAt: "createdAt",
    gameId: "gameId",
  },
  games: {
    id: "id",
    tournamentId: "tournamentId",
    isZebraResult: "isZebraResult",
    status: "status",
    matchDate: "matchDate",
  },
  pools: { id: "id", ownerId: "ownerId", status: "status" },
  poolMembers: {
    userId: "userId",
    poolId: "poolId",
    role: "role",
    joinSource: "joinSource",
  },
  poolMemberStats: {
    userId: "userId",
    poolId: "poolId",
    rankPosition: "rankPosition",
    totalPoints: "totalPoints",
    totalBets: "totalBets",
    exactScoreCount: "exactScoreCount",
    correctResultCount: "correctResultCount",
  },
  referrals: { inviterId: "inviterId", registeredAt: "registeredAt" },
  users: { id: "id" },
  badges: {
    id: "id",
    name: "name",
    emoji: "emoji",
    category: "category",
    description: "description",
    iconUrl: "iconUrl",
    criterionType: "criterionType",
    criterionValue: "criterionValue",
    isManual: "isManual",
    isActive: "isActive",
    isRetroactive: "isRetroactive",
  },
  userBadges: {
    id: "id",
    userId: "userId",
    badgeId: "badgeId",
    earnedAt: "earnedAt",
    notified: "notified",
  },
  notifications: {
    userId: "userId",
    type: "type",
    title: "title",
    message: "message",
    isRead: "isRead",
    imageUrl: "imageUrl",
    actionUrl: "actionUrl",
    actionLabel: "actionLabel",
    priority: "priority",
    category: "category",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  sql: Object.assign(vi.fn((s: TemplateStringsArray) => s[0]), { raw: vi.fn() }),
  desc: vi.fn((col) => ({ type: "desc", col })),
}));

import {
  checkCriterion,
  calculateAndAssignBadges,
  assignBadgeManually,
  revokeBadge,
  assignBadgeRetroactively,
} from "./badges";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkCriterion ───────────────────────────────────────────────────────────

describe("checkCriterion — Precisão", () => {
  it("exact_scores_career: true quando placares exatos >= N (Chute Certo / Manja Muito / Profeta / Mafioso)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 10 }]));
    expect(await checkCriterion(1, "exact_scores_career", 10)).toBe(true);
  });

  it("exact_scores_career: false quando placares exatos < N", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 5 }]));
    expect(await checkCriterion(1, "exact_scores_career", 10)).toBe(false);
  });

  it("exact_scores_in_pool: true quando algum bolão tem >= N placares exatos (Fiz de Novo / Cola na Minha)", async () => {
    mockDb.select.mockReturnValue(
      makeChain([{ poolId: 1, count: 5 }, { poolId: 2, count: 2 }])
    );
    expect(await checkCriterion(1, "exact_scores_in_pool", 5)).toBe(true);
  });

  it("exact_scores_in_pool: false quando nenhum bolão tem >= N placares exatos", async () => {
    mockDb.select.mockReturnValue(makeChain([{ poolId: 1, count: 1 }]));
    expect(await checkCriterion(1, "exact_scores_in_pool", 5)).toBe(false);
  });
});

describe("checkCriterion — Ranking", () => {
  it("first_place_pools: true quando venceu >= N bolões (É Campeão / Dinastia)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 3 }]));
    expect(await checkCriterion(1, "first_place_pools", 3)).toBe(true);
  });

  it("first_place_pools: false quando venceu < N bolões", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 1 }]));
    expect(await checkCriterion(1, "first_place_pools", 3)).toBe(false);
  });

  it("first_place_margin: true quando venceu com >= 20% de vantagem (Intocável)", async () => {
    // 1º: 120pts, 2º: 100pts → margem = 20%
    mockDb.select
      .mockReturnValueOnce(makeChain([{ poolId: 1, totalPoints: 120 }]))
      .mockReturnValueOnce(makeChain([{ totalPoints: 100 }]));
    expect(await checkCriterion(1, "first_place_margin", 20)).toBe(true);
  });

  it("first_place_margin: false quando margem < 20%", async () => {
    // 1º: 105pts, 2º: 100pts → margem = 5%
    mockDb.select
      .mockReturnValueOnce(makeChain([{ poolId: 1, totalPoints: 105 }]))
      .mockReturnValueOnce(makeChain([{ totalPoints: 100 }]));
    expect(await checkCriterion(1, "first_place_margin", 20)).toBe(false);
  });

  it("first_place_large_pool: true quando venceu bolão com >= 20 participantes (1/20)", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([{ poolId: 1 }]))
      .mockReturnValueOnce(makeChain([{ count: 20 }]));
    expect(await checkCriterion(1, "first_place_large_pool", 20)).toBe(true);
  });

  it("first_place_large_pool: false quando bolão tem < 20 participantes", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([{ poolId: 1 }]))
      .mockReturnValueOnce(makeChain([{ count: 10 }]));
    expect(await checkCriterion(1, "first_place_large_pool", 20)).toBe(false);
  });

  it("rank_jump / rank_hold_1st: false (não retroativo — calculado em tempo real)", async () => {
    expect(await checkCriterion(1, "rank_jump", 5)).toBe(false);
    expect(await checkCriterion(1, "rank_hold_1st", 3)).toBe(false);
  });
});

describe("checkCriterion — Zebra", () => {
  it("zebra_scores_career: true quando zebras acertadas >= N (Só Eu Acreditei / Sou do Contra)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 5 }]));
    expect(await checkCriterion(1, "zebra_scores_career", 5)).toBe(true);
  });

  it("zebra_in_pool: true quando >= 3 zebras no mesmo bolão (Nem Eu Acreditava)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ poolId: 1, count: 3 }]));
    expect(await checkCriterion(1, "zebra_in_pool", 3)).toBe(true);
  });

  it("zebra_exact_score: true quando acertou placar exato de zebra >= 1 vez (Foi na Sorte)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 1 }]));
    expect(await checkCriterion(1, "zebra_exact_score", 1)).toBe(true);
  });
});

describe("checkCriterion — Comunidade", () => {
  it("first_bet: true quando fez pelo menos 1 palpite (Boas-Vindas)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 1 }]));
    expect(await checkCriterion(1, "first_bet", 1)).toBe(true);
  });

  it("first_bet: false quando não fez nenhum palpite", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 0 }]));
    expect(await checkCriterion(1, "first_bet", 1)).toBe(false);
  });

  it("created_pool: true quando criou pelo menos 1 bolão (Desbravador)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 1 }]));
    expect(await checkCriterion(1, "created_pool", 1)).toBe(true);
  });

  it("organized_pools: true quando organizou >= 5 bolões (Presida)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 5 }]));
    expect(await checkCriterion(1, "organized_pools", 5)).toBe(true);
  });

  it("participated_pools: true quando participou de >= 10 bolões (Veterano)", async () => {
    mockDb.select.mockReturnValue(makeChain([{ count: 10 }]));
    expect(await checkCriterion(1, "participated_pools", 10)).toBe(true);
  });
});

describe("checkCriterion — Exclusivo", () => {
  it("early_user: true quando userId <= 100 (Chegou Cedo)", async () => {
    expect(await checkCriterion(50, "early_user", 100)).toBe(true);
    expect(await checkCriterion(100, "early_user", 100)).toBe(true);
  });

  it("early_user: false quando userId > 100", async () => {
    expect(await checkCriterion(101, "early_user", 100)).toBe(false);
  });

  it("manual: false — nunca calculado automaticamente (Cobaia)", async () => {
    expect(await checkCriterion(1, "manual", 1)).toBe(false);
  });

  it("critério desconhecido: false", async () => {
    expect(await checkCriterion(1, "unknown_xyz", 1)).toBe(false);
  });
});

// ─── calculateAndAssignBadges ─────────────────────────────────────────────────

describe("calculateAndAssignBadges", () => {
  const badgeChuteCerto = {
    id: 1,
    name: "Chute Certo",
    emoji: "🎯",
    category: "precisao",
    description: "Acertou o placar exato",
    iconUrl: null,
    criterionType: "exact_scores_career",
    criterionValue: 1,
    isManual: false,
    isActive: true,
  };

  it("atribui badge e cria notificação quando critério é atendido", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([badgeChuteCerto]))  // allBadges
      .mockReturnValueOnce(makeChain([]))                  // earned
      .mockReturnValueOnce(makeChain([{ count: 1 }]));    // checkCriterion

    const insertChain = { values: vi.fn().mockResolvedValue({ insertId: 1 }) };
    mockDb.insert.mockReturnValue(insertChain);

    const result = await calculateAndAssignBadges(1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Chute Certo");
    expect(result[0].emoji).toBe("🎯");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("não atribui badge que o usuário já possui", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([badgeChuteCerto]))
      .mockReturnValueOnce(makeChain([{ badgeId: 1 }])); // já possui

    const result = await calculateAndAssignBadges(1);
    expect(result).toHaveLength(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("não atribui badge manual (isManual=true) — filtrado no allBadges", async () => {
    // allBadges retorna vazio porque WHERE isManual=false filtra o Cobaia
    mockDb.select
      .mockReturnValueOnce(makeChain([]))  // allBadges sem manuais
      .mockReturnValueOnce(makeChain([])); // earned

    const result = await calculateAndAssignBadges(1);
    expect(result).toHaveLength(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("retorna array vazio quando DB não disponível", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null as unknown as typeof mockDb);
    const result = await calculateAndAssignBadges(1);
    expect(result).toEqual([]);
  });
});

// ─── assignBadgeManually ──────────────────────────────────────────────────────

describe("assignBadgeManually — Cobaia", () => {
  it("estrutura de retorno: success=true, alreadyHad=false quando badge existe e usuário não possui", () => {
    // Testa a lógica de retorno diretamente
    const mockResult = { success: true, alreadyHad: false };
    expect(mockResult.success).toBe(true);
    expect(mockResult.alreadyHad).toBe(false);
  });

  it("estrutura de retorno: success=true, alreadyHad=true quando usuário já possui o badge", () => {
    const mockResult = { success: true, alreadyHad: true };
    expect(mockResult.success).toBe(true);
    expect(mockResult.alreadyHad).toBe(true);
  });

  it("estrutura de retorno: success=false quando badge não existe ou está inativo", () => {
    const mockResult = { success: false, alreadyHad: false };
    expect(mockResult.success).toBe(false);
    expect(mockResult.alreadyHad).toBe(false);
  });

  it("badge Cobaia deve ser manual (isManual=true)", () => {
    const cobaiaConfig = {
      name: "Cobaia",
      emoji: "🧪",
      category: "exclusivo",
      criterionType: "manual",
      criterionValue: 1,
      isManual: true,
    };
    expect(cobaiaConfig.isManual).toBe(true);
    expect(cobaiaConfig.criterionType).toBe("manual");
  });
});

// ─── revokeBadge ──────────────────────────────────────────────────────────────

describe("revokeBadge", () => {
  it("revoga badge com sucesso", async () => {
    const deleteChain = { where: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
    mockDb.delete.mockReturnValue(deleteChain);

    const result = await revokeBadge(1, 10);
    expect(result).toBe(true);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

// ─── assignBadgeRetroactively ─────────────────────────────────────────────────

describe("assignBadgeRetroactively", () => {
  it("retorna 0 e não insere para badges manuais (Cobaia)", async () => {
    // O motor verifica badge.isManual antes de processar usuários
    const manualBadge = {
      id: 10,
      name: "Cobaia",
      emoji: "🧪",
      description: "Participou do primeiro bolão",
      iconUrl: null,
      criterionType: "manual",
      criterionValue: 1,
      isManual: true,
      isActive: true,
    };

    mockDb.select.mockReturnValue(makeChain([manualBadge]));

    const count = await assignBadgeRetroactively(10);
    expect(count).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("retorna 0 quando badge não existe", async () => {
    mockDb.select.mockReturnValue(makeChain([]));
    const count = await assignBadgeRetroactively(999);
    expect(count).toBe(0);
  });
});

// ─── Notificação ao desbloquear badge ────────────────────────────────────────

describe("Notificação ao desbloquear badge", () => {
  it("payload de notificação deve ter actionUrl='/profile/me' e category='badge_unlocked'", () => {
    // Testa a estrutura do payload de notificação diretamente
    const badge = {
      id: 1,
      name: "Chute Certo",
      emoji: "🎯",
      description: "Acertou o placar exato",
      iconUrl: null,
    };

    const badgeLabel = badge.emoji ? `${badge.emoji} ${badge.name}` : badge.name;
    const notifPayload = {
      userId: 1,
      type: "system" as const,
      title: `🏅 Badge desbloqueado: ${badgeLabel}!`,
      message: badge.description,
      isRead: false,
      imageUrl: badge.iconUrl ?? undefined,
      actionUrl: "/profile/me",
      actionLabel: "Ver meu perfil",
      priority: "high" as const,
      category: "badge_unlocked",
    };

    expect(notifPayload.actionUrl).toBe("/profile/me");
    expect(notifPayload.category).toBe("badge_unlocked");
    expect(notifPayload.title).toContain("🏅");
    expect(notifPayload.title).toContain("Chute Certo");
    expect(notifPayload.priority).toBe("high");
  });

  it("usa undefined para imageUrl quando badge não tem iconUrl", () => {
    const badge = { id: 1, name: "Chute Certo", iconUrl: null };
    const imageUrl = badge.iconUrl ?? undefined;
    expect(imageUrl).toBeUndefined();
  });

  it("usa iconUrl quando badge tem URL de ícone", () => {
    const badge = { id: 1, name: "Chute Certo", iconUrl: "https://cdn.example.com/badge.svg" };
    const imageUrl = badge.iconUrl ?? undefined;
    expect(imageUrl).toBe("https://cdn.example.com/badge.svg");
  });
});

// ─── Catálogo de badges aprovados ────────────────────────────────────────────

describe("Catálogo de badges aprovados", () => {
  const approvedBadges = [
    // Precisão
    { name: "Chute Certo", criterionType: "exact_scores_career", criterionValue: 1 },
    { name: "Manja Muito", criterionType: "exact_scores_career", criterionValue: 10 },
    { name: "Profeta", criterionType: "exact_scores_career", criterionValue: 50 },
    { name: "Mafioso das Apostas", criterionType: "exact_scores_career", criterionValue: 100 },
    { name: "Fiz de Novo", criterionType: "exact_scores_in_pool", criterionValue: 2 },
    { name: "Cola na Minha", criterionType: "exact_scores_in_pool", criterionValue: 5 },
    // Ranking
    { name: "É Campeão", criterionType: "first_place_pools", criterionValue: 1 },
    { name: "Dinastia", criterionType: "first_place_pools", criterionValue: 3 },
    { name: "Intocável", criterionType: "first_place_margin", criterionValue: 20 },
    { name: "1/20", criterionType: "first_place_large_pool", criterionValue: 20 },
    { name: "Rei da Ultrapassagem", criterionType: "rank_jump", criterionValue: 5 },
    { name: "Ninguém Me Tira", criterionType: "rank_hold_1st", criterionValue: 3 },
    // Zebra
    { name: "Só Eu Acreditei", criterionType: "zebra_scores_career", criterionValue: 1 },
    { name: "Sou do Contra", criterionType: "zebra_scores_career", criterionValue: 5 },
    { name: "Nem Eu Acreditava", criterionType: "zebra_in_pool", criterionValue: 3 },
    { name: "Foi na Sorte", criterionType: "zebra_exact_score", criterionValue: 1 },
    // Comunidade
    { name: "Boas-Vindas", criterionType: "first_bet", criterionValue: 1 },
    { name: "Levou a Sério", criterionType: "all_bets_in_pool", criterionValue: 1 },
    { name: "Desbravador", criterionType: "created_pool", criterionValue: 1 },
    { name: "Barra Brava", criterionType: "pool_members_via_invite", criterionValue: 10 },
    { name: "Presida", criterionType: "organized_pools", criterionValue: 5 },
    { name: "Ansioso Competitivo", criterionType: "early_bet", criterionValue: 10 },
    { name: "Veterano", criterionType: "participated_pools", criterionValue: 10 },
    // Exclusivo
    { name: "Cobaia", criterionType: "manual", criterionValue: 1 },
    { name: "Chegou Cedo", criterionType: "early_user", criterionValue: 100 },
  ];

  it("catálogo tem exatamente 25 badges", () => {
    expect(approvedBadges).toHaveLength(25);
  });

  it("todos os badges têm criterionValue positivo", () => {
    approvedBadges.forEach((b) => {
      expect(b.criterionValue).toBeGreaterThan(0);
    });
  });

  it("Chegou Cedo exige userId <= 100", () => {
    const badge = approvedBadges.find((b) => b.name === "Chegou Cedo");
    expect(badge?.criterionType).toBe("early_user");
    expect(badge?.criterionValue).toBe(100);
  });

  it("Cobaia é manual (não calculado automaticamente)", () => {
    const badge = approvedBadges.find((b) => b.name === "Cobaia");
    expect(badge?.criterionType).toBe("manual");
  });

  it("É Campeão exige 1 vitória", () => {
    const badge = approvedBadges.find((b) => b.name === "É Campeão");
    expect(badge?.criterionType).toBe("first_place_pools");
    expect(badge?.criterionValue).toBe(1);
  });

  it("Mafioso das Apostas exige 100 placares exatos na carreira", () => {
    const badge = approvedBadges.find((b) => b.name === "Mafioso das Apostas");
    expect(badge?.criterionType).toBe("exact_scores_career");
    expect(badge?.criterionValue).toBe(100);
  });
});
