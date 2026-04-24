/**
 * Plakr! — Rota Express de Verificação de Magic Link
 *
 * GET /api/auth/magic-link/verify?token=XXX
 *
 * Valida o token, cria a sessão via SDK e redireciona para o returnPath.
 * Segurança:
 * - Token expira em 15 minutos
 * - Uso único (usedAt marcado após primeiro uso)
 * - Sanitização do returnPath (apenas caminhos relativos)
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const";
import { getDb } from "./db";
import { magicLinks, users } from "../drizzle/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import logger from "./logger";

export function registerMagicLinkRoute(app: Express) {
  app.get("/api/auth/magic-link/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;

    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      return res.redirect(302, "/magic-link/verify?error=invalid_token");
    }

    const db = await getDb();
    if (!db) {
      logger.error("[MagicLink] DB não disponível na verificação");
      return res.redirect(302, "/magic-link/verify?error=server_error");
    }

    try {
      // Busca o magic link pelo token
      const now = new Date();
      const [link] = await db
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.token, token),
            isNull(magicLinks.usedAt),        // não usado
            gt(magicLinks.expiresAt, now)     // não expirado
          )
        )
        .limit(1);

      if (!link) {
        logger.warn({ token: token.slice(0, 8) + "..." }, "[MagicLink] Token inválido, expirado ou já usado");
        return res.redirect(302, "/magic-link/verify?error=invalid_or_expired");
      }

      // Marca o token como usado (atomicamente, antes de criar a sessão)
      await db
        .update(magicLinks)
        .set({ usedAt: now })
        .where(eq(magicLinks.id, link.id));

      // Busca o usuário pelo e-mail (case-insensitive)
      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${link.email})`)
        .limit(1);

      if (!user) {
        logger.warn({ email: link.email }, "[MagicLink] Usuário não encontrado após validação do token");
        return res.redirect(302, "/magic-link/verify?error=user_not_found");
      }

      if (user.isBlocked) {
        logger.warn({ userId: user.id }, "[MagicLink] Usuário bloqueado tentou login via magic link");
        return res.redirect(302, "/magic-link/verify?error=user_blocked");
      }

      // Cria a sessão via SDK (mesmo padrão do OAuth)
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: THIRTY_DAYS_MS,
      });

      // Seta o cookie de sessão
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Sanitiza o returnPath (apenas caminhos relativos)
      const safePath = link.returnPath && link.returnPath.startsWith("/")
        ? link.returnPath
        : "/dashboard";

      logger.info({ userId: user.id, email: link.email }, "[MagicLink] Login bem-sucedido via magic link");

      // [Welcome Email] Enviar e-mail de boas-vindas na primeira vez (welcomeEmailSent = false)
      if (!user.welcomeEmailSent) {
        import("./email")
          .then(async ({ templateWelcome, sendEmail }) => {
            const tpl = templateWelcome(user.name || link.email.split('@')[0]);
            const sent = await sendEmail({ to: link.email, subject: tpl.subject, html: tpl.html, type: "welcome" });
            if (sent) {
              await db.update(users).set({ welcomeEmailSent: true }).where(eq(users.id, user.id));
            }
          })
          .catch(() => {});
      }

      // Redireciona para o destino
      return res.redirect(302, safePath);
    } catch (err) {
      logger.error({ err }, "[MagicLink] Erro na verificação do token");
      return res.redirect(302, "/magic-link/verify?error=server_error");
    }
  });
}
