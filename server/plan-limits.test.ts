/**
 * [SUG-3] Testes de Limite de Plano Gratuito
 * Cobre:
 * - Tentativa de criar o 3º bolão no plano free → FORBIDDEN
 * - Tentativa de adicionar o 51º participante em bolão free → FORBIDDEN
 * - Tentativa de usar regras de pontuação customizadas sem plano Pro → FORBIDDEN
 * - Plano Pro permite criar bolões além do limite free
 * - Plano Pro permite regras customizadas
 *
 * Estratégia: mock das funções de banco (countActivePoolsByOwner, getUserPlan,
 * getPlatformSettings, getPoolById, getPoolMember, getPoolMemberCount) para
 * simular estados de limite sem depender de dados reais no banco.
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
    getPlatformSettings: vi.fn(),
    getPoolById: vi.fn(),
    getPoolByInviteToken: vi.fn(),
    getPoolMember: vi.fn(),
    getPoolMemberCount: vi.fn(),
    countPoolMembers: vi.fn(),
    createPool: vi.fn().mockResolvedValue(999),
    addPoolMember: vi.fn().mockResolvedValue(undefined),
    upsertPoolScoringRules: vi.fn().mockResolvedValue(undefined),
    createNotification: vi.fn().mockResolvedValue(undefined),
    createAdminLog: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  countActivePoolsByOwner,
  getUserPlan,
  getPlatformSettings,
  getPoolById,
  getPoolByInviteToken,
  getPoolMember,
  countPoolMembers,
} from "./db";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "user-plan-test",
    name: "Plan Test User",
    email: "plantest@example.com",
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
});

// ─── TESTES: LIMITE DE BOLÕES ─────────────────────────────────────────────────
describe("[SUG-3] Limite de bolões — plano gratuito", () => {
  it("usuário free com 2 bolões ativos não pode criar o 3º → FORBIDDEN", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(2);
    vi.mocked(getUserPlan).mockResolvedValue(null); // sem plano pro

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.pools.create({
        name: "Bolão Extra",
        tournamentId: 1,
        accessType: "public",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Limite de 2 bolões"),
    });
  });

  it("usuário free com 1 bolão ativo pode criar o 2º → sucesso", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(1);
    vi.mocked(getUserPlan).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Segundo Bolão",
      tournamentId: 1,
      accessType: "public",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("usuário Pro com 5 bolões ativos pode criar mais → sucesso", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(5);
    vi.mocked(getUserPlan).mockResolvedValue({
      id: 1,
      userId: 1,
      plan: "pro",
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeSubscriptionId: "sub_test",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Bolão Pro Ilimitado",
      tournamentId: 1,
      accessType: "public",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("limite de bolões usa freeMaxPools das configurações da plataforma", async () => {
    // Configuração customizada: limite de 3 bolões
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...defaultSettings,
      freeMaxPools: 3,
    } as any);
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(3);
    vi.mocked(getUserPlan).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.pools.create({
        name: "Bolão Além do Limite",
        tournamentId: 1,
        accessType: "public",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Limite de 3 bolões"),
    });
  });
});

// ─── TESTES: LIMITE DE PARTICIPANTES ─────────────────────────────────────────
describe("[SUG-3] Limite de participantes — plano gratuito", () => {
  const poolFree = {
    id: 10,
    plan: "free",
    name: "Bolão Free",
    ownerId: 2,
    tournamentId: 1,
    slug: "bolao-free",
    accessType: "public" as const,
    inviteToken: "tok",
    inviteCode: "CODE1234",
    isArchived: false,
    description: null,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("bolão free com 50 participantes rejeita o 51º via joinByToken → FORBIDDEN", async () => {
    vi.mocked(getPoolByInviteToken).mockResolvedValue({ ...poolFree, status: "active" } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(50);
    vi.mocked(getPoolMember).mockResolvedValue(null); // usuário não é membro

    const caller = appRouter.createCaller(makeCtx({ id: 51 }));
    await expect(
      caller.pools.joinByToken({ token: "tok" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("50 participantes"),
    });
  });

  it("bolão free com 49 participantes aceita o 50º via joinByToken → sucesso", async () => {
    vi.mocked(getPoolByInviteToken).mockResolvedValue({ ...poolFree, status: "active" } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(49);
    vi.mocked(getPoolMember).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx({ id: 50 }));
    const result = await caller.pools.joinByToken({ token: "tok" });
    expect(result).toMatchObject({ poolId: 10, alreadyMember: false });
  });
});

// ─── TESTES: REGRAS CUSTOMIZADAS SEM PRO ─────────────────────────────────────
describe("[SUG-3] Regras de pontuação customizadas — requer plano Pro", () => {
  const poolFree = {
    id: 20,
    plan: "free",
    name: "Bolão Free Regras",
    ownerId: 1,
    tournamentId: 1,
    slug: "bolao-free-regras",
    accessType: "public" as const,
    inviteToken: "tok2",
    inviteCode: "CODE5678",
    isArchived: false,
    description: null,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const poolPro = { ...poolFree, id: 21, plan: "pro" };

  it("bolão free rejeita updateScoringRules → FORBIDDEN", async () => {
    vi.mocked(getPoolById).mockResolvedValue(poolFree as any);
    vi.mocked(getPoolMember).mockResolvedValue({
      userId: 1,
      poolId: 20,
      role: "organizer",
      joinedAt: new Date(),
      stats: null,
    } as any);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(
      caller.pools.updateScoringRules({
        poolId: 20,
        exactScorePoints: 15,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Plano Pro"),
    });
  });

  it("bolão Pro permite updateScoringRules → sucesso", async () => {
    vi.mocked(getPoolById).mockResolvedValue(poolPro as any);
    vi.mocked(getPoolMember).mockResolvedValue({
      userId: 1,
      poolId: 21,
      role: "organizer",
      joinedAt: new Date(),
      stats: null,
    } as any);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.pools.updateScoringRules({
      poolId: 21,
      exactScorePoints: 15,
    });
    expect(result).toMatchObject({ success: true });
  });

  it("admin pode usar updateScoringRules mesmo em bolão free — bypass implementado", async () => {
    vi.mocked(getPoolById).mockResolvedValue(poolFree as any);
    // Admin não precisa ser membro do bolão (getPoolMember retorna null)
    vi.mocked(getPoolMember).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "admin" }));
    // [SUG-3] Admin tem bypass: pode editar regras de qualquer bolão independente do plano
    const result = await caller.pools.updateScoringRules({
      poolId: 20,
      exactScorePoints: 15,
    });
    expect(result).toMatchObject({ success: true });
  });
});

// ─── TESTES: PERMISSÃO DE CONVITE ─────────────────────────────────────────────
describe("[INVITE-PERM] Permissão de convite em bolões privados", () => {
  const basePool = {
    id: 30,
    plan: "free",
    name: "Bolão Privado",
    ownerId: 2,
    tournamentId: 1,
    slug: "bolao-privado",
    accessType: "private_link" as const,
    inviteToken: "tok-private",
    inviteCode: "PRIV1234",
    isArchived: false,
    description: null,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("pools.create aceita invitePermission=organizer_only e retorna poolId", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(0);
    vi.mocked(getUserPlan).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Bolão Só Org",
      tournamentId: 1,
      accessType: "private_link",
      invitePermission: "organizer_only",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("pools.create aceita invitePermission=all_members e retorna poolId", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(0);
    vi.mocked(getUserPlan).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Bolão Todos Convidam",
      tournamentId: 1,
      accessType: "private_link",
      invitePermission: "all_members",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("pools.create sem invitePermission usa default organizer_only (backward compat)", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(0);
    vi.mocked(getUserPlan).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Bolão Default",
      tournamentId: 1,
      accessType: "private_link",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("joinByToken funciona independente de invitePermission (a restrição é de visibilidade, não de entrada)", async () => {
    vi.mocked(getPoolByInviteToken).mockResolvedValue({
      ...basePool,
      status: "active",
      invitePermission: "organizer_only",
    } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(5);
    vi.mocked(getPoolMember).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    const result = await caller.pools.joinByToken({ token: "tok-private" });
    expect(result).toMatchObject({ poolId: 30, alreadyMember: false });
  });
});
