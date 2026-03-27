/**
 * Testes para os jobs de automação do X1
 *
 * Cobre:
 *  - x1ExpiryJob: expira desafios pendentes vencidos
 *  - x1ScoreUpdateJob: atualiza placar e conclui duelos
 *  - registerX1CronJobs: registra o cron sem erro
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks globais ────────────────────────────────────────────────────────────

vi.mock("../../server/db", () => ({
  getDb: vi.fn(),
  createNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../drizzle/schema", () => ({
  x1Challenges: {},
  x1GameScores: {},
  bets: {},
  games: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => `eq(${String(a)},${String(b)})`),
  and: vi.fn((...args) => `and(${args.join(",")})`),
  lt: vi.fn((a, b) => `lt(${String(a)},${String(b)})`),
  inArray: vi.fn((a, b) => `inArray(${String(a)},[${String(b)}])`),
}));

// ─── Helper: cria um mock de db com comportamento sequencial ─────────────────

/**
 * Cria um mock de `db` onde:
 *  - select().from().where() retorna o próximo valor da fila `selectResults`
 *  - select().from().where().limit() também retorna o próximo valor
 *  - update().set().where() sempre resolve com []
 *  - insert().values() sempre resolve com []
 */
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
          // Retorna um objeto que é tanto awaitable quanto tem .limit()
          const awaitable = Object.assign(Promise.resolve(result), {
            limit: vi.fn().mockResolvedValue(result),
          });
          return awaitable;
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

// ─── Testes: x1ExpiryJob ─────────────────────────────────────────────────────

describe("x1ExpiryJob", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("retorna { expired: 0 } quando não há desafios vencidos", async () => {
    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(createMockDb([[]])); // select retorna []

    const { x1ExpiryJob } = await import("./x1-jobs");
    const result = await x1ExpiryJob();

    expect(result).toEqual({ expired: 0 });
  });

  it("expira 2 desafios pendentes vencidos", async () => {
    const stale = [
      { id: 1, status: "pending", challengerId: 10, challengedId: 20, expiresAt: new Date(Date.now() - 1000) },
      { id: 2, status: "pending", challengerId: 30, challengedId: 40, expiresAt: new Date(Date.now() - 2000) },
    ];

    const mockDb = createMockDb([stale]);
    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ExpiryJob } = await import("./x1-jobs");
    const result = await x1ExpiryJob();

    expect(result.expired).toBe(2);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  it("expira 1 desafio e chama update com status expired", async () => {
    const stale = [
      { id: 99, status: "pending", challengerId: 1, challengedId: 2, expiresAt: new Date(Date.now() - 5000) },
    ];

    const capturedSets: any[] = [];
    const mockDb = createMockDb([stale]);
    // Override update para capturar o set
    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ExpiryJob } = await import("./x1-jobs");
    const result = await x1ExpiryJob();

    expect(result.expired).toBe(1);
    expect(capturedSets[0]).toEqual({ status: "expired" });
  });
});

// ─── Testes: x1ScoreUpdateJob ────────────────────────────────────────────────

describe("x1ScoreUpdateJob", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("retorna { updated: 0, concluded: 0 } quando não há desafios ativos", async () => {
    const mockDb = createMockDb([[]]); // activeChallenges = []
    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ScoreUpdateJob } = await import("./x1-jobs");
    const result = await x1ScoreUpdateJob(999);

    expect(result).toEqual({ updated: 0, concluded: 0 });
  });

  it("retorna { updated: 0, concluded: 0 } quando desafio ativo não inclui o gameId", async () => {
    const activeChallenge = {
      id: 1,
      status: "active",
      challengerId: 1,
      challengedId: 2,
      poolId: 10,
      gameIds: [100, 200], // não inclui 999
    };

    const mockDb = createMockDb([[activeChallenge]]);
    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ScoreUpdateJob } = await import("./x1-jobs");
    const result = await x1ScoreUpdateJob(999);

    expect(result).toEqual({ updated: 0, concluded: 0 });
  });

  it("atualiza placar sem concluir quando nem todos os jogos terminaram", async () => {
    const gameId = 42;
    const activeChallenge = {
      id: 5,
      status: "active",
      challengerId: 1,
      challengedId: 2,
      poolId: 10,
      gameIds: [gameId, 100], // 100 ainda não terminou
    };

    // Ordem das queries:
    // 1. activeChallenges → [activeChallenge]
    // 2. challengerBet (Promise.all[0]) → [{ points: 10 }]
    // 3. challengedBet (Promise.all[1]) → [{ points: 7 }]
    // 4. existing x1GameScores → [] (insert)
    // 5. finishedGames (inArray) → [{ id: 42, status: "finished" }, { id: 100, status: "scheduled" }]
    const mockDb = createMockDb([
      [activeChallenge],
      [{ points: 10 }],
      [{ points: 7 }],
      [],
      [{ id: gameId, status: "finished" }, { id: 100, status: "scheduled" }],
    ]);

    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ScoreUpdateJob } = await import("./x1-jobs");
    const result = await x1ScoreUpdateJob(gameId);

    expect(result.updated).toBe(1);
    expect(result.concluded).toBe(0);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("conclui o duelo quando todos os jogos estão finalizados — challenger vence", async () => {
    const gameId = 77;
    const activeChallenge = {
      id: 9,
      status: "active",
      challengerId: 1,
      challengedId: 2,
      poolId: 10,
      gameIds: [gameId], // único jogo
    };

    // Ordem das queries:
    // 1. activeChallenges
    // 2. challengerBet → 20pts
    // 3. challengedBet → 10pts
    // 4. existing x1GameScores → [] (insert)
    // 5. finishedGames → todos finished
    // 6. allScores → [{ challengerPoints: 20, challengedPoints: 10 }]
    const mockDb = createMockDb([
      [activeChallenge],
      [{ points: 20 }],
      [{ points: 10 }],
      [],
      [{ id: gameId, status: "finished" }],
      [{ challengerPoints: 20, challengedPoints: 10 }],
    ]);

    const capturedSets: any[] = [];
    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ScoreUpdateJob } = await import("./x1-jobs");
    const result = await x1ScoreUpdateJob(gameId);

    expect(result.updated).toBe(1);
    expect(result.concluded).toBe(1);

    const concludeSet = capturedSets.find((s) => s.status === "concluded");
    expect(concludeSet).toBeDefined();
    expect(concludeSet?.winnerId).toBe(1); // challenger vence
  });

  it("define winnerId como null em caso de empate", async () => {
    const gameId = 55;
    const activeChallenge = {
      id: 11,
      status: "active",
      challengerId: 1,
      challengedId: 2,
      poolId: 10,
      gameIds: [gameId],
    };

    const mockDb = createMockDb([
      [activeChallenge],
      [{ points: 15 }],
      [{ points: 15 }], // empate
      [],
      [{ id: gameId, status: "finished" }],
      [{ challengerPoints: 15, challengedPoints: 15 }], // empate nos totais
    ]);

    const capturedSets: any[] = [];
    mockDb.update = vi.fn(() => ({
      set: vi.fn((data: any) => {
        capturedSets.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { getDb } = await import("../../server/db");
    (getDb as any).mockResolvedValue(mockDb);

    const { x1ScoreUpdateJob } = await import("./x1-jobs");
    await x1ScoreUpdateJob(gameId);

    const concludeSet = capturedSets.find((s) => s.status === "concluded");
    expect(concludeSet).toBeDefined();
    expect(concludeSet?.winnerId).toBeNull();
  });
});

// ─── Testes: registerX1CronJobs ──────────────────────────────────────────────

describe("registerX1CronJobs", () => {
  it("registra o cron sem lançar erros", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const { registerX1CronJobs } = await import("./x1-jobs");
    expect(() => registerX1CronJobs()).not.toThrow();

    vi.useRealTimers();
  });
});
