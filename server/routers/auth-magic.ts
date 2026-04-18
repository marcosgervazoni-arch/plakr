/**
 * Plakr! — Router de Magic Link (Login por E-mail)
 * Alternativa ao OAuth para resolver incompatibilidade com Safari no iPhone.
 *
 * Fluxo:
 * 1. sendMagicLink: gera token seguro, salva na tabela magic_links, envia e-mail
 * 2. A rota Express /api/auth/magic-link/verify valida o token e cria a sessão
 */
import crypto from "crypto";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, getUserByEmail } from "../db";
import { magicLinks } from "../../drizzle/schema";
import { sendEmail } from "../email";
import { ENV } from "../_core/env";
import logger from "../logger";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// ─── Template de e-mail para magic link ──────────────────────────────────────
function templateMagicLink(opts: {
  name: string;
  magicUrl: string;
}): { subject: string; html: string } {
  const BRAND = "#22c55e";
  const BG = "#0a0a0a";
  const SURFACE = "#111111";
  const TEXT = "#f5f5f5";
  const MUTED = "#a3a3a3";

  return {
    subject: "🔑 Seu link de acesso ao Plakr!",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link de Acesso — Plakr!</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Inter',Arial,sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:28px 32px;border-bottom:1px solid #1f1f1f;">
              <span style="font-size:22px;font-weight:800;color:${BRAND};letter-spacing:-0.5px;">Apost<span style="color:${TEXT};">AI</span></span>
            </td>
          </tr>
          <tr>
            <td style="background:${SURFACE};padding:32px 32px 24px;">
              <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">Seu link de acesso chegou! 🔑</h2>
              <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">
                Olá${opts.name ? `, <strong style="color:${TEXT};">${opts.name}</strong>` : ""}! Clique no botão abaixo para entrar no Plakr! sem precisar de senha.
              </p>
              <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:${MUTED};">⏰ Este link expira em <strong style="color:#f59e0b;">15 minutos</strong> e só pode ser usado uma vez.</p>
                <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail com segurança.</p>
              </div>
              <a href="${opts.magicUrl}" style="display:inline-block;background:${BRAND};color:#000;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;">
                ✅ Entrar no Plakr!
              </a>
              <p style="margin:20px 0 0;font-size:12px;color:${MUTED};">
                Se o botão não funcionar, copie e cole este link no navegador:<br/>
                <a href="${opts.magicUrl}" style="color:${BRAND};word-break:break-all;font-size:11px;">${opts.magicUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d0d0d;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                Você está recebendo este e-mail porque solicitou acesso ao Plakr!.<br/>
                <a href="${ENV.appBaseUrl}" style="color:${BRAND};text-decoration:none;">Acessar plataforma</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export const authMagicRouter = router({
  /**
   * Envia um magic link para o e-mail informado.
   * O e-mail deve pertencer a um usuário já cadastrado na plataforma.
   * Retorna { sent: true } mesmo se o e-mail não existir (segurança — não revela se o e-mail está cadastrado).
   */
  sendMagicLink: publicProcedure
    .input(
      z.object({
        email: z.string().email("E-mail inválido"),
        returnPath: z.string().optional().default("/dashboard"),
        origin: z.string().url("Origin inválida"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: true }; // silencia erro de DB

      const email = input.email.toLowerCase().trim();
      const returnPath = input.returnPath.startsWith("/") ? input.returnPath : "/dashboard";

      // Busca o usuário pelo e-mail
      const user = await getUserByEmail(email);

      // Se o usuário não existe, retornamos { sent: true } por segurança
      // (não revelamos se o e-mail está ou não cadastrado)
      if (!user) {
        logger.info({ email }, "[MagicLink] E-mail não encontrado, retornando sent:true por segurança");
        return { sent: true };
      }

      // Gera token seguro (64 chars hex = 32 bytes)
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);

      // Salva na tabela magic_links
      await db.insert(magicLinks).values({
        email,
        token,
        returnPath,
        expiresAt,
      });

      // Monta a URL do magic link
      const magicUrl = `${input.origin}/magic-link/verify?token=${token}`;

      // Envia o e-mail
      const { subject, html } = templateMagicLink({
        name: user.name ?? "",
        magicUrl,
      });

      const sent = await sendEmail({ to: email, subject, html, type: "magic_link" });

      if (!sent) {
        logger.error({ email }, "[MagicLink] Falha ao enviar e-mail");
        // Não lançamos erro para não revelar se o e-mail existe
      }

      logger.info({ email, userId: user.id }, "[MagicLink] Link enviado");
      return { sent: true };
    }),
});
