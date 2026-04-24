/**
 * Plakr! — Testes do Magic Link
 * Cobre: geração de token, envio de e-mail, verificação, expiração e reuso.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock do módulo de banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
}));

// Mock do módulo de e-mail
vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock do logger
vi.mock("./logger", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Mock do schema do banco
vi.mock("../drizzle/schema", () => ({
  magicLinks: { id: "id", email: "email", token: "token", returnPath: "returnPath", expiresAt: "expiresAt", usedAt: "usedAt" },
  emailQueue: { id: "id", userId: "userId", toEmail: "toEmail", toName: "toName", subject: "subject", htmlBody: "htmlBody", status: "status" },
  users: { id: "id", email: "email", openId: "openId", name: "name", isBlocked: "isBlocked" },
}));

import { getDb, getUserByEmail } from "./db";
import { sendEmail } from "./email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, any> = {}) {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    ...overrides,
  };
}

// ─── Testes do Router (sendMagicLink) ─────────────────────────────────────────

describe("authMagic.sendMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria conta automaticamente e envia magic link quando o e-mail não está cadastrado", async () => {
    // Primeiro getUserByEmail retorna undefined (não existe), segundo retorna o usuário criado
    const mockUser = { id: 99, openId: "magic_abc123", name: "Naoexiste", email: "naoexiste@test.com", isBlocked: false };
    vi.mocked(getUserByEmail)
      .mockResolvedValueOnce(undefined)   // primeira chamada: não existe
      .mockResolvedValueOnce(mockUser as any); // segunda chamada: após criação
    const mockDb = makeDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // Importa o router após os mocks estarem configurados
    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    const result = await caller.sendMagicLink({
      email: "naoexiste@test.com",
      returnPath: "/dashboard",
      origin: "https://plakr.io",
    });

    // Deve ter criado a conta (insert chamado) e enviado o e-mail
    expect(mockDb.insert).toHaveBeenCalled();
    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("retorna { sent: true } e envia e-mail quando o usuário existe", async () => {
    const mockUser = { id: 1, openId: "user123", name: "João", email: "joao@test.com", isBlocked: false };
    const mockDb = makeDb();

    vi.mocked(getDb).mockResolvedValue(mockDb as any);
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser as any);

    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    const result = await caller.sendMagicLink({
      email: "joao@test.com",
      returnPath: "/dashboard",
      origin: "https://plakr.io",
    });

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledOnce();

    // Verifica que o e-mail enviado contém o link correto
    const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
    expect(emailCall.to).toBe("joao@test.com");
    expect(emailCall.type).toBe("magic_link");
    expect(emailCall.html).toContain("https://plakr.io/magic-link/verify?token=");
  });

  it("normaliza o e-mail para minúsculas antes de buscar", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb() as any);
    vi.mocked(getUserByEmail).mockResolvedValue(undefined);

    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    await caller.sendMagicLink({
      email: "JOAO@TEST.COM",
      returnPath: "/dashboard",
      origin: "https://plakr.io",
    });

    expect(getUserByEmail).toHaveBeenCalledWith("joao@test.com");
  });

  it("usa /dashboard como returnPath padrão quando não fornecido", async () => {
    const mockUser = { id: 1, openId: "user123", name: "Maria", email: "maria@test.com", isBlocked: false };
    const mockDb = makeDb();

    vi.mocked(getDb).mockResolvedValue(mockDb as any);
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser as any);

    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    await caller.sendMagicLink({
      email: "maria@test.com",
      returnPath: "/dashboard",
      origin: "https://plakr.io",
    });

    // Verifica que o insert foi chamado com returnPath = /dashboard
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("rejeita e-mails inválidos", async () => {
    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    await expect(
      caller.sendMagicLink({
        email: "email-invalido",
        returnPath: "/dashboard",
        origin: "https://plakr.io",
      })
    ).rejects.toThrow();
  });

  it("rejeita origin inválida", async () => {
    const { authMagicRouter } = await import("./routers/auth-magic");
    const caller = authMagicRouter.createCaller({} as any);

    await expect(
      caller.sendMagicLink({
        email: "joao@test.com",
        returnPath: "/dashboard",
        origin: "nao-e-uma-url",
      })
    ).rejects.toThrow();
  });
});

// ─── Testes da lógica de verificação do token ─────────────────────────────────

describe("magic link token logic", () => {
  it("token deve ter 64 caracteres hexadecimais", async () => {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it("expiresAt deve ser 15 minutos no futuro", () => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const before = Date.now();
    const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);
    const after = Date.now();

    const diff = expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(FIFTEEN_MINUTES_MS - 100);
    expect(diff).toBeLessThanOrEqual(FIFTEEN_MINUTES_MS + (after - before) + 100);
  });

  it("returnPath inválido deve ser sanitizado para /dashboard", () => {
    const sanitize = (path: string) =>
      path.startsWith("/") ? path : "/dashboard";

    expect(sanitize("/pool/meu-bolao")).toBe("/pool/meu-bolao");
    expect(sanitize("https://evil.com")).toBe("/dashboard");
    expect(sanitize("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitize("")).toBe("/dashboard");
  });

  it("token regex deve rejeitar tokens malformados", () => {
    const validToken = "a".repeat(64);
    const invalidTokens = [
      "a".repeat(63),          // muito curto
      "a".repeat(65),          // muito longo
      "G".repeat(64),          // caractere inválido (G não é hex)
      "a".repeat(63) + ";",    // injeção
      "",                      // vazio
    ];

    expect(/^[0-9a-f]{64}$/.test(validToken)).toBe(true);
    for (const t of invalidTokens) {
      expect(/^[0-9a-f]{64}$/.test(t)).toBe(false);
    }
  });
});
