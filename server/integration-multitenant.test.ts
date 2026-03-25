/**
 * [FIX-6] Testes de Integração Multi-Tenant — Banco Real
 *
 * Estes testes usam o banco de dados real para verificar comportamentos
 * que os testes sintéticos (com mocks) não conseguem cobrir:
 *
 * 1. Isolamento real de getMyPools entre dois usuários distintos
 * 2. Transferência de propriedade não pode ser feita para usuário bloqueado
 * 3. Token de convite antigo é invalidado após regeneração
 * 4. Broadcast não enviado para usuários bloqueados (verificação de filtro)
 *
 * Estratégia: criar dados de teste com IDs únicos (prefixo "int-test-"),
 * executar as verificações e limpar ao final para não poluir o banco.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  getDb,
  upsertUser,
  getUserByOpenId,
  createPool,
  addPoolMember,
  getPoolMember,
  getPoolsByUser,
  updateUserBlocked,
  getPoolById,
  getUserNotifications,
} from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { pools, poolMembers, users, tournaments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_PREFIX = "it" + Date.now().toString().slice(-8); // max 10 chars para caber nos campos

function makeCtxFromUser(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Setup e Teardown ─────────────────────────────────────────────────────────

let db: Awaited<ReturnType<typeof getDb>>;
let userA: NonNullable<TrpcContext["user"]>;
let userB: NonNullable<TrpcContext["user"]>;
let poolAId: number;
let poolBId: number;
let tournamentId: number;

beforeAll(async () => {
  db = await getDb();
  if (!db) {
    console.warn("[Integration] DB não disponível — testes de integração serão pulados");
    return;
  }

  // Criar dois usuários de teste
  await upsertUser({
    openId: `${TEST_PREFIX}-userA`,
    name: "Integration User A",
    email: `${TEST_PREFIX}-a@test.com`,
    loginMethod: "manus",
    lastSignedIn: new Date(),
  });
  await upsertUser({
    openId: `${TEST_PREFIX}-userB`,
    name: "Integration User B",
    email: `${TEST_PREFIX}-b@test.com`,
    loginMethod: "manus",
    lastSignedIn: new Date(),
  });

  const rawA = await getUserByOpenId(`${TEST_PREFIX}-userA`);
  const rawB = await getUserByOpenId(`${TEST_PREFIX}-userB`);

  if (!rawA || !rawB) throw new Error("Falha ao criar usuários de teste");

  userA = { ...rawA, role: rawA.role as "user" | "admin" };
  userB = { ...rawB, role: rawB.role as "user" | "admin" };

  // Buscar um torneio existente para criar bolões
  const [firstTournament] = await db.select().from(tournaments).limit(1);
  tournamentId = firstTournament?.id ?? 1;

  // Criar um bolão para userA
  poolAId = await createPool({
    name: `${TEST_PREFIX} Pool A`,
    slug: `${TEST_PREFIX}-pa`,
    inviteToken: `${TEST_PREFIX}tokA`, // max 64 chars
    inviteCode: `${TEST_PREFIX}cA`, // max 16 chars
    ownerId: userA.id,
    tournamentId,
    accessType: "private_link", // enum válido: public | private_link
    status: "active",
    plan: "free",
  });
  await addPoolMember(poolAId, userA.id, "organizer");

  // Criar um bolão para userB
  poolBId = await createPool({
    name: `${TEST_PREFIX} Pool B`,
    slug: `${TEST_PREFIX}-pb`,
    inviteToken: `${TEST_PREFIX}tokB`,
    inviteCode: `${TEST_PREFIX}cB`,
    ownerId: userB.id,
    tournamentId,
    accessType: "private_link",
    status: "active",
    plan: "free",
  });
  await addPoolMember(poolBId, userB.id, "organizer");
});

afterAll(async () => {
  if (!db) return;
  // Limpar dados de teste criados (best-effort)
  try {
    await db.delete(poolMembers).where(eq(poolMembers.poolId, poolAId));
    await db.delete(poolMembers).where(eq(poolMembers.poolId, poolBId));
    await db.delete(pools).where(eq(pools.id, poolAId));
    await db.delete(pools).where(eq(pools.id, poolBId));
    await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-userA`));
    await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-userB`));
    await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-adm`));
  } catch {
    // Limpeza best-effort — não falhar o teste por causa disso
  }
});

// ─── Testes de Integração ─────────────────────────────────────────────────────

describe("[FIX-6] Isolamento real de getMyPools entre usuários distintos", () => {
  it("userA vê apenas o bolão A, não o bolão B", async () => {
    if (!db) return;
    const poolsA = await getPoolsByUser(userA.id);
    const ids = poolsA.map((p) => p.pool.id);
    expect(ids).toContain(poolAId);
    expect(ids).not.toContain(poolBId);
  });

  it("userB vê apenas o bolão B, não o bolão A", async () => {
    if (!db) return;
    const poolsB = await getPoolsByUser(userB.id);
    const ids = poolsB.map((p) => p.pool.id);
    expect(ids).toContain(poolBId);
    expect(ids).not.toContain(poolAId);
  });

  it("userA não é membro do bolão B (isolamento de membership)", async () => {
    if (!db) return;
    const member = await getPoolMember(poolBId, userA.id);
    expect(member).toBeUndefined();
  });

  it("userB não é membro do bolão A (isolamento de membership)", async () => {
    if (!db) return;
    const member = await getPoolMember(poolAId, userB.id);
    expect(member).toBeUndefined();
  });
});

describe("[FIX-6] Transferência de propriedade para usuário bloqueado deve ser rejeitada", () => {
  it("pools.transferOwnership rejeita transferência para usuário bloqueado", async () => {
    if (!db) return;

    // Bloquear userB
    await updateUserBlocked(userB.id, true);

    // Adicionar userB como membro do bolão A para poder tentar a transferência
    await addPoolMember(poolAId, userB.id, "participant");

    const ctxA = makeCtxFromUser(userA);
    const caller = appRouter.createCaller(ctxA);

    await expect(
      caller.pools.transferOwnership({ poolId: poolAId, newOwnerId: userB.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Desbloquear userB após o teste
    await updateUserBlocked(userB.id, false);
  });
});

describe("[FIX-6] Token de convite antigo é invalidado após regeneração", () => {
  it("regenerateAccessCode cria um token diferente do anterior", async () => {
    if (!db) return;

    const poolBefore = await getPoolById(poolAId);
    const oldToken = poolBefore?.inviteToken;

    const ctxA = makeCtxFromUser(userA);
    const caller = appRouter.createCaller(ctxA);

    // Regenerar o token de convite
    const result = await caller.pools.regenerateAccessCode({ poolId: poolAId });

    const poolAfter = await getPoolById(poolAId);
    const newToken = poolAfter?.inviteToken;

    // O novo token deve ser diferente do antigo
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    // O resultado retornado deve conter o novo token
    expect(result.inviteToken).toBe(newToken);
  });

  it("token antigo não localiza mais o bolão após regeneração", async () => {
    if (!db) return;

    const poolBefore = await getPoolById(poolAId);
    const oldToken = poolBefore?.inviteToken;

    const ctxA = makeCtxFromUser(userA);
    const caller = appRouter.createCaller(ctxA);

    // Regenerar novamente
    await caller.pools.regenerateAccessCode({ poolId: poolAId });

    // Tentar entrar com o token antigo deve falhar (token não existe mais no banco)
    await expect(
      caller.pools.joinByToken({ token: oldToken ?? "invalid-token" })
    ).rejects.toBeDefined();
  });
});

describe("[FIX-6] Usuário bloqueado não recebe notificações de broadcast", () => {
  it("broadcast filtra usuários com isBlocked=true", async () => {
    if (!db) return;

    // Bloquear userA
    await updateUserBlocked(userA.id, true);

    // Admin faz broadcast
    // Criar admin no banco para poder fazer broadcast
    await upsertUser({
      openId: `${TEST_PREFIX}-adm`,
      name: "Test Admin",
      email: `${TEST_PREFIX}-adm@test.com`,
      loginMethod: "manus",
      lastSignedIn: new Date(),
    });
    const rawAdmin = await getUserByOpenId(`${TEST_PREFIX}-adm`);
    if (!rawAdmin) throw new Error("Falha ao criar admin de teste");
    // Promover a admin via SQL direto
    await db.execute(`UPDATE users SET role = 'admin' WHERE id = ${rawAdmin.id}`);
    const adminUser: NonNullable<TrpcContext["user"]> = {
      ...rawAdmin,
      role: "admin" as const,
    };

    const adminCtx = makeCtxFromUser(adminUser);
    const caller = appRouter.createCaller(adminCtx);

    // O broadcast deve executar sem erro — a filtragem de bloqueados é interna
    // channels é um objeto, não um array
    const result = await caller.notifications.broadcast({
      title: `[Integration Test] ${TEST_PREFIX}`,
      content: "Teste de broadcast",
      audience: "all",
      channels: { inApp: true, push: false, email: false },
    });

    // O resultado deve ser um objeto com contagens
    expect(result).toHaveProperty("inAppSent");
    expect(result).toHaveProperty("total");

    // Verificar que userA (bloqueado) não recebeu notificação
    // A query de broadcast usa `eq(usersT.isBlocked, false)` — userA deve ser excluído
    const notifs = await getUserNotifications(userA.id, 10);
    const broadcastNotif = notifs.find((n) =>
      n.title?.includes(TEST_PREFIX)
    );
    expect(broadcastNotif).toBeUndefined();

    // Desbloquear userA após o teste
    await updateUserBlocked(userA.id, false);
  });
});
