/**
 * [SUG-2] Testes de Prazo de Palpite (Deadline) com Clock Skew
 *
 * Cobre os cenários identificados como lacuna na auditoria:
 * - Palpite bloqueado quando `now > matchDate - deadlineMinutes`
 * - Palpite permitido quando ainda dentro do prazo
 * - Clock skew: palpite com 1ms de atraso deve ser bloqueado
 * - Clock skew: palpite com 1ms de antecedência deve ser permitido
 * - Deadline customizado por bolão (bettingDeadlineMinutes)
 * - Deadline = 0 minutos (prazo encerra exatamente no início do jogo)
 * - Jogo com status "finished" bloqueia independente do prazo
 * - Jogo com status "live" bloqueia independente do prazo
 * - Usuário bloqueado (isBlocked) não pode palpitar mesmo dentro do prazo
 * - Jogo de outro torneio é rejeitado (S9)
 *
 * Estratégia: mock de getGameById, getPoolById, getPoolMember, getPoolScoringRules,
 * upsertBet para simular estados sem depender do banco real.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── MOCKS ────────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getGameById: vi.fn(),
    getPoolById: vi.fn(),
    getPoolMember: vi.fn(),
    getPoolScoringRules: vi.fn(),
    upsertBet: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  getGameById,
  getPoolById,
  getPoolMember,
  getPoolScoringRules,
  upsertBet,
} from "./db";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "user-deadline-test",
    name: "Deadline Test User",
    email: "deadline@example.com",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// Cria um jogo com matchDate relativa ao momento atual
function makeGame(offsetMs: number, status: "scheduled" | "live" | "finished" = "scheduled") {
  return {
    id: 1,
    tournamentId: 10,
    teamAId: 1,
    teamBId: 2,
    matchDate: new Date(Date.now() + offsetMs),
    status,
    scoreA: null,
    scoreB: null,
    phase: null,
    isZebra: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const poolFree = {
  id: 5,
  name: "Bolão Deadline Test",
  slug: "bolao-deadline",
  tournamentId: 10,
  ownerId: 1,
  plan: "free" as const,
  accessType: "public" as const,
  status: "active" as const,
  inviteToken: "tok",
  inviteCode: "CODE1234",
  isArchived: false,
  description: null,
  logoUrl: null,
  planExpiresAt: null,
  stripeSubscriptionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memberActive = {
  userId: 1,
  poolId: 5,
  role: "participant" as const,
  isBlocked: false,
  joinedAt: new Date(),
  stats: null,
};

const memberBlocked = { ...memberActive, isBlocked: true };

const noRules = null; // usa deadline padrão de 60 minutos

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPoolById).mockResolvedValue(poolFree as any);
  vi.mocked(getPoolMember).mockResolvedValue(memberActive as any);
  vi.mocked(getPoolScoringRules).mockResolvedValue(noRules as any);
  vi.mocked(upsertBet).mockResolvedValue(undefined as any);
});

// ─── TESTES PRINCIPAIS ────────────────────────────────────────────────────────
describe("[SUG-2] Prazo de palpite — deadline padrão (60 min)", () => {
  it("palpite permitido quando jogo começa em 2h → dentro do prazo", async () => {
    vi.mocked(getGameById).mockResolvedValue(makeGame(2 * 60 * 60 * 1000) as any); // +2h
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.bets.placeBet({
      poolId: 5, gameId: 1, predictedScoreA: 2, predictedScoreB: 1,
    });
    expect(result).toMatchObject({ success: true });
    expect(vi.mocked(upsertBet)).toHaveBeenCalledOnce();
  });

  it("palpite bloqueado quando jogo começa em 30min → fora do prazo (deadline=60min)", async () => {
    vi.mocked(getGameById).mockResolvedValue(makeGame(30 * 60 * 1000) as any); // +30min
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 1, predictedScoreB: 0 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Prazo para palpites encerrado"),
    });
    expect(vi.mocked(upsertBet)).not.toHaveBeenCalled();
  });

  it("palpite bloqueado quando jogo já começou (matchDate no passado)", async () => {
    vi.mocked(getGameById).mockResolvedValue(makeGame(-1 * 60 * 1000) as any); // -1min (passado)
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 0, predictedScoreB: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("[SUG-2] Clock skew — precisão de milissegundos", () => {
  it("palpite com 1ms antes do deadline → permitido", async () => {
    // deadline = matchDate - 60min; agora = matchDate - 60min - 1ms → dentro do prazo
    vi.mocked(getGameById).mockResolvedValue(makeGame(60 * 60 * 1000 + 1) as any); // +60min+1ms
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.bets.placeBet({
      poolId: 5, gameId: 1, predictedScoreA: 1, predictedScoreB: 1,
    });
    expect(result).toMatchObject({ success: true });
  });

  it("palpite com 1ms após o deadline → bloqueado (clock skew)", async () => {
    // deadline = matchDate - 60min; agora = matchDate - 60min + 1ms → fora do prazo
    vi.mocked(getGameById).mockResolvedValue(makeGame(60 * 60 * 1000 - 1) as any); // +60min-1ms
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 2, predictedScoreB: 0 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Prazo para palpites encerrado"),
    });
  });
});

describe("[SUG-2] Deadline customizado por bolão", () => {
  it("deadline = 120min: palpite bloqueado quando jogo começa em 90min", async () => {
    vi.mocked(getPoolScoringRules).mockResolvedValue({ bettingDeadlineMinutes: 120 } as any);
    vi.mocked(getGameById).mockResolvedValue(makeGame(90 * 60 * 1000) as any); // +90min
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 0, predictedScoreB: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deadline = 120min: palpite permitido quando jogo começa em 3h", async () => {
    vi.mocked(getPoolScoringRules).mockResolvedValue({ bettingDeadlineMinutes: 120 } as any);
    vi.mocked(getGameById).mockResolvedValue(makeGame(3 * 60 * 60 * 1000) as any); // +3h
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.bets.placeBet({
      poolId: 5, gameId: 1, predictedScoreA: 3, predictedScoreB: 2,
    });
    expect(result).toMatchObject({ success: true });
  });

  it("deadline = 0min: palpite permitido até o exato momento do início do jogo", async () => {
    vi.mocked(getPoolScoringRules).mockResolvedValue({ bettingDeadlineMinutes: 0 } as any);
    vi.mocked(getGameById).mockResolvedValue(makeGame(1) as any); // +1ms (quase agora)
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.bets.placeBet({
      poolId: 5, gameId: 1, predictedScoreA: 1, predictedScoreB: 0,
    });
    expect(result).toMatchObject({ success: true });
  });

  it("deadline = 0min: palpite bloqueado quando jogo já começou (passado)", async () => {
    vi.mocked(getPoolScoringRules).mockResolvedValue({ bettingDeadlineMinutes: 0 } as any);
    vi.mocked(getGameById).mockResolvedValue(makeGame(-1) as any); // -1ms (passado)
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 0, predictedScoreB: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("[SUG-2] Status do jogo — bloqueio independente do prazo", () => {
  it("jogo com status 'finished' bloqueia palpite mesmo com 2h de antecedência", async () => {
    vi.mocked(getGameById).mockResolvedValue(makeGame(2 * 60 * 60 * 1000, "finished") as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 1, predictedScoreB: 1 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("iniciado ou encerrado"),
    });
  });

  it("jogo com status 'live' bloqueia palpite mesmo com 2h de antecedência", async () => {
    vi.mocked(getGameById).mockResolvedValue(makeGame(2 * 60 * 60 * 1000, "live") as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 0, predictedScoreB: 2 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("iniciado ou encerrado"),
    });
  });
});

describe("[SUG-2] Segurança — usuário bloqueado e jogo de outro torneio", () => {
  it("usuário bloqueado (isBlocked=true) não pode palpitar mesmo dentro do prazo", async () => {
    vi.mocked(getPoolMember).mockResolvedValue(memberBlocked as any);
    vi.mocked(getGameById).mockResolvedValue(makeGame(2 * 60 * 60 * 1000) as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 1, predictedScoreB: 0 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("[S9] jogo de outro torneio é rejeitado com BAD_REQUEST", async () => {
    const gameOutroTorneio = { ...makeGame(2 * 60 * 60 * 1000), tournamentId: 99 }; // torneio diferente
    vi.mocked(getGameById).mockResolvedValue(gameOutroTorneio as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.bets.placeBet({ poolId: 5, gameId: 1, predictedScoreA: 2, predictedScoreB: 2 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("não pertence ao torneio"),
    });
  });
});
