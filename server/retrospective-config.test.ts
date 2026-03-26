/**
 * Testes para as procedures de configuração de retrospectivas:
 * - pools.getRetrospectiveConfig
 * - pools.updateRetrospectiveConfig
 * - pools.uploadRetrospectiveTemplate
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-openid",
    email: "admin@apostai.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-openid",
    email: "user@apostai.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Mock do DB ───────────────────────────────────────────────────────────────

vi.mock("../drizzle/schema", async () => {
  const actual = await vi.importActual("../drizzle/schema");
  return actual;
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// ─── Testes: getRetrospectiveConfig ──────────────────────────────────────────

describe("pools.getRetrospectiveConfig", () => {
  it("deve ser acessível por usuário admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Com DB mockado como null, espera erro interno — mas não UNAUTHORIZED
    try {
      await caller.pools.getRetrospectiveConfig();
    } catch (err: any) {
      expect(err.code).not.toBe("UNAUTHORIZED");
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });

  it("deve rejeitar usuário não autenticado com FORBIDDEN", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.pools.getRetrospectiveConfig()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deve rejeitar usuário comum (não admin) com FORBIDDEN", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.pools.getRetrospectiveConfig()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ─── Testes: updateRetrospectiveConfig ───────────────────────────────────────

describe("pools.updateRetrospectiveConfig", () => {
  it("deve rejeitar usuário não autenticado com FORBIDDEN", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.updateRetrospectiveConfig({ closingCtaText: "Teste" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deve rejeitar usuário comum (não admin) com FORBIDDEN", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.updateRetrospectiveConfig({ closingCtaText: "Teste" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deve aceitar input válido sem lançar erro de validação", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.pools.updateRetrospectiveConfig({
        closingCtaText: "Crie seu bolão →",
        closingCtaUrl: "https://apostai.com",
        autoCloseDays: 3,
      });
    } catch (err: any) {
      // Erros de DB são esperados (DB mockado), mas não de validação
      expect(err.code).not.toBe("BAD_REQUEST");
      expect(err.code).not.toBe("UNAUTHORIZED");
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });

  it("deve rejeitar autoCloseDays fora do intervalo 1-30", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.updateRetrospectiveConfig({ autoCloseDays: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.pools.updateRetrospectiveConfig({ autoCloseDays: 31 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deve rejeitar closingCtaText com mais de 128 caracteres", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const longText = "a".repeat(129);
    await expect(
      caller.pools.updateRetrospectiveConfig({ closingCtaText: longText })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ─── Testes: uploadRetrospectiveTemplate ─────────────────────────────────────

describe("pools.uploadRetrospectiveTemplate", () => {
  const validBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("deve rejeitar usuário não autenticado com FORBIDDEN", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.uploadRetrospectiveTemplate({
        slot: "slide1",
        fileBase64: validBase64,
        mimeType: "image/png",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deve rejeitar usuário comum (não admin) com FORBIDDEN", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.uploadRetrospectiveTemplate({
        slot: "slide1",
        fileBase64: validBase64,
        mimeType: "image/png",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deve rejeitar slot inválido com BAD_REQUEST", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.uploadRetrospectiveTemplate({
        slot: "slideInvalido" as any,
        fileBase64: validBase64,
        mimeType: "image/png",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deve rejeitar mimeType inválido com BAD_REQUEST", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pools.uploadRetrospectiveTemplate({
        slot: "slide1",
        fileBase64: validBase64,
        mimeType: "image/gif" as any,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deve aceitar todos os slots válidos sem erro de validação", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const validSlots = ["slide1", "slide2", "slide3", "slide4", "slide5", "cardPodium", "cardParticipant"] as const;
    for (const slot of validSlots) {
      try {
        await caller.pools.uploadRetrospectiveTemplate({
          slot,
          fileBase64: validBase64,
          mimeType: "image/png",
        });
      } catch (err: any) {
        // Erros de S3/DB são esperados, mas não de validação
        expect(err.code).not.toBe("BAD_REQUEST");
        expect(err.code).not.toBe("UNAUTHORIZED");
        expect(err.code).not.toBe("FORBIDDEN");
      }
    }
  });
});
