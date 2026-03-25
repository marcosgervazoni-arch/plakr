import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const"; // [S12] sessão 30 dias
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse the state parameter from the OAuth callback.
 * Supports two formats:
 * 1. Legacy: base64(redirectUri) — plain string
 * 2. New: base64(JSON { redirectUri, returnPath }) — preserves post-login destination
 */
function parseState(state: string): { redirectUri: string; returnPath: string } {
  try {
    const decoded = atob(state);
    // Try JSON format first (new format)
    try {
      const parsed = JSON.parse(decoded);
      if (parsed.redirectUri) {
        return {
          redirectUri: parsed.redirectUri,
          returnPath: parsed.returnPath ?? "/dashboard",
        };
      }
    } catch {
      // Not JSON — legacy format: decoded is the redirectUri directly
    }
    // Legacy format: the decoded value is just the redirectUri
    return { redirectUri: decoded, returnPath: "/dashboard" };
  } catch {
    return { redirectUri: "", returnPath: "/dashboard" };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: THIRTY_DAYS_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Redirect to the returnPath (e.g. /join/TOKEN) or fallback to /dashboard
      const { returnPath } = parseState(state);
      // Sanitize: only allow relative paths to prevent open redirect
      const safePath = returnPath.startsWith("/") ? returnPath : "/dashboard";
      res.redirect(302, safePath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
