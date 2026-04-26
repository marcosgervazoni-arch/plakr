/**
 * Plakr! — Router de Magic Link + OTP (Login por E-mail)
 * Alternativa ao OAuth para resolver incompatibilidade com Safari no iPhone.
 *
 * Fluxo:
 * 1. sendMagicLink: gera token + código OTP de 6 dígitos, salva em magic_links, envia e-mail
 * 2. A rota Express /api/auth/magic-link/verify valida o token e cria a sessão
 * 3. verifyOtp: valida o código de 6 dígitos e retorna o token para redirecionar
 */
import crypto from "crypto";
import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, getUserByEmail } from "../db";
import { emailQueue, magicLinks, users } from "../../drizzle/schema";
import { sendEmail } from "../email";
import { ENV } from "../_core/env";
import logger from "../logger";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/** Gera código OTP de 6 dígitos numéricos */
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Template de e-mail para magic link + OTP ────────────────────────────────
function templateMagicLink(opts: {
  name: string;
  magicUrl: string;
  otpCode: string;
}): { subject: string; html: string } {
  const GOLD = "#FFB800";
  const GOLD_DARK = "#FF8A00";
  const BG = "#0B0F1A";
  const SURFACE = "#121826";
  const TEXT = "#F5F5F5";
  const MUTED = "#8A9BB5";
  const BORDER = "#1E2A3A";

  return {
    subject: "🔑 Seu código de acesso ao Plakr!",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso ao Plakr!</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Inter',Arial,sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid ${BORDER};">
              <table width="100%">
                <tr>
                  <td><span style="font-size:24px;font-weight:900;color:${GOLD};letter-spacing:-0.5px;">Plakr!</span></td>
                  <td align="right"><span style="font-size:12px;color:${MUTED};">Bolões Esportivos</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="background:${SURFACE};padding:36px 32px 28px;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,${GOLD},${GOLD_DARK});border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:28px;line-height:56px;text-align:center;">🔑</div>

              <h2 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${TEXT};">Seu código de acesso chegou!</h2>
              <p style="margin:0 0 28px;color:${MUTED};line-height:1.7;font-size:15px;">
                Olá${opts.name ? `, <strong style="color:${TEXT};">${opts.name}</strong>` : ""}! Digite o código abaixo na tela do Plakr! para confirmar seu acesso. Sem senha, sem complicação.
              </p>

              <!-- Código OTP — elemento principal e único -->
              <div style="background:${BG};border:2px solid ${GOLD};border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;">Código de acesso</p>
                <p style="margin:0;font-size:48px;font-weight:900;color:${GOLD};letter-spacing:12px;font-family:monospace;">${opts.otpCode}</p>
                <p style="margin:16px 0 0;font-size:12px;color:${MUTED};">⏰ Este código expira em <strong style="color:${GOLD};">15 minutos</strong> e só pode ser usado uma vez.</p>
              </div>

              <!-- Info box -->
              <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid ${GOLD};border-radius:10px;padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail com segurança.</p>
              </div>
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
   * Envia um magic link + código OTP para o e-mail informado.
   * Se o e-mail não tiver conta, cria automaticamente (fluxo de convite de bolão).
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
      if (!db) return { sent: true };

      const email = input.email.toLowerCase().trim();
      const returnPath = input.returnPath.startsWith("/") ? input.returnPath : "/dashboard";

      // Busca o usuário pelo e-mail
      let user = await getUserByEmail(email);

      // Se não existe, cria a conta automaticamente (fluxo de convite)
      if (!user) {
        logger.info({ email }, "[MagicLink] E-mail não encontrado — criando conta automaticamente");
        const openId = `magic_${crypto.randomBytes(16).toString("hex")}`;
        const nameFromEmail = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        try {
          await db.insert(users).values({
            openId,
            email,
            name: nameFromEmail,
            loginMethod: "magic_link",
          });
          user = await getUserByEmail(email);
          logger.info({ email, openId }, "[MagicLink] Conta criada automaticamente");
        } catch (createErr) {
          logger.error({ email, err: createErr }, "[MagicLink] Falha ao criar conta automaticamente");
          return { sent: false, reason: "account_creation_failed" };
        }
        if (!user) {
          logger.error({ email }, "[MagicLink] Usuário não encontrado após criação");
          return { sent: false, reason: "account_creation_failed" };
        }
      }

      // Gera token seguro e código OTP de 6 dígitos
      const token = crypto.randomBytes(32).toString("hex");
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);

      // Salva na tabela magic_links
      await db.insert(magicLinks).values({
        email,
        token,
        otpCode,
        returnPath,
        expiresAt,
      });

      // Monta a URL do magic link
      const magicUrl = `${input.origin}/magic-link/verify?token=${token}`;

      // Envia o e-mail com link + código OTP
      const { subject, html } = templateMagicLink({
        name: user.name ?? "",
        magicUrl,
        otpCode,
      });

      const sent = await sendEmail({ to: email, subject, html, type: "magic_link" });

      if (!sent) {
        logger.error({ email }, "[MagicLink] Falha no SMTP direto — enfileirando para retry");
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

      logger.info({ email, userId: user.id }, "[MagicLink] Link + OTP enviados");
      return { sent: true };
    }),

  /**
   * Verifica o código OTP de 6 dígitos digitado pelo usuário.
   * Retorna o token do magic link para redirecionar para /magic-link/verify?token=...
   */
  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6, "Código deve ter 6 dígitos"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, error: "Erro interno" };

      const email = input.email.toLowerCase().trim();
      const now = new Date();

      // Busca magic link válido com o OTP informado
      const [link] = await db
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.email, email),
            eq(magicLinks.otpCode, input.otp),
            gt(magicLinks.expiresAt, now),
            isNull(magicLinks.usedAt)
          )
        )
        .limit(1);

      if (!link) {
        logger.warn({ email, otp: input.otp }, "[OTP] Código inválido, expirado ou já usado");
        return { valid: false, error: "Código inválido ou expirado. Solicite um novo link." };
      }

      logger.info({ email, linkId: link.id }, "[OTP] Código verificado com sucesso");
      // Retorna o token para o frontend redirecionar para /magic-link/verify?token=...
      return {
        valid: true,
        redirectUrl: `${input.origin}/magic-link/verify?token=${link.token}`,
      };
    }),
});
