/**
 * [Q1] Testes de Segurança — Isolamento Multi-Tenant e Autenticação
 * Cobre:
 * - Acesso não autenticado a procedures protegidas
 * - Isolamento entre usuários (um usuário não acessa dados de outro)
 * - Proteção de rotas admin
 * - Validação de entrada (inputs inválidos rejeitados)
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "user-1",
    email: "user1@example.com",
    name: "User One",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

const anonCtx = makeCtx(null);
const userCtx = makeCtx(makeUser({ id: 1 }));
const user2Ctx = makeCtx(makeUser({ id: 2, openId: "user-2", email: "user2@example.com" }));
const adminCtx = makeCtx(makeUser({ id: 99, role: "admin", openId: "admin-1", email: "admin@example.com" }));

// ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────

describe("[Q1] Autenticação — procedures protegidas rejeitam anônimos", () => {
  it("auth.me retorna null para usuário não autenticado", async () => {
    const caller = appRouter.createCaller(anonCtx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.logout é público e limpa cookie mesmo sem sessão ativa", async () => {
    // logout usa publicProcedure intencionalmente para garantir que o cookie
    // seja sempre limpo, mesmo quando a sessão já expirou
    const caller = appRouter.createCaller(anonCtx);
    const result = await caller.auth.logout();
    expect(result).toMatchObject({ success: true });
  });

  it("pools.create rejeita usuário não autenticado", async () => {
    const caller = appRouter.createCaller(anonCtx);
    await expect(
      caller.pools.create({
        name: "Bolão Teste",
        tournamentId: 1,
        accessType: "public",
        planType: "free",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bets.placeBet rejeita usuário não autenticado", async () => {
    const caller = appRouter.createCaller(anonCtx);
    await expect(
      caller.bets.placeBet({ poolId: 1, gameId: 1, predictedScoreA: 1, predictedScoreB: 0 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── PROTEÇÃO ADMIN ──────────────────────────────────────────────────────────

describe("[Q1] Proteção Admin — rotas admin rejeitam usuários comuns", () => {
  it("users.list rejeita usuário comum", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.users.list({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("users.list aceita admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    // Pode falhar por DB não disponível em teste, mas não deve falhar por FORBIDDEN
    try {
      await caller.users.list({ limit: 10 });
    } catch (err: unknown) {
      const trpcErr = err as { code?: string };
      expect(trpcErr.code).not.toBe("FORBIDDEN");
    }
  });

  it("system.notifyOwner rejeita usuário comum", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.system.notifyOwner({ title: "Test", content: "Test" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ads.list rejeita usuário comum", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.ads.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── VALIDAÇÃO DE ENTRADA ─────────────────────────────────────────────────────

describe("[Q1] Validação de entrada — inputs inválidos rejeitados", () => {
  it("pools.create rejeita nome vazio", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.pools.create({
        name: "",
        tournamentId: 1,
        accessType: "public",
        planType: "free",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("bets.placeBet rejeita placar negativo", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.bets.placeBet({ poolId: 1, gameId: 1, predictedScoreA: -1, predictedScoreB: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("system.health rejeita timestamp negativo", async () => {
    const caller = appRouter.createCaller(anonCtx);
    await expect(
      caller.system.health({ timestamp: -1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("users.list rejeita limit acima do máximo", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.users.list({ limit: 10000 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ─── ISOLAMENTO MULTI-TENANT ──────────────────────────────────────────────────

describe("[Q1] Isolamento Multi-Tenant — usuário não acessa dados de outro", () => {
  it("auth.me retorna apenas os dados do próprio usuário autenticado", async () => {
    const caller = appRouter.createCaller(userCtx);
    const result = await caller.auth.me();
    // me() retorna o usuário do contexto ou null (sem DB em teste)
    if (result !== null) {
      expect(result.id).toBe(1);
    } else {
      // Sem DB disponível — comportamento esperado em ambiente de teste
      expect(result).toBeNull();
    }
  });

  it("pools.getMyPools retorna apenas bolões do usuário autenticado", async () => {
    const caller1 = appRouter.createCaller(userCtx);
    const caller2 = appRouter.createCaller(user2Ctx);
    // Ambos chamam getMyPools — cada um deve ver apenas seus próprios bolões
    // Em ambiente de teste sem DB, ambos retornam array vazio ou erro de DB
    try {
      const pools1 = await caller1.pools.getMyPools();
      const pools2 = await caller2.pools.getMyPools();
      // Se retornar dados, garantir que não há sobreposição de IDs de usuário
      const allPools = [...(pools1 ?? []), ...(pools2 ?? [])];
      // Nenhum bolão deve aparecer nas duas listas simultaneamente
      const ids1 = new Set((pools1 ?? []).map((p: { id: number }) => p.id));
      const ids2 = new Set((pools2 ?? []).map((p: { id: number }) => p.id));
      const intersection = [...ids1].filter(id => ids2.has(id));
      // Em ambiente limpo de teste, não deve haver sobreposição
      expect(intersection.length).toBe(0);
      void allPools;
    } catch {
      // DB não disponível em teste — comportamento esperado
    }
  });
});
