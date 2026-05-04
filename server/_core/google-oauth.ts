/**
 * Plakr! — Google OAuth 2.0 Routes
 *
 * Fluxo:
 *   1. GET /api/oauth/google?origin=<frontend-origin>&returnPath=<path>
 *      → redireciona para o consent screen do Google
 *   2. GET /api/oauth/google/callback?code=...&state=...
 *      → troca o code por token, busca perfil do usuário, cria/atualiza conta, seta cookie de sessão
 *
 * Segurança:
 *   - state = base64(JSON { origin, returnPath, nonce }) — previne CSRF
 *   - redirect_uri fixo: https://plakr.io/api/oauth/google/callback (configurado no Google Console)
 *   - Credenciais lidas do banco (platform_settings), não hardcoded
 *   - Apenas e-mails verificados pelo Google são aceitos
 */

import type { Express, Request, Response } from "express";
import { getPlatformSettings } from "../db";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const";
import logger from "../logger";
import crypto from "crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeState(origin: string, returnPath: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  return Buffer.from(JSON.stringify({ origin, returnPath, nonce })).toString("base64url");
}

function decodeState(state: string): { origin: string; returnPath: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    if (!parsed.origin || typeof parsed.origin !== "string") return null;
    return {
      origin: parsed.origin,
      returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : "/dashboard",
    };
  } catch {
    return null;
  }
}

function buildGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; id_token: string } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error({ err }, "[GoogleOAuth] Token exchange failed");
    return null;
  }
  return res.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
} | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerGoogleOAuthRoutes(app: Express) {
  /**
   * Step 1 — Redirect to Google consent screen
   * Query params: origin (required), returnPath (optional)
   */
  app.get("/api/oauth/google", async (req: Request, res: Response) => {
    const origin = typeof req.query.origin === "string" ? req.query.origin : "";
    const returnPath = typeof req.query.returnPath === "string" ? req.query.returnPath : "/dashboard";

    if (!origin) {
      res.status(400).json({ error: "origin is required" });
      return;
    }

    try {
      const settings = await getPlatformSettings();
      if (!settings?.googleOAuthEnabled || !settings.googleClientId) {
        res.status(503).json({ error: "Google OAuth is not enabled" });
        return;
      }

      const redirectUri = `${origin}/api/oauth/google/callback`;
      const state = encodeState(origin, returnPath);
      const authUrl = buildGoogleAuthUrl(settings.googleClientId, redirectUri, state);

      res.redirect(302, authUrl);
    } catch (error) {
      logger.error({ err: error }, "[GoogleOAuth] Redirect failed");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Step 2 — Handle Google callback
   * Query params: code, state
   */
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const error = typeof req.query.error === "string" ? req.query.error : "";

    // Usuário cancelou o login
    if (error) {
      logger.warn({ error }, "[GoogleOAuth] User denied access or error from Google");
      res.redirect(302, "/?auth_error=cancelled");
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
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
      if (!settings?.googleOAuthEnabled || !settings.googleClientId || !settings.googleClientSecret) {
        res.status(503).json({ error: "Google OAuth is not enabled" });
        return;
      }

      const redirectUri = `${origin}/api/oauth/google/callback`;

      // Trocar code por access_token
      const tokens = await exchangeCodeForToken(
        code,
        settings.googleClientId,
        settings.googleClientSecret,
        redirectUri
      );
      if (!tokens?.access_token) {
        logger.error("[GoogleOAuth] No access_token received");
        res.redirect(302, `${origin}/?auth_error=token_failed`);
        return;
      }

      // Buscar dados do usuário no Google
      const googleUser = await getGoogleUserInfo(tokens.access_token);
      if (!googleUser) {
        logger.error("[GoogleOAuth] Failed to fetch user info");
        res.redirect(302, `${origin}/?auth_error=userinfo_failed`);
        return;
      }

      // Apenas e-mails verificados
      if (!googleUser.email_verified) {
        logger.warn({ sub: googleUser.sub }, "[GoogleOAuth] Email not verified");
        res.redirect(302, `${origin}/?auth_error=email_not_verified`);
        return;
      }

      // openId para Google: prefixo "google:" + sub (ID único do Google)
      const openId = `google:${googleUser.sub}`;

      // Verificar se é novo usuário
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      // Criar/atualizar usuário no banco
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email || null,
        loginMethod: "google",
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
              loginMethod: "google",
            }, undefined, { level: "info" });
          } else if (loggedUser.role === "admin") {
            await db.createAdminLog(loggedUser.id, "admin_login", "user", loggedUser.id, {
              name: loggedUser.name,
              email: loggedUser.email,
              loginMethod: "google",
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
        name: googleUser.name || "",
        expiresInMs: THIRTY_DAYS_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Redirecionar para returnPath (ex: /join/TOKEN) ou /dashboard
      const safePath = returnPath.startsWith("/") ? returnPath : "/dashboard";
      res.redirect(302, safePath);
    } catch (error) {
      logger.error({ err: error }, "[GoogleOAuth] Callback failed");
      res.redirect(302, `${origin}/?auth_error=server_error`);
    }
  });
}
