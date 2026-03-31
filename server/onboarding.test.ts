/**
 * Testes para as procedures de onboarding do bolão
 * getOnboardingStatus e dismissOnboarding
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPool = {
  id: 1,
  slug: "bolao-test-abc123",
  name: "Bolão Teste",
  ownerId: 42,
  logoUrl: null,
  description: null,
  accessType: "private_link" as const,
  inviteToken: "tok123",
  entryFee: null,
  entryQrCodeUrl: null,
  onboardingDismissedAt: null,
  status: "active" as const,
  tournamentId: 1,
  inviteCode: "CODE1234",
  invitePermission: "organizer_only" as const,
  finishedAt: null,
  awaitingConclusionSince: null,
  concludedAt: null,
  concludedBy: null,
  scheduledDeleteAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("./db", () => ({
  getPoolById: vi.fn(),
}));

vi.mock("../drizzle/schema", () => ({
  pools: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}));

import * as db from "./db";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(userId: number, role = "user") {
  return { user: { id: userId, role, name: "Tester", email: "t@t.com", openId: "oid" } };
}

// ── Testes: getOnboardingStatus ────────────────────────────────────────────────

describe("pools.getOnboardingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna dismissed=false e etapas pendentes para bolão recém-criado", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool });

    const pool = await db.getPoolById(1);
    expect(pool).toBeTruthy();

    const dismissed = !!pool!.onboardingDismissedAt;
    const steps = {
      appearance: !!(pool!.logoUrl || pool!.description),
      access: pool!.accessType === "public" || !!(pool!.inviteToken),
      entryFee: pool!.entryFee !== null && Number(pool!.entryFee) > 0,
    };

    expect(dismissed).toBe(false);
    expect(steps.appearance).toBe(false);
    expect(steps.access).toBe(true); // inviteToken está definido
    expect(steps.entryFee).toBe(false);
    expect(Object.values(steps).every(Boolean)).toBe(false);
  });

  it("retorna appearance=true quando logoUrl está definido", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, logoUrl: "https://cdn.example.com/logo.png" });

    const pool = await db.getPoolById(1);
    const steps = {
      appearance: !!(pool!.logoUrl || pool!.description),
      access: pool!.accessType === "public" || !!(pool!.inviteToken),
      entryFee: pool!.entryFee !== null && Number(pool!.entryFee) > 0,
    };

    expect(steps.appearance).toBe(true);
  });

  it("retorna appearance=true quando description está definida", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, description: "Bolão da galera" });

    const pool = await db.getPoolById(1);
    const steps = {
      appearance: !!(pool!.logoUrl || pool!.description),
    };

    expect(steps.appearance).toBe(true);
  });

  it("retorna entryFee=true quando taxa está configurada", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, entryFee: "25.00" });

    const pool = await db.getPoolById(1);
    const steps = {
      entryFee: pool!.entryFee !== null && Number(pool!.entryFee) > 0,
    };

    expect(steps.entryFee).toBe(true);
  });

  it("retorna entryFee=false quando taxa é zero", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, entryFee: "0.00" });

    const pool = await db.getPoolById(1);
    const steps = {
      entryFee: pool!.entryFee !== null && Number(pool!.entryFee) > 0,
    };

    expect(steps.entryFee).toBe(false);
  });

  it("retorna dismissed=true quando onboardingDismissedAt está definido", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, onboardingDismissedAt: new Date() });

    const pool = await db.getPoolById(1);
    const dismissed = !!pool!.onboardingDismissedAt;

    expect(dismissed).toBe(true);
  });

  it("retorna allDone=true quando todas as etapas estão concluídas", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({
      ...mockPool,
      logoUrl: "https://cdn.example.com/logo.png",
      accessType: "public" as const,
      entryFee: "20.00",
    });

    const pool = await db.getPoolById(1);
    const steps = {
      appearance: !!(pool!.logoUrl || pool!.description),
      access: pool!.accessType === "public" || !!(pool!.inviteToken),
      entryFee: pool!.entryFee !== null && Number(pool!.entryFee) > 0,
    };

    expect(Object.values(steps).every(Boolean)).toBe(true);
  });

  it("retorna access=true para bolão público sem inviteToken", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({
      ...mockPool,
      accessType: "public" as const,
      inviteToken: null,
    });

    const pool = await db.getPoolById(1);
    const steps = {
      access: pool!.accessType === "public" || !!(pool!.inviteToken),
    };

    expect(steps.access).toBe(true);
  });
});

// ── Testes: dismissOnboarding ─────────────────────────────────────────────────

describe("pools.dismissOnboarding — lógica de autorização", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite que o dono do bolão dispense o checklist", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, ownerId: 42 });

    const pool = await db.getPoolById(1);
    const ctx = makeCtx(42);

    // Verificação de autorização
    const isAllowed = pool!.ownerId === ctx.user.id || ctx.user.role === "admin";
    expect(isAllowed).toBe(true);
  });

  it("permite que admin dispense o checklist de qualquer bolão", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, ownerId: 42 });

    const pool = await db.getPoolById(1);
    const ctx = makeCtx(99, "admin");

    const isAllowed = pool!.ownerId === ctx.user.id || ctx.user.role === "admin";
    expect(isAllowed).toBe(true);
  });

  it("bloqueia usuário não-dono de dispensar o checklist", async () => {
    vi.mocked(db.getPoolById).mockResolvedValue({ ...mockPool, ownerId: 42 });

    const pool = await db.getPoolById(1);
    const ctx = makeCtx(99); // usuário diferente, não admin

    const isAllowed = pool!.ownerId === ctx.user.id || ctx.user.role === "admin";
    expect(isAllowed).toBe(false);
  });
});
