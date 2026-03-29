/**
 * API Key Authentication Middleware — Plakr Public API v1
 *
 * Fluxo:
 * 1. Extrai o header X-API-Key da requisição
 * 2. Calcula SHA-256 da chave recebida
 * 3. Busca no banco pelo hash (nunca armazenamos a chave em texto claro)
 * 4. Valida: isActive, expiresAt, escopo necessário
 * 5. Atualiza lastUsedAt
 * 6. Injeta ctx.apiKey no request
 */
import { createHash, randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { apiKeys } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ApiKeyContext = {
  id: number;
  name: string;
  scopes: string[];
  createdBy: number;
};

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyContext;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera uma nova API Key no formato plakr_live_<32 hex chars> */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = randomBytes(16).toString("hex"); // 32 chars hex
  const raw = `plakr_live_${secret}`;
  const hash = hashApiKey(raw);
  const prefix = raw.substring(0, 16); // "plakr_live_" + 5 chars
  return { raw, hash, prefix };
}

/** Calcula SHA-256 de uma API Key */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ─── Middleware principal ─────────────────────────────────────────────────────

/**
 * Middleware de autenticação por API Key.
 * Injeta req.apiKey se válida, ou retorna 401/403.
 *
 * @param requiredScope Escopo necessário para o endpoint (ex: "pools:write")
 */
export function requireApiKey(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = req.headers["x-api-key"];

    if (!rawKey || typeof rawKey !== "string") {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Header X-API-Key ausente ou inválido.",
          status: 401,
        },
      });
    }

    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Banco de dados indisponível.", status: 500 },
        });
      }

      const keyHash = hashApiKey(rawKey);
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (rows.length === 0) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "API Key inválida.", status: 401 },
        });
      }

      const key = rows[0];

      if (!key.isActive) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "API Key revogada.", status: 401 },
        });
      }

      if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "API Key expirada.", status: 401 },
        });
      }

      const scopes = (key.scopes as string[]) ?? [];

      if (requiredScope && !scopes.includes(requiredScope)) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: `Escopo insuficiente. Necessário: ${requiredScope}`,
            status: 403,
          },
        });
      }

      // Atualizar lastUsedAt de forma assíncrona (não bloqueia a resposta)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch(() => {}); // silencioso

      req.apiKey = {
        id: key.id,
        name: key.name,
        scopes,
        createdBy: key.createdBy,
      };

      next();
    } catch (err) {
      console.error("[API Auth] Error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Erro interno de autenticação.", status: 500 },
      });
    }
  };
}
