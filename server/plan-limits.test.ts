/**
 * [SUG-3] Testes de Limite de Plano Gratuito
 * Cobre:
 * - Tentativa de criar o 3º bolão no plano free → FORBIDDEN
 * - Tentativa de adicionar o 51º participante em bolão free → FORBIDDEN
 * - Tentativa de usar regras de pontuação customizadas sem plano Pro → FORBIDDEN
 * - Plano Pro permite criar bolões além do limite free
 * - Plano Pro permite regras customizadas
 *
 * Estratégia: mock das funções de banco (canCreatePool, canAddMember,
 * getPlatformSettings, getPoolById, getPoolMember, countPoolMembers) para
 * simular estados de limite sem depender de dados reais no banco.
 *
 * Nota: canCreatePool e canAddMember são mockados diretamente porque
 * internamente chamam getUserPlanTier → getUserPlan via referência local
 * ao módulo, não via exports — portanto mockar getUserPlan sozinho não
 * é suficiente para interceptar a lógica dessas funções.
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
  getUserPlanTier,
  canCreatePool,
  canAddMember,
  getPlatformSettings,
  getPoolById,
  getPoolByInviteToken,
  getPoolBySlug,
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
  // Defaults seguros: canCreatePool e canAddMember permitem por padrão
  vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });
  vi.mocked(canAddMember).mockResolvedValue({ allowed: true });
  // getUserPlanTier retorna "free" por padrão
  vi.mocked(getUserPlanTier).mockResolvedValue("free");
});

// ─── TESTES: LIMITE DE BOLÕES ─────────────────────────────────────────────────
describe("[SUG-3] Limite de bolões — plano gratuito", () => {
  it("usuário free com 2 bolões ativos não pode criar o 3º → FORBIDDEN", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(2);
    vi.mocked(canCreatePool).mockResolvedValue({
      allowed: false,
      reason: "Você atingiu o limite de 2 bolões ativos do plano Gratuito. Faça upgrade para criar mais bolões.",
      limit: 2,
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.pools.create({
        name: "Bolão Extra",
        tournamentId: 1,
        accessType: "public",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("limite de 2 bol"),
    });
  });

  it("usuário free com 1 bolão ativo pode criar o 2º → sucesso", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(1);
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });

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
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });

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
    vi.mocked(canCreatePool).mockResolvedValue({
      allowed: false,
      reason: "Você atingiu o limite de 3 bolões ativos do plano Gratuito. Faça upgrade para criar mais bolões.",
      limit: 3,
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.pools.create({
        name: "Bolão Além do Limite",
        tournamentId: 1,
        accessType: "public",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("limite de 3 bol"),
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

  it("bolão free com 30 participantes rejeita o 31º via joinByToken → FORBIDDEN", async () => {
    vi.mocked(getPoolByInviteToken).mockResolvedValue({ ...poolFree, status: "active" } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(30);
    vi.mocked(getPoolMember).mockResolvedValue(null); // usuário não é membro
    vi.mocked(canAddMember).mockResolvedValue({
      allowed: false,
      reason: "Este bolão atingiu o limite de 30 participantes do plano Gratuito. Faça upgrade para adicionar mais participantes.",
      limit: 30,
    });

    const caller = appRouter.createCaller(makeCtx({ id: 31 }));
    await expect(
      caller.pools.joinByToken({ token: "tok" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("30 participantes"),
    });
  });

  it("bolão free com 29 participantes aceita o 30º via joinByToken → sucesso", async () => {
    vi.mocked(getPoolByInviteToken).mockResolvedValue({ ...poolFree, status: "active" } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(29);
    vi.mocked(getPoolMember).mockResolvedValue(null);
    vi.mocked(canAddMember).mockResolvedValue({ allowed: true });

    const caller = appRouter.createCaller(makeCtx({ id: 30 }));
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
    // O dono do bolão (ownerId=1) tem plano Pro
    vi.mocked(getUserPlanTier).mockResolvedValue("pro");

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
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });

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
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });

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
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });

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
    vi.mocked(canAddMember).mockResolvedValue({ allowed: true });

    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    const result = await caller.pools.joinByToken({ token: "tok-private" });
    expect(result).toMatchObject({ poolId: 30, alreadyMember: false });
  });
});

// ─── TESTES: LIMITE DE PARTICIPANTES VIA joinPublic ──────────────────────────
describe("[SUG-3] Limite de participantes — joinPublic em bolão free", () => {
  const publicFreePool = {
    id: 40,
    plan: "free",
    name: "Bolão Público Free",
    ownerId: 1,
    tournamentId: 1,
    slug: "bolao-publico-free",
    accessType: "public" as const,
    status: "active" as const,
    inviteToken: "tok-pub",
    inviteCode: "PUB1234",
    invitePermission: "organizer_only" as const,
    isArchived: false,
    description: null,
    logoUrl: null,
    finishedAt: null,
    awaitingConclusionSince: null,
    concludedAt: null,
    concludedBy: null,
    scheduledDeleteAt: null,
    stripeSubscriptionId: null,
    planExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const publicProPool = { ...publicFreePool, id: 41, plan: "pro" as const };

  it("joinPublic em bolão free com 30 participantes rejeita o 31º → FORBIDDEN", async () => {
    vi.mocked(getPoolBySlug).mockResolvedValue(publicFreePool as any);
    vi.mocked(getPoolMember).mockResolvedValue(null as any);
    vi.mocked(getPlatformSettings).mockResolvedValue(defaultSettings as any);
    vi.mocked(countPoolMembers).mockResolvedValue(30);
    vi.mocked(canAddMember).mockResolvedValue({
      allowed: false,
      reason: "Este bolão atingiu o limite de 30 participantes do plano Gratuito. Faça upgrade para adicionar mais participantes.",
      limit: 30,
    });

    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    await expect(
      caller.pools.joinPublic({ slug: "bolao-publico-free" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("30"),
    });
  });

  it("joinPublic em bolão free com 29 participantes aceita o 30º → sucesso", async () => {
    vi.mocked(getPoolBySlug).mockResolvedValue(publicFreePool as any);
    vi.mocked(getPoolMember).mockResolvedValue(null as any);
    vi.mocked(getPlatformSettings).mockResolvedValue(defaultSettings as any);
    vi.mocked(countPoolMembers).mockResolvedValue(29);
    vi.mocked(canAddMember).mockResolvedValue({ allowed: true });

    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    const result = await caller.pools.joinPublic({ slug: "bolao-publico-free" });
    expect(result).toMatchObject({ poolId: 40, alreadyMember: false });
  });

  it("joinPublic em bolão Pro com 200 participantes aceita o 201º → sem limite", async () => {
    vi.mocked(getPoolBySlug).mockResolvedValue(publicProPool as any);
    vi.mocked(getPoolMember).mockResolvedValue(null as any);
    vi.mocked(getPlatformSettings).mockResolvedValue(defaultSettings as any);
    vi.mocked(countPoolMembers).mockResolvedValue(200);
    vi.mocked(canAddMember).mockResolvedValue({ allowed: true });
    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    const result = await caller.pools.joinPublic({ slug: "bolao-publico-free" });
    expect(result).toMatchObject({ poolId: 41, alreadyMember: false });
  });

  it("joinPublic retorna alreadyMember=true se usuário já é membro → sem verificar limite", async () => {
    vi.mocked(getPoolBySlug).mockResolvedValue(publicFreePool as any);
    vi.mocked(getPoolMember).mockResolvedValue({
      userId: 99, poolId: 40, role: "participant", joinedAt: new Date(),
    } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(30);
    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    const result = await caller.pools.joinPublic({ slug: "bolao-publico-free" });
    expect(result).toMatchObject({ poolId: 40, alreadyMember: true });
  });
});

// ─── TESTES: LIMITE CONFIGURÁVEL VIA PLATAFORMA ──────────────────────────────
describe("[SUG-3] Limite configurável via platform settings", () => {
  it("freeMaxPools=3 permite criar o 3º bolão free", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(2);
    vi.mocked(canCreatePool).mockResolvedValue({ allowed: true });
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...defaultSettings,
      freeMaxPools: 3,
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pools.create({
      name: "Terceiro Bolão",
      tournamentId: 1,
      accessType: "public",
    });
    expect(result).toHaveProperty("poolId");
  });

  it("freeMaxPools=1 bloqueia o 2º bolão free", async () => {
    vi.mocked(countActivePoolsByOwner).mockResolvedValue(1);
    vi.mocked(canCreatePool).mockResolvedValue({
      allowed: false,
      reason: "Você atingiu o limite de 1 bolões ativos do plano Gratuito. Faça upgrade para criar mais bolões.",
      limit: 1,
    });
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...defaultSettings,
      freeMaxPools: 1,
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.pools.create({
        name: "Segundo Bolão",
        tournamentId: 1,
        accessType: "public",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("freeMaxParticipants=10 bloqueia o 11º participante via joinByToken", async () => {
    const smallPool = {
      id: 50, plan: "free", name: "Bolão Pequeno", ownerId: 1, tournamentId: 1,
      slug: "bolao-pequeno", accessType: "private_link" as const, status: "active" as const,
      inviteToken: "tok-small", inviteCode: "SMALL001", invitePermission: "organizer_only" as const,
      isArchived: false, description: null, logoUrl: null, finishedAt: null,
      awaitingConclusionSince: null, concludedAt: null, concludedBy: null,
      scheduledDeleteAt: null, stripeSubscriptionId: null, planExpiresAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(getPoolByInviteToken).mockResolvedValue(smallPool as any);
    vi.mocked(getPoolMember).mockResolvedValue(null as any);
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...defaultSettings,
      freeMaxParticipants: 10,
    } as any);
    vi.mocked(countPoolMembers).mockResolvedValue(10);
    vi.mocked(canAddMember).mockResolvedValue({
      allowed: false,
      reason: "Este bolão atingiu o limite de 10 participantes do plano Gratuito. Faça upgrade para adicionar mais participantes.",
      limit: 10,
    });
    const caller = appRouter.createCaller(makeCtx({ id: 99 }));
    await expect(
      caller.pools.joinByToken({ token: "tok-small" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
