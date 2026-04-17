/**
 * Testes: Criação de bolão com regras de pontuação customizadas e entry fee (Pro)
 * Cobre:
 * - Usuário Pro pode criar bolão com regras customizadas → upsertPoolScoringRules com dados
 * - Usuário free cria bolão com regras padrão → upsertPoolScoringRules com objeto vazio
 * - Admin pode criar bolão com regras customizadas (bypass de plano)
 * - Usuário Pro pode criar bolão com entryFee → createPool com entryFee como string
 * - Usuário free não pode criar bolão com entryFee → entryFee ignorado
 * - entryFee=0 não deve ser salvo mesmo para Pro
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── MOCKS ────────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    countActivePoolsByOwner: vi.fn(),
    getUserPlan: vi.fn(),
    getUserPlanTier: vi.fn(),
    canCreatePool: vi.fn(),
    canAddMember: vi.fn(),
    getPlatformSettings: vi.fn(),
    getPoolById: vi.fn(),
    getPoolByInviteToken: vi.fn(),
    getPoolBySlug: vi.fn(),
    getPoolMember: vi.fn(),
    countPoolMembers: vi.fn(),
    createPool: vi.fn().mockResolvedValue(999),
    addPoolMember: vi.fn().mockResolvedValue(undefined),
    upsertPoolScoringRules: vi.fn().mockResolvedValue(undefined),
    createNotification: vi.fn().mockResolvedValue(undefined),
    createAdminLog: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  getUserPlanTier,
  canCreatePool,
  getPlatformSettings,
  createPool,
  upsertPoolScoringRules,
} from "./db";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "user-pro-test",
    name: "Pro Test User",
    email: "protest@example.com",
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

const defaultSettings = {
  id: 1,
  freeMaxPools: 2,
  freeMaxParticipants: 50,
  defaultExactScorePoints: 10,
  defaultCorrectResultPoints: 5,
  defaultTotalGoalsPoints: 3,
  defaultGoalDiffPoints: 3,
  defaultOneTeamGoalsPoints: 2,
  defaultLandslidePoints: 5,
  defaultLandslideMinDiff: 4,
  defaultZebraPoints: 8,
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPlatformSettings).mockResolvedValue(defaultSettings as any);
  vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });
  vi.mocked(getUserPlanTier).mockResolvedValue("free");
  vi.mocked(createPool).mockResolvedValue(999);
});

// ─── TESTES: REGRAS DE PONTUAÇÃO NA CRIAÇÃO ──────────────────────────────────
describe("[CREATE-PRO] Regras de pontuação na criação do bolão", () => {
  it("usuário Pro pode criar bolão com regras customizadas → upsertPoolScoringRules com dados", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("pro");
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    const result = await caller.pools.create({
      name: "Bolão Pro Regras",
      tournamentId: 1,
      accessType: "public",
      exactScorePoints: 15,
      correctResultPoints: 7,
      totalGoalsPoints: 4,
      goalDiffPoints: 4,
      oneTeamGoalsPoints: 3,
      landslidePoints: 8,
      zebraPoints: 2,
    });
    expect(result).toHaveProperty("poolId");
    // upsertPoolScoringRules deve ter sido chamado com os dados customizados
    expect(vi.mocked(upsertPoolScoringRules)).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        exactScorePoints: 15,
        correctResultPoints: 7,
        totalGoalsPoints: 4,
      }),
      5
    );
  });

  it("usuário free cria bolão com regras padrão → upsertPoolScoringRules com objeto vazio (sem customizações)", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("free");
    const caller = appRouter.createCaller(makeCtx({ id: 6 }));
    const result = await caller.pools.create({
      name: "Bolão Free Padrão",
      tournamentId: 1,
      accessType: "public",
      // Mesmo que o frontend envie regras customizadas, o servidor deve ignorar para free
      exactScorePoints: 20,
    });
    expect(result).toHaveProperty("poolId");
    // Para usuário free, upsertPoolScoringRules deve ser chamado com objeto vazio
    const calls = vi.mocked(upsertPoolScoringRules).mock.calls;
    const lastCall = calls[calls.length - 1];
    // O segundo argumento (data) não deve ter exactScorePoints customizado
    expect(lastCall[1]).not.toHaveProperty("exactScorePoints");
  });

  it("admin pode criar bolão com regras customizadas → bypass de plano (role=admin)", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("free"); // admin pode ter tier free no banco
    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "admin" }));
    const result = await caller.pools.create({
      name: "Bolão Admin Regras",
      tournamentId: 1,
      accessType: "public",
      exactScorePoints: 20,
      correctResultPoints: 10,
    });
    expect(result).toHaveProperty("poolId");
    // Admin tem bypass: isProUser = true por role === "admin"
    const calls = vi.mocked(upsertPoolScoringRules).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toHaveProperty("exactScorePoints", 20);
  });

  it("usuário unlimited pode criar bolão com regras customizadas", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("unlimited");
    const caller = appRouter.createCaller(makeCtx({ id: 10 }));
    const result = await caller.pools.create({
      name: "Bolão Unlimited Regras",
      tournamentId: 1,
      accessType: "public",
      exactScorePoints: 12,
      bettingDeadlineMinutes: 30,
    });
    expect(result).toHaveProperty("poolId");
    const calls = vi.mocked(upsertPoolScoringRules).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toHaveProperty("exactScorePoints", 12);
    expect(lastCall[1]).toHaveProperty("bettingDeadlineMinutes", 30);
  });
});

// ─── TESTES: ENTRY FEE NA CRIAÇÃO ────────────────────────────────────────────
describe("[CREATE-PRO] Inscrição paga na criação do bolão", () => {
  it("usuário Pro pode criar bolão com entryFee → createPool com entryFee como string", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("pro");
    vi.mocked(createPool).mockResolvedValue(888);
    const caller = appRouter.createCaller(makeCtx({ id: 7 }));
    const result = await caller.pools.create({
      name: "Bolão Pago",
      tournamentId: 1,
      accessType: "private_link",
      entryFee: 25.0,
      pixKey: "chave@pix.com",
    });
    expect(result).toHaveProperty("poolId");
    // createPool deve ter sido chamado com entryFee como string
    expect(vi.mocked(createPool)).toHaveBeenCalledWith(
      expect.objectContaining({
        entryFee: "25",
        pixKey: "chave@pix.com",
      })
    );
  });

  it("usuário free não pode criar bolão com entryFee → entryFee ignorado no createPool", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("free");
    vi.mocked(createPool).mockResolvedValue(889);
    const caller = appRouter.createCaller(makeCtx({ id: 8 }));
    const result = await caller.pools.create({
      name: "Bolão Free Pago",
      tournamentId: 1,
      accessType: "private_link",
      entryFee: 30.0,
      pixKey: "chave@pix.com",
    });
    expect(result).toHaveProperty("poolId");
    // createPool NÃO deve ter sido chamado com entryFee para usuário free
    expect(vi.mocked(createPool)).toHaveBeenCalledWith(
      expect.not.objectContaining({
        entryFee: expect.anything(),
      })
    );
  });

  it("entryFee=0 não deve ser salvo mesmo para Pro", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("pro");
    vi.mocked(createPool).mockResolvedValue(890);
    const caller = appRouter.createCaller(makeCtx({ id: 9 }));
    const result = await caller.pools.create({
      name: "Bolão Gratuito Pro",
      tournamentId: 1,
      accessType: "public",
      entryFee: 0,
    });
    expect(result).toHaveProperty("poolId");
    // entryFee=0 não deve ser salvo
    expect(vi.mocked(createPool)).toHaveBeenCalledWith(
      expect.not.objectContaining({
        entryFee: expect.anything(),
      })
    );
  });

  it("admin pode criar bolão com entryFee → bypass de plano", async () => {
    vi.mocked(getUserPlanTier).mockResolvedValue("free"); // admin pode ter tier free
    vi.mocked(createPool).mockResolvedValue(891);
    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "admin" }));
    const result = await caller.pools.create({
      name: "Bolão Admin Pago",
      tournamentId: 1,
      accessType: "private_link",
      entryFee: 50.0,
      pixKey: "admin@pix.com",
    });
    expect(result).toHaveProperty("poolId");
    // Admin tem bypass: entryFee deve ser salvo
    expect(vi.mocked(createPool)).toHaveBeenCalledWith(
      expect.objectContaining({
        entryFee: "50",
        pixKey: "admin@pix.com",
      })
    );
  });
});
