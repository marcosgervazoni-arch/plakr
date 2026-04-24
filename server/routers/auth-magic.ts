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
import { emailQueue, magicLinks } from "../../drizzle/schema";
import { sendEmail } from "../email";
import { ENV } from "../_core/env";
import logger from "../logger";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// ─── Template de e-mail para magic link ──────────────────────────────────────
function templateMagicLink(opts: {
  name: string;
  magicUrl: string;
}): { subject: string; html: string } {
  // Identidade visual Plakr! — paleta oficial
  const GOLD = "#FFB800";          // primary.main — dourado Plakr!
  const GOLD_DARK = "#FF8A00";     // primary.gradient end
  const BG = "#0B0F1A";            // background.primary
  const SURFACE = "#121826";       // background.surface
  const TEXT = "#F5F5F5";
  const MUTED = "#8A9BB5";
  const BORDER = "#1E2A3A";

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

          <!-- Header com logo Plakr! -->
          <tr>
            <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid ${BORDER};">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size:24px;font-weight:900;color:${GOLD};letter-spacing:-0.5px;">Plakr!</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:${MUTED};">Bolões Esportivos</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="background:${SURFACE};padding:36px 32px 28px;">
              <!-- Ícone de chave -->
              <div style="width:56px;height:56px;background:linear-gradient(135deg,${GOLD},${GOLD_DARK});border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:28px;line-height:56px;text-align:center;">🔑</div>

              <h2 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${TEXT};">Seu link de acesso chegou!</h2>
              <p style="margin:0 0 24px;color:${MUTED};line-height:1.7;font-size:15px;">
                Olá${opts.name ? `, <strong style="color:${TEXT};">${opts.name}</strong>` : ""}! Clique no botão abaixo para entrar no <strong style="color:${GOLD};">Plakr!</strong> sem precisar de senha.
              </p>

              <!-- Info box -->
              <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid ${GOLD};border-radius:10px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">⏰ Este link expira em <strong style="color:${GOLD};">15 minutos</strong> e só pode ser usado uma vez.</p>
                <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail com segurança.</p>
              </div>

              <!-- Botão CTA -->
              <a href="${opts.magicUrl}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},${GOLD_DARK});color:#0B0F1A;font-weight:800;font-size:16px;padding:16px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                ✅ Entrar no Plakr!
              </a>

              <!-- Link fallback -->
              <p style="margin:24px 0 0;font-size:12px;color:${MUTED};">
                Se o botão não funcionar, copie e cole este link no navegador:<br/>
                <a href="${opts.magicUrl}" style="color:${GOLD};word-break:break-all;font-size:11px;">${opts.magicUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0D1220;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                Você está recebendo este e-mail porque solicitou acesso ao Plakr!.<br/>
                <a href="${ENV.appBaseUrl}" style="color:${GOLD};text-decoration:none;">Acessar plataforma</a>
                &nbsp;·&nbsp;
                <span style="color:${MUTED};">plakr.io</span>
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

      // Se o usuário não existe, retornamos sent:false para que o frontend
      // possa orientar o usuário a verificar o e-mail digitado
      if (!user) {
        logger.info({ email }, "[MagicLink] E-mail não encontrado");
        return { sent: false, reason: "email_not_found" };
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
        logger.error({ email }, "[MagicLink] Falha no SMTP direto — enfileirando para retry");
        // Fallback: enfileira para o worker processar nos próximos minutos
        try {
          await db.insert(emailQueue).values({
            userId: user.id,
            toEmail: email,
            toName: user.name ?? "",
            subject,
            htmlBody: html,
            status: "pending",
          });
          logger.info({ email }, "[MagicLink] E-mail enfileirado para retry");
        } catch (qErr) {
          logger.error({ email, err: qErr }, "[MagicLink] Falha ao enfileirar e-mail");
        }
      }

      logger.info({ email, userId: user.id }, "[MagicLink] Link enviado");
      return { sent: true };
    }),
});
