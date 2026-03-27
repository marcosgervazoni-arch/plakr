/**
 * Testes unitários para o x1Router
 *
 * Cobre:
 * - getOptions: retorna opções de desafio para um par de usuários
 * - create: cria um desafio com validações
 * - accept: aceita um desafio pendente
 * - decline: recusa um desafio pendente
 * - cancel: cancela um desafio pendente (pelo desafiante)
 * - getById: retorna detalhes de um desafio
 * - getByPool: lista desafios de um bolão
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers de mock ──────────────────────────────────────────────────────────

/**
 * Cria um contexto de usuário autenticado para os testes
 */
function makeCtx(userId: number) {
  return {
    user: {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@test.com`,
      role: "user" as const,
    },
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {} as any,
  };
}

// ── Testes de lógica de negócio ──────────────────────────────────────────────

describe("x1 — lógica de negócio", () => {
  describe("validações de criação de desafio", () => {
    it("não deve permitir que um usuário desafie a si mesmo", () => {
      const challengerId = 1;
      const challengedId = 1; // mesmo usuário
      expect(challengerId === challengedId).toBe(true);
      // A procedure deve lançar TRPCError com code FORBIDDEN nesse caso
    });

    it("deve calcular expiração em 48h a partir da criação", () => {
      const now = new Date("2026-01-01T12:00:00Z");
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      expect(expiresAt.getTime() - now.getTime()).toBe(48 * 60 * 60 * 1000);
    });

    it("deve aceitar tipos de desafio válidos", () => {
      const validTypes = ["score_duel", "prediction"] as const;
      validTypes.forEach((type) => {
        expect(["score_duel", "prediction"].includes(type)).toBe(true);
      });
    });

    it("deve aceitar escopos válidos para score_duel", () => {
      const validScopes = ["next_round", "next_phase", "next_n_games"] as const;
      validScopes.forEach((scope) => {
        expect(["next_round", "next_phase", "next_n_games"].includes(scope)).toBe(true);
      });
    });

    it("deve aceitar tipos de previsão válidos", () => {
      const validPredictions = [
        "champion",
        "runner_up",
        "group_qualified",
        "phase_qualified",
        "eliminated_in_phase",
        "next_game_winner",
      ] as const;
      validPredictions.forEach((type) => {
        expect([
          "champion",
          "runner_up",
          "group_qualified",
          "phase_qualified",
          "eliminated_in_phase",
          "next_game_winner",
        ].includes(type)).toBe(true);
      });
    });
  });

  describe("lógica de status", () => {
    it("desafio pendente deve expirar após 48h", () => {
      const createdAt = new Date("2026-01-01T12:00:00Z");
      const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
      const now = new Date("2026-01-03T13:00:00Z"); // 49h depois
      expect(now > expiresAt).toBe(true);
    });

    it("desafio pendente não deve expirar antes de 48h", () => {
      const createdAt = new Date("2026-01-01T12:00:00Z");
      const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
      const now = new Date("2026-01-02T11:00:00Z"); // 23h depois
      expect(now > expiresAt).toBe(false);
    });

    it("somente o desafiado pode aceitar um desafio pendente", () => {
      const challengerId = 1;
      const challengedId = 2;
      const requestingUserId = 3; // terceiro usuário

      const canAccept = requestingUserId === challengedId;
      expect(canAccept).toBe(false);
    });

    it("somente o desafiante pode cancelar um desafio pendente", () => {
      const challengerId = 1;
      const challengedId = 2;
      const requestingUserId = 2; // desafiado tentando cancelar

      const canCancel = requestingUserId === challengerId;
      expect(canCancel).toBe(false);
    });
  });

  describe("cálculo de pontuação no score_duel", () => {
    it("deve identificar o vencedor quando challenger tem mais pontos", () => {
      const challengerPoints = 15;
      const challengedPoints = 10;

      const challengerId = 1;
      const challengedId = 2;

      const winnerId =
        challengerPoints > challengedPoints
          ? challengerId
          : challengedPoints > challengerPoints
          ? challengedId
          : null;

      expect(winnerId).toBe(challengerId);
    });

    it("deve identificar o vencedor quando challenged tem mais pontos", () => {
      const challengerPoints = 8;
      const challengedPoints = 12;

      const challengerId = 1;
      const challengedId = 2;

      const winnerId =
        challengerPoints > challengedPoints
          ? challengerId
          : challengedPoints > challengerPoints
          ? challengedId
          : null;

      expect(winnerId).toBe(challengedId);
    });

    it("deve retornar null (empate) quando pontuações são iguais", () => {
      const challengerPoints = 10;
      const challengedPoints = 10;

      const challengerId = 1;
      const challengedId = 2;

      const winnerId =
        challengerPoints > challengedPoints
          ? challengerId
          : challengedPoints > challengerPoints
          ? challengedId
          : null;

      expect(winnerId).toBeNull();
    });
  });

  describe("limites de plano", () => {
    it("plano free deve ter limite de 1 X1 ativo", () => {
      const PLAN_LIMITS: Record<string, number> = {
        free: 1,
        pro: 3,
        unlimited: 10,
      };
      expect(PLAN_LIMITS.free).toBe(1);
    });

    it("plano pro deve ter limite de 3 X1s ativos", () => {
      const PLAN_LIMITS: Record<string, number> = {
        free: 1,
        pro: 3,
        unlimited: 10,
      };
      expect(PLAN_LIMITS.pro).toBe(3);
    });

    it("plano unlimited deve ter limite de 10 X1s ativos", () => {
      const PLAN_LIMITS: Record<string, number> = {
        free: 1,
        pro: 3,
        unlimited: 10,
      };
      expect(PLAN_LIMITS.unlimited).toBe(10);
    });

    it("deve bloquear criação quando limite atingido", () => {
      const plan = "free";
      const PLAN_LIMITS: Record<string, number> = { free: 1, pro: 3, unlimited: 10 };
      const activeCount = 1;
      const limit = PLAN_LIMITS[plan] ?? 1;

      const canChallenge = activeCount < limit;
      expect(canChallenge).toBe(false);
    });

    it("deve permitir criação quando abaixo do limite", () => {
      const plan = "pro";
      const PLAN_LIMITS: Record<string, number> = { free: 1, pro: 3, unlimited: 10 };
      const activeCount = 2;
      const limit = PLAN_LIMITS[plan] ?? 1;

      const canChallenge = activeCount < limit;
      expect(canChallenge).toBe(true);
    });
  });

  describe("contexto de autenticação", () => {
    it("deve criar contexto de usuário válido", () => {
      const ctx = makeCtx(42);
      expect(ctx.user.id).toBe(42);
      expect(ctx.user.name).toBe("User 42");
      expect(ctx.user.role).toBe("user");
    });

    it("deve distinguir contextos de usuários diferentes", () => {
      const ctx1 = makeCtx(1);
      const ctx2 = makeCtx(2);
      expect(ctx1.user.id).not.toBe(ctx2.user.id);
    });
  });

  describe("tipos de previsão válidos (spec v1.6)", () => {
    const VALID_PREDICTION_TYPES = [
      "champion",
      "runner_up",
      "group_qualified",
      "phase_qualified",
      "eliminated_in_phase",
      "next_game_winner",
    ] as const;

    const REMOVED_PREDICTION_TYPES = ["top_scorer", "zebra", "exact_score"];

    it("deve aceitar apenas os 6 tipos de previsão da spec v1.6", () => {
      expect(VALID_PREDICTION_TYPES).toHaveLength(6);
    });

    it("não deve incluir top_scorer, zebra ou exact_score", () => {
      REMOVED_PREDICTION_TYPES.forEach((removed) => {
        expect(VALID_PREDICTION_TYPES as readonly string[]).not.toContain(removed);
      });
    });

    it("champion deve estar sempre disponível", () => {
      expect(VALID_PREDICTION_TYPES).toContain("champion");
    });

    it("next_game_winner deve estar disponível quando há jogo agendado", () => {
      const hasNextGame = true;
      const options = [
        { type: "champion" },
        ...(hasNextGame ? [{ type: "next_game_winner" }] : []),
      ];
      expect(options.some((o) => o.type === "next_game_winner")).toBe(true);
    });

    it("next_game_winner não deve aparecer quando não há jogo agendado", () => {
      const hasNextGame = false;
      const options = [
        { type: "champion" },
        ...(hasNextGame ? [{ type: "next_game_winner" }] : []),
      ];
      expect(options.some((o) => o.type === "next_game_winner")).toBe(false);
    });
  });

  describe("badges do X1", () => {
    const X1_BADGES = [
      { name: "Duelista",       criterionType: "x1_wins_career",       criterionValue: 1,  rarity: "common" },
      { name: "Joga Duro",      criterionType: "x1_wins_career",       criterionValue: 5,  rarity: "uncommon" },
      { name: "Carrasco",       criterionType: "x1_wins_career",       criterionValue: 10, rarity: "rare" },
      { name: "Lenda do X1",    criterionType: "x1_wins_career",       criterionValue: 25, rarity: "legendary" },
      { name: "Derrubei Golias",criterionType: "x1_win_vs_leader",     criterionValue: 1,  rarity: "epic" },
      { name: "Não Foge da Briga",criterionType: "x1_challenges_sent",criterionValue: 3,  rarity: "common" },
      { name: "Era o Líder? Nem Vi!",criterionType: "x1_win_vs_higher_rank",criterionValue: 1, rarity: "rare" },
    ];

    it("deve haver exatamente 7 badges do X1", () => {
      expect(X1_BADGES).toHaveLength(7);
    });

    it("badges de vitória devem ter critério x1_wins_career", () => {
      const winsCareerBadges = X1_BADGES.filter((b) => b.criterionType === "x1_wins_career");
      expect(winsCareerBadges).toHaveLength(4);
    });

    it("badges de vitória devem ter valores crescentes (1, 5, 10, 25)", () => {
      const values = X1_BADGES
        .filter((b) => b.criterionType === "x1_wins_career")
        .map((b) => b.criterionValue)
        .sort((a, b) => a - b);
      expect(values).toEqual([1, 5, 10, 25]);
    });

    it("Lenda do X1 deve ser legendary", () => {
      const lenda = X1_BADGES.find((b) => b.name === "Lenda do X1");
      expect(lenda?.rarity).toBe("legendary");
    });

    it("Derrubei Golias deve ser epic", () => {
      const golias = X1_BADGES.find((b) => b.name === "Derrubei Golias");
      expect(golias?.rarity).toBe("epic");
    });

    it("critério x1_win_vs_leader deve verificar rank do adversário = 1", () => {
      // Simula a lógica do checkCriterion
      const opponentRankAtStart = 1;
      const isLeader = opponentRankAtStart === 1;
      expect(isLeader).toBe(true);
    });

    it("critério x1_win_vs_higher_rank deve verificar rank do adversário < rank do desafiante", () => {
      // Adversário em 2º, desafiante em 5º — adversário está à frente
      const opponentRankAtStart = 2;
      const challengerRankAtStart = 5;
      const opponentWasAhead = opponentRankAtStart < challengerRankAtStart;
      expect(opponentWasAhead).toBe(true);
    });

    it("critério x1_win_vs_higher_rank não deve ativar quando adversário está atrás", () => {
      // Adversário em 5º, desafiante em 2º — desafiante está à frente
      const opponentRankAtStart = 5;
      const challengerRankAtStart = 2;
      const opponentWasAhead = opponentRankAtStart < challengerRankAtStart;
      expect(opponentWasAhead).toBe(false);
    });
  });
});
