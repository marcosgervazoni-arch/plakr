/**
 * Apple Sign In — OAuth 2.0 / OIDC
 *
 * Fluxo:
 *   1. GET /api/oauth/apple          → redireciona para appleid.apple.com/auth/authorize
 *   2. POST /api/oauth/apple/callback → Apple envia code + id_token via POST (form-urlencoded)
 *      - Valida id_token (JWT assinado pela Apple)
 *      - Cria/atualiza usuário no banco
 *      - Cria sessão JWT e redireciona para returnPath
 *
 * Configuração necessária (Super Admin):
 *   - appleClientId  → Services ID registrado no Apple Developer (ex: com.plakr.web)
 *   - appleTeamId    → Team ID de 10 caracteres
 *   - appleKeyId     → Key ID da chave privada .p8
 *   - applePrivateKey → Conteúdo da chave .p8 (PEM completo)
 *   - appleOAuthEnabled → toggle
 *
 * Nota: Apple exige que o callback seja HTTPS e o domínio esteja registrado no App ID.
 */
import type { Express } from "express";
import { SignJWT, importPKCS8, decodeJwt } from "jose";
import * as db from "../db";
import { sdk } from "./sdk";
import { getPlatformSettings } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const";
import logger from "../logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodeState(data: { origin: string; returnPath: string }): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeState(state: string): { origin: string; returnPath: string } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Gera o client_secret JWT exigido pela Apple para trocar o code por tokens.
 * Válido por 6 meses (máximo permitido).
 */
async function generateAppleClientSecret(
  teamId: string,
  clientId: string,
  keyId: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  return new SignJWT({
    iss: teamId,
    iat: now,
    exp: now + 15777000, // ~6 meses
    aud: "https://appleid.apple.com",
    sub: clientId,
  })
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .sign(privateKey);
}

/**
 * Decodifica o id_token enviado pela Apple (sem verificar assinatura — confiamos no canal HTTPS).
 * Para produção robusta, verificar com as chaves públicas da Apple em appleid.apple.com/auth/keys.
 */
function decodeAppleIdToken(idToken: string): {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
} | null {
  try {
    const payload = decodeJwt(idToken);
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      email_verified: payload.email_verified as boolean | string | undefined,
    };
  } catch {
    return null;
  }
}

// ─── Registro das rotas ───────────────────────────────────────────────────────

export function registerAppleOAuthRoutes(app: Express) {
  /**
   * GET /api/oauth/apple
   * Redireciona o usuário para a tela de login da Apple.
   */
  app.get("/api/oauth/apple", async (req, res) => {
    const origin = (req.query.origin as string) || `${req.protocol}://${req.get("host")}`;
    const returnPath = (req.query.returnPath as string) || "/dashboard";

    try {
      const settings = await getPlatformSettings();
      if (!settings?.appleOAuthEnabled || !settings.appleClientId) {
        res.status(503).json({ error: "Apple Sign In is not enabled" });
        return;
      }

      const state = encodeState({ origin, returnPath });
      const redirectUri = `${origin}/api/oauth/apple/callback`;

      const params = new URLSearchParams({
        response_type: "code id_token",
        response_mode: "form_post",
        client_id: settings.appleClientId,
        redirect_uri: redirectUri,
        scope: "name email",
        state,
      });

      res.redirect(302, `https://appleid.apple.com/auth/authorize?${params.toString()}`);
    } catch (error) {
      logger.error({ err: error }, "[AppleOAuth] Redirect failed");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/oauth/apple/callback
   * Apple envia o resultado via POST com application/x-www-form-urlencoded.
   * Campos: code, id_token, state, user (JSON string, apenas no primeiro login)
   */
  app.post("/api/oauth/apple/callback", async (req, res) => {
    const { code, id_token, state, user: userJson, error: appleError } = req.body as Record<string, string>;

    if (appleError) {
      logger.warn({ appleError }, "[AppleOAuth] Apple returned error");
      res.redirect(302, `/?auth_error=${encodeURIComponent(appleError)}`);
      return;
    }

    if (!code || !id_token || !state) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    const stateData = decodeState(state);
    if (!stateData) {
      res.status(400).json({ error: "Invalid state parameter" });
      return;
    }
    const { origin, returnPath } = stateData;

    try {
      const settings = await getPlatformSettings();
      if (
        !settings?.appleOAuthEnabled ||
        !settings.appleClientId ||
        !settings.appleTeamId ||
        !settings.appleKeyId ||
        !settings.applePrivateKey
      ) {
        res.status(503).json({ error: "Apple Sign In is not enabled" });
        return;
      }

      // Decodificar id_token para obter sub (identificador único Apple) e email
      const appleUser = decodeAppleIdToken(id_token);
      if (!appleUser?.sub) {
        logger.error("[AppleOAuth] Failed to decode id_token");
        res.redirect(302, `${origin}/?auth_error=token_failed`);
        return;
      }

      // Apple envia o nome do usuário apenas no PRIMEIRO login (via campo "user")
      let firstName = "";
      let lastName = "";
      if (userJson) {
        try {
          const parsed = JSON.parse(userJson);
          firstName = parsed?.name?.firstName || "";
          lastName = parsed?.name?.lastName || "";
        } catch { /* ignora */ }
      }
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

      // openId para Apple: prefixo "apple:" + sub
      const openId = `apple:${appleUser.sub}`;

      // ── Merge de conta por e-mail ──────────────────────────────────────────
      // Cenário: usuário já tem conta via magic link com o mesmo e-mail.
      // Vinculamos o openId do Apple à conta existente em vez de criar duplicata.
      // Nota: Apple só envia o e-mail no primeiro login; em logins subsequentes
      // appleUser.email pode ser null — por isso usamos o e-mail apenas quando disponível.
      let existingUser = await db.getUserByOpenId(openId);
      if (!existingUser && appleUser.email) {
        const userByEmail = await db.getUserByEmail(appleUser.email);
        if (userByEmail) {
          logger.info(
            { userId: userByEmail.id, email: appleUser.email },
            "[AppleOAuth] Conta existente encontrada pelo e-mail — vinculando openId Apple"
          );
          await db.mergeUserOpenId(userByEmail.id, openId, "apple");
          existingUser = await db.getUserByOpenId(openId);
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      const isNewUser = !existingUser;
      // Criar/atualizar usuário no banco (upsert: cria se novo, atualiza se existente)
      await db.upsertUser({
        openId,
        name: fullName || (existingUser?.name ?? null),
        email: appleUser.email || (existingUser?.email ?? null),
        loginMethod: "apple",
        lastSignedIn: new Date(),
      });

      // [LOG] Registrar novo cadastro ou login de admin
      try {
        const loggedUser = await db.getUserByOpenId(openId);
        if (loggedUser) {
          if (isNewUser) {
            await db.createAdminLog(loggedUser.id, "user_registered", "user", loggedUser.id, {
              name: loggedUser.name,
              email: loggedUser.email,
              loginMethod: "apple",
            }, undefined, { level: "info" });
          } else if (loggedUser.role === "admin") {
            await db.createAdminLog(loggedUser.id, "admin_login", "user", loggedUser.id, {
              name: loggedUser.name,
              email: loggedUser.email,
              loginMethod: "apple",
            }, undefined, { level: "info" });
          }
        }
      } catch { /* não bloquear o login */ }

      // [Welcome Email] Enviar e-mail de boas-vindas para novos usuários
      if (isNewUser) {
        try {
          const newUserData = await db.getUserByOpenId(openId);
          if (newUserData?.email && !newUserData.welcomeEmailSent) {
            import("../email")
              .then(async ({ templateWelcome, sendEmail }) => {
                const tpl = templateWelcome(newUserData.name || newUserData.email!.split("@")[0]);
                const sent = await sendEmail({ to: newUserData.email!, subject: tpl.subject, html: tpl.html, type: "welcome" });
                if (sent) {
                  const { getDb } = await import("../db");
                  const dbConn = await getDb();
                  const { users } = await import("../../drizzle/schema");
                  const { eq } = await import("drizzle-orm");
                  if (dbConn) await dbConn.update(users).set({ welcomeEmailSent: true }).where(eq(users.id, newUserData.id));
                }
              })
              .catch(() => {});
          }
        } catch { /* não bloquear o login */ }
      }

      // [Badges] Verificar badges a cada login
      try {
        const loggedUserForBadge = await db.getUserByOpenId(openId);
        if (loggedUserForBadge) {
          import("../badges")
            .then(({ calculateAndAssignBadges }) =>
              calculateAndAssignBadges(loggedUserForBadge.id).catch(() => {})
            )
            .catch(() => {});
        }
      } catch { /* não bloquear o login */ }

      // Criar sessão JWT
      const sessionToken = await sdk.createSessionToken(openId, {
        name: fullName || existingUser?.name || "",
        expiresInMs: THIRTY_DAYS_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Redirecionar para returnPath ou /dashboard
      const safePath = returnPath.startsWith("/") ? returnPath : "/dashboard";
      res.redirect(302, safePath);
    } catch (error) {
      logger.error({ err: error }, "[AppleOAuth] Callback failed");
      res.redirect(302, `${origin}/?auth_error=server_error`);
    }
  });
}
