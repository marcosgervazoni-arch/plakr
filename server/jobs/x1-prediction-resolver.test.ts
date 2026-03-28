/**
 * Testes para o X1 Prediction Resolver
 *
 * Cobre:
 *  - countHits: contagem de acertos de uma aposta
 *  - resolvePhase: resolução de duelos de uma fase específica
 *  - runX1PredictionResolverJob: varredura completa de torneios
 *  - registerX1PredictionResolverCron: registro do cron sem erro
 *  - Cenários: challenger vence, challenged vence, empate, sem duelos, fase incompleta
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks globais ────────────────────────────────────────────────────────────

vi.mock("../../server/db", () => ({
  getDb: vi.fn(),
  createNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../drizzle/schema", () => ({
  x1Challenges: {},
  games: {},
  pools: {},
  tournaments: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => `eq(${String(a)},${String(b)})`),
  and: vi.fn((...args) => `and(${args.join(",")})`),
  ne: vi.fn((a, b) => `ne(${String(a)},${String(b)})`),
  inArray: vi.fn((a, b) => `inArray(${String(a)},[${String(b)}])`),
  isNotNull: vi.fn((a) => `isNotNull(${String(a)})`),
}));

// ─── Helper: cria um mock de db com comportamento sequencial ─────────────────

function createMockDb(selectResults: any[]) {
  let callIndex = 0;

  const getNext = () => {
    const val = selectResults[callIndex] ?? [];
    callIndex++;
    return val;
  };

  const mockDb: any = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const result = getNext();
          return Object.assign(Promise.resolve(result), {
            limit: vi.fn().mockResolvedValue(result),
          });
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((data: any) => ({
        where: vi.fn().mockResolvedValue([]),
        _setData: data,
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue([]),
    })),
  };

  return mockDb;
}

// ─── Testes: countHits (via export indireto — testado implicitamente) ─────────

describe("resolvePhase", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("retorna resolved=0 quando não há times que avançaram", async () => {
    const { getDb } = await import("../../server/db");

    // getAdvancedTeams: nextPhase games (sem teamAId) → fallback: current phase games (sem scores)
    // resolvePhase: pools do torneio → []
    const mockDb = createMockDb([
      [], // nextPhase games (isNotNull filter → vazio)
      [], // current phase games (fallback)
      [], // pools do torneio
    ]);
    (getDb as any).mockResolvedValue(mockDb);

    const { resolvePhase } = await import("./x1-prediction-resolver");
    const result = await resolvePhase(1, "Oitavas de Final", ["Rodada de 32", "Oitavas de Final", "Quartas de Final"]);

    expect(result.resolved).toBe(0);
    expect(result.advancedTeamIds).toHaveLength(0);
  });

  it("resolve challenger como vencedor quando acerta mais times", async () => {
    const { getDb } = await import("../../server/db");

    // allPhases = ["Rodada de 32", "Oitavas de Final", "Quartas de Final"] (3 fases)
    // getAdvancedTeams faz 3 queries de contagem (uma por fase) antes de buscar a próxima fase
    // Contagens: Rodada de 32 = 16 jogos, Oitavas = 8, Quartas = 4
    // Próxima fase após "Oitavas de Final" (8 jogos) = "Quartas de Final" (4 jogos)
    // Busca jogos da Quartas com isNotNull(teamAId) → retorna nextPhaseGames

    const nextPhaseGames = [
      { teamAId: 1, teamBId: 2 },
      { teamAId: 3, teamBId: 4 },
    ];

    const pools = [{ id: 10 }];

    const activeChallenges = [
      {
        id: 99,
        status: "active",
        challengeType: "prediction",
        predictionType: "phase_qualified",
        poolId: 10,
        challengerId: 1,
        challengedId: 2,
        challengerAnswer: ["1", "2", "3", "4"],
        challengedAnswer: ["1", "2", "5", "6"],
        predictionContext: { phase: "Oitavas de Final" },
      },
    ];

    const capturedSets: any[] = [];
    const mockDb = createMockDb([
      // getAdvancedTeams: 3 queries de contagem por fase (uma por allPhases item)
      [{ id: 1 }, { id: 2 }], // count Rodada de 32 (2 jogos)
      [{ id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }], // count Oitavas (4 jogos)
      [{ id: 7 }, { id: 8 }], // count Quartas (2 jogos)
      // Busca jogos da próxima fase (Quartas) com isNotNull
      nextPhaseGames,
      // resolvePhase: pools do torneio
      pools,
      // duelos ativos
      activeChallenges,
    ]);

    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    (getDb as any).mockResolvedValue(mockDb);

    const { resolvePhase } = await import("./x1-prediction-resolver");
    const result = await resolvePhase(1, "Oitavas de Final", ["Rodada de 32", "Oitavas de Final", "Quartas de Final"]);

    expect(result.resolved).toBe(1);
    expect(result.skipped).toBe(0);

    const concludeSet = capturedSets.find((s) => s.status === "concluded");
    expect(concludeSet).toBeDefined();
    expect(concludeSet?.winnerId).toBe(1); // challenger vence (4 > 2)
    expect(concludeSet?.challengerPoints).toBe(4);
    expect(concludeSet?.challengedPoints).toBe(2);
  });

  it("resolve challenged como vencedor quando acerta mais times", async () => {
    const { getDb } = await import("../../server/db");

    // allPhases = ["Oitavas de Final", "Quartas de Final", "Semifinais"] (3 fases)
    // Contagens: Oitavas = 8, Quartas = 4, Semifinais = 2
    // Próxima fase após "Quartas de Final" (4 jogos) = "Semifinais" (2 jogos)

    const nextPhaseGames = [
      { teamAId: 5, teamBId: 6 },
      { teamAId: 7, teamBId: 8 },
    ];

    const pools = [{ id: 20 }];

    const activeChallenges = [
      {
        id: 77,
        status: "active",
        challengeType: "prediction",
        predictionType: "phase_qualified",
        poolId: 20,
        challengerId: 10,
        challengedId: 20,
        challengerAnswer: ["1", "2", "3", "4"], // 0 acertos
        challengedAnswer: ["5", "6", "7", "8"], // 4 acertos
        predictionContext: { phase: "Quartas de Final" },
      },
    ];

    const capturedSets: any[] = [];
    const mockDb = createMockDb([
      // 3 queries de contagem por fase
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], // Oitavas (4 jogos)
      [{ id: 5 }, { id: 6 }], // Quartas (2 jogos)
      [{ id: 7 }], // Semifinais (1 jogo)
      // Jogos da próxima fase (Semifinais)
      nextPhaseGames,
      // Pools
      pools,
      // Duelos ativos
      activeChallenges,
    ]);

    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    (getDb as any).mockResolvedValue(mockDb);

    const { resolvePhase } = await import("./x1-prediction-resolver");
    const result = await resolvePhase(1, "Quartas de Final", ["Oitavas de Final", "Quartas de Final", "Semifinais"]);

    expect(result.resolved).toBe(1);
    const concludeSet = capturedSets.find((s) => s.status === "concluded");
    expect(concludeSet?.winnerId).toBe(20); // challenged vence
    expect(concludeSet?.challengerPoints).toBe(0);
    expect(concludeSet?.challengedPoints).toBe(4);
  });

  it("define winnerId como null em caso de empate de acertos", async () => {
    const { getDb } = await import("../../server/db");

    // allPhases = ["Quartas de Final", "Semifinais", "Final"] (3 fases)
    // Contagens: Quartas = 4, Semifinais = 2, Final = 1
    // Próxima fase após "Semifinais" (2 jogos) = "Final" (1 jogo)

    const nextPhaseGames = [
      { teamAId: 1, teamBId: 2 },
    ];

    const pools = [{ id: 30 }];

    const activeChallenges = [
      {
        id: 55,
        status: "active",
        challengeType: "prediction",
        predictionType: "phase_qualified",
        poolId: 30,
        challengerId: 100,
        challengedId: 200,
        challengerAnswer: ["1", "3"], // 1 acerto (time 1)
        challengedAnswer: ["2", "4"], // 1 acerto (time 2)
        predictionContext: { phase: "Semifinais" },
      },
    ];

    const capturedSets: any[] = [];
    const mockDb = createMockDb([
      // 3 queries de contagem por fase
      [{ id: 1 }, { id: 2 }], // Quartas (2 jogos)
      [{ id: 3 }], // Semifinais (1 jogo)
      [], // Final (0 jogos)
      // Jogos da próxima fase (Final)
      nextPhaseGames,
      // Pools
      pools,
      // Duelos ativos
      activeChallenges,
    ]);

    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    (getDb as any).mockResolvedValue(mockDb);

    const { resolvePhase } = await import("./x1-prediction-resolver");
    const result = await resolvePhase(1, "Semifinais", ["Quartas de Final", "Semifinais", "Final"]);

    expect(result.resolved).toBe(1);
    const concludeSet = capturedSets.find((s) => s.status === "concluded");
    expect(concludeSet?.winnerId).toBeNull(); // empate
    expect(concludeSet?.challengerPoints).toBe(1);
    expect(concludeSet?.challengedPoints).toBe(1);
  });

  it("ignora duelos de outras fases", async () => {
    const { getDb } = await import("../../server/db");

    // allPhases = ["Quartas de Final", "Semifinais", "Final"] (3 fases)
    const nextPhaseGames = [{ teamAId: 1, teamBId: 2 }];
    const pools = [{ id: 40 }];

    // Duelo apostando em "Quartas de Final", mas estamos resolvendo "Semifinais"
    const activeChallenges = [
      {
        id: 33,
        status: "active",
        challengeType: "prediction",
        predictionType: "phase_qualified",
        poolId: 40,
        challengerId: 1,
        challengedId: 2,
        challengerAnswer: ["1"],
        challengedAnswer: ["2"],
        predictionContext: { phase: "Quartas de Final" }, // fase diferente
      },
    ];

    const mockDb = createMockDb([
      // 3 queries de contagem
      [{ id: 1 }, { id: 2 }], // Quartas
      [{ id: 3 }], // Semifinais
      [], // Final
      // Jogos da próxima fase
      nextPhaseGames,
      // Pools
      pools,
      // Duelos ativos
      activeChallenges,
    ]);

    (getDb as any).mockResolvedValue(mockDb);

    const { resolvePhase } = await import("./x1-prediction-resolver");
    const result = await resolvePhase(1, "Semifinais", ["Quartas de Final", "Semifinais", "Final"]);

    expect(result.resolved).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

// ─── Testes: runX1PredictionResolverJob ──────────────────────────────────────

describe("runX1PredictionResolverJob", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("retorna phasesChecked=0 quando não há torneios ativos", async () => {
    const { getDb } = await import("../../server/db");

    const mockDb = createMockDb([
      [], // activePools → vazio
    ]);
    (getDb as any).mockResolvedValue(mockDb);

    const { runX1PredictionResolverJob } = await import("./x1-prediction-resolver");
    const result = await runX1PredictionResolverJob();

    expect(result.phasesChecked).toBe(0);
    expect(result.totalResolved).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it("ignora fases de grupo (group_stage)", async () => {
    const { getDb } = await import("../../server/db");

    const activePools = [{ tournamentId: 1 }];

    // Todos os jogos são group_stage → nenhuma fase de mata-mata
    const allGames = [
      { phase: "group_stage", status: "finished" },
      { phase: "group_stage", status: "finished" },
    ];

    const mockDb = createMockDb([
      activePools,
      allGames,
    ]);
    (getDb as any).mockResolvedValue(mockDb);

    const { runX1PredictionResolverJob } = await import("./x1-prediction-resolver");
    const result = await runX1PredictionResolverJob();

    expect(result.phasesChecked).toBe(0);
    expect(result.totalResolved).toBe(0);
  });

  it("ignora fases parcialmente encerradas", async () => {
    const { getDb } = await import("../../server/db");

    const activePools = [{ tournamentId: 1 }];

    // Fase com 2 jogos mas apenas 1 finalizado
    const allGames = [
      { phase: "Oitavas de Final", status: "finished" },
      { phase: "Oitavas de Final", status: "scheduled" }, // ainda não terminou
    ];

    const mockDb = createMockDb([
      activePools,
      allGames,
    ]);
    (getDb as any).mockResolvedValue(mockDb);

    const { runX1PredictionResolverJob } = await import("./x1-prediction-resolver");
    const result = await runX1PredictionResolverJob();

    expect(result.phasesChecked).toBe(1);
    expect(result.totalResolved).toBe(0);
  });
});

// ─── Testes: registerX1PredictionResolverCron ────────────────────────────────

describe("registerX1PredictionResolverCron", () => {
  it("registra o cron sem lançar erros", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const { registerX1PredictionResolverCron } = await import("./x1-prediction-resolver");
    expect(() => registerX1PredictionResolverCron()).not.toThrow();

    vi.useRealTimers();
  });

  it("stopX1PredictionResolverCron não lança erros quando chamado após registro", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const { registerX1PredictionResolverCron, stopX1PredictionResolverCron } = await import("./x1-prediction-resolver");
    registerX1PredictionResolverCron();
    expect(() => stopX1PredictionResolverCron()).not.toThrow();

    vi.useRealTimers();
  });
});

// ─── Testes: x1PredictionResolverHealth ──────────────────────────────────────

describe("x1PredictionResolverHealth", () => {
  it("exporta o objeto de health com campos corretos", async () => {
    vi.resetModules();
    const { x1PredictionResolverHealth } = await import("./x1-prediction-resolver");

    expect(x1PredictionResolverHealth).toHaveProperty("lastRunAt");
    expect(x1PredictionResolverHealth).toHaveProperty("lastRunSuccess");
    expect(x1PredictionResolverHealth).toHaveProperty("lastError");
    expect(x1PredictionResolverHealth).toHaveProperty("runCount");
    expect(x1PredictionResolverHealth).toHaveProperty("lastResolvedCount");
  });
});
