/**
 * Plakr! — Serviço de E-mail
 * Usa SMTP da Hostinger (nodemailer) para envio de e-mails transacionais.
 * Templates HTML responsivos com identidade visual oficial Plakr!:
 *   - Fundo: #0B0F1A (primário) / #121826 (superfície)
 *   - Dourado: #FFB800 → #FF8A00 (gradiente CTA)
 *   - Sucesso: #00FF88 | Erro: #FF3B3B | Info: #00C2FF
 *   - Texto: #F5F5F5 | Muted: #9CA3AF
 */
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";
import { getDb, createNotification } from "./db";
import logger from "./logger";
import { resolveNotificationTemplate } from "./notificationTemplateHelper";
import { emailQueue, users, games, userPlans, pools, poolMembers } from "../drizzle/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";

// ─── HTML escape (previne XSS em dados de usuário interpolados nos templates) ─
function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Brand colors (Identidade Visual Plakr!) ─────────────────────────────────
const BG        = "#0B0F1A";   // fundo principal
const SURFACE   = "#121826";   // cards e superfícies
const SURFACE2  = "#1A2235";   // superfície secundária (destaques internos)
const BORDER    = "rgba(255,255,255,0.08)";
const GOLD      = "#FFB800";   // dourado principal
const GOLD2     = "#FF8A00";   // dourado gradiente
const SUCCESS   = "#00FF88";   // verde sucesso
const ERROR     = "#FF3B3B";   // vermelho erro
const INFO      = "#00C2FF";   // azul info
const TEXT      = "#F5F5F5";   // texto principal
const MUTED     = "#9CA3AF";   // texto secundário
const MUTED2    = "#6B7280";   // texto terciário

// ─── Base HTML template ───────────────────────────────────────────────────────
function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
                  <td>
                    <!-- Logo Plakr! -->
                    <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;">
                      <span style="background:linear-gradient(135deg,${GOLD},${GOLD2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Plakr</span><span style="color:${TEXT};">!</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:${MUTED2};letter-spacing:0.5px;text-transform:uppercase;">Bolões Esportivos</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background:${SURFACE};padding:32px 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0D1120;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:12px;color:${MUTED2};text-align:center;line-height:1.6;">
                Você está recebendo este e-mail porque tem uma conta no Plakr!.
              </p>
              <p style="margin:0;font-size:12px;text-align:center;">
                <a href="${ENV.appBaseUrl}" style="color:${GOLD};text-decoration:none;font-weight:600;">Acessar plataforma</a>
                <span style="color:${MUTED2};margin:0 8px;">·</span>
                <a href="${ENV.appBaseUrl}/settings/notifications" style="color:${MUTED2};text-decoration:none;">Gerenciar notificações</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── CTA Button helper ────────────────────────────────────────────────────────
function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},${GOLD2});color:#0B0F1A;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;letter-spacing:0.2px;">${text}</a>`;
}

// ─── Divider helper ───────────────────────────────────────────────────────────
function divider(): string {
  return `<div style="height:1px;background:${BORDER};margin:24px 0;"></div>`;
}

// ─── Info box helper ──────────────────────────────────────────────────────────
function infoBox(content: string, color: string = GOLD): string {
  return `<div style="background:${SURFACE2};border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">${content}</div>`;
}

// ─── Template: Magic Link ─────────────────────────────────────────────────────
export function templateMagicLink(opts: {
  name: string;
  magicUrl: string;
  expiresMinutes?: number;
}): { subject: string; html: string } {
  const minutes = opts.expiresMinutes ?? 15;
  return {
    subject: "🔑 Seu link de acesso ao Plakr! chegou",
    html: baseTemplate("Acesso ao Plakr!", `
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:${TEXT};">Seu link de acesso chegou! 🔑</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.name)}</strong>! Clique no botão abaixo para entrar no Plakr! sem precisar de senha.</p>

      ${infoBox(`
        <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">⏱ Este link expira em <strong style="color:${GOLD};">${minutes} minutos</strong> e só pode ser usado uma vez.</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail com segurança.</p>
      `, INFO)}

      <div style="margin-top:24px;">
        ${ctaButton("Entrar no Plakr!", opts.magicUrl)}
      </div>

      ${divider()}
      <p style="margin:0;font-size:12px;color:${MUTED2};">Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p style="margin:6px 0 0;font-size:11px;word-break:break-all;"><a href="${opts.magicUrl}" style="color:${GOLD};text-decoration:none;">${opts.magicUrl}</a></p>
    `),
  };
}

// ─── Template: Boas-vindas ────────────────────────────────────────────────────
export function templateWelcome(name: string): { subject: string; html: string } {
  return {
    subject: "🏆 Bem-vindo ao Plakr!! Sua conta está pronta",
    html: baseTemplate("Bem-vindo ao Plakr!", `
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:${TEXT};">Olá, ${esc(name)}! 👋</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Sua conta no <strong style="color:${TEXT};">Plakr!</strong> foi criada com sucesso. Agora você pode participar de bolões esportivos, fazer seus palpites e disputar o ranking com amigos.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-weight:700;font-size:14px;color:${TEXT};">O que você pode fazer agora:</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">🏅 <strong style="color:${TEXT};">Entrar em bolões</strong> via link de convite ou código</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">⚽ <strong style="color:${TEXT};">Fazer palpites</strong> nos jogos antes do prazo</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">📊 <strong style="color:${TEXT};">Acompanhar o ranking</strong> em tempo real</p>
        <p style="margin:0;color:${MUTED};font-size:13px;">🎯 <strong style="color:${TEXT};">Criar seu bolão</strong> (Plano Gratuito: 2 bolões, 50 participantes)</p>
      </div>

      ${ctaButton("Acessar minha conta", ENV.appBaseUrl)}
    `),
  };
}

// ─── Template: Lembrete de palpite ───────────────────────────────────────────
export function templateBetReminder(opts: {
  name: string;
  poolName: string;
  poolSlug: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  minutesLeft: number;
}): { subject: string; html: string } {
  const isUrgent = opts.minutesLeft <= 30;
  const urgencyLabel = isUrgent ? "🚨 Urgente" : "⏰ Lembrete";
  const timeColor = isUrgent ? ERROR : GOLD;
  return {
    subject: `${urgencyLabel}: Faça seu palpite em ${opts.homeTeam} × ${opts.awayTeam}`,
    html: baseTemplate("Lembrete de Palpite", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">${urgencyLabel}: Palpite pendente!</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.name)}</strong>! O prazo para palpitar no jogo abaixo está se encerrando.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:11px;color:${MUTED2};text-transform:uppercase;letter-spacing:1px;">Bolão</p>
        <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:${GOLD};">${esc(opts.poolName)}</p>
        <p style="margin:0 0 16px;font-size:26px;font-weight:900;color:${TEXT};">${esc(opts.homeTeam)} <span style="color:${GOLD};">×</span> ${esc(opts.awayTeam)}</p>
        <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Início: <strong style="color:${TEXT};">${opts.matchTime}</strong></p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${timeColor};">⏱ ${opts.minutesLeft} minutos restantes para palpitar</p>
      </div>

      ${ctaButton("Fazer meu palpite agora", `${ENV.appBaseUrl}/pool/${opts.poolSlug}`)}
    `),
  };
}

// ─── Template: Resultado disponível ──────────────────────────────────────────
export function templateResultAvailable(opts: {
  name: string;
  poolName: string;
  poolSlug: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
  betDescription: string;
}): { subject: string; html: string } {
  const isGreat = opts.pointsEarned >= 10;
  const isOk = opts.pointsEarned >= 5;
  const emoji = isGreat ? "🎯" : isOk ? "✅" : "❌";
  const ptsColor = isGreat ? SUCCESS : isOk ? GOLD : ERROR;
  return {
    subject: `${emoji} Resultado: ${opts.homeTeam} ${opts.homeScore}×${opts.awayScore} ${opts.awayTeam} — ${opts.pointsEarned}pts`,
    html: baseTemplate("Resultado do Jogo", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Resultado apurado! ${emoji}</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.name)}</strong>! O resultado do jogo foi registrado no bolão <strong style="color:${GOLD};">${esc(opts.poolName)}</strong>.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;border:1px solid ${BORDER};">
        <p style="margin:0 0 16px;font-size:28px;font-weight:900;color:${TEXT};">
          ${esc(opts.homeTeam)} <span style="color:${GOLD};">${opts.homeScore}×${opts.awayScore}</span> ${esc(opts.awayTeam)}
        </p>
        ${divider()}
        <p style="margin:0 0 8px;font-size:13px;color:${MUTED};">Seu palpite: <strong style="color:${TEXT};">${esc(opts.betDescription)}</strong></p>
        <p style="margin:0;font-size:32px;font-weight:900;color:${ptsColor};">+${opts.pointsEarned} pts</p>
      </div>

      ${ctaButton("Ver ranking do bolão", `${ENV.appBaseUrl}/pool/${opts.poolSlug}`)}
    `),
  };
}

// ─── Template: Expiração de plano ────────────────────────────────────────────
export function templatePlanExpiring(opts: {
  name: string;
  daysLeft: number;
  expiresAt: string;
}): { subject: string; html: string } {
  const urgency = opts.daysLeft === 1 ? "🚨 Último dia" : `⚠️ ${opts.daysLeft} dias restantes`;
  return {
    subject: `${urgency} — Seu Plano Pro expira em breve`,
    html: baseTemplate("Plano Pro Expirando", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">${urgency} do Plano Pro</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.name)}</strong>! Seu Plano Pro expira em <strong style="color:${GOLD};">${opts.expiresAt}</strong>. Renove agora para não perder o acesso às funcionalidades exclusivas.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-weight:700;font-size:14px;color:${TEXT};">O que você perde sem o Pro:</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Bolões ilimitados (volta ao limite de 2)</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Participantes ilimitados (volta ao limite de 50)</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Campeonatos personalizados</p>
        <p style="margin:0;font-size:13px;color:${ERROR};">❌ Registro de resultados próprios</p>
      </div>

      ${ctaButton("Renovar Plano Pro", `${ENV.appBaseUrl}/subscription`)}
    `),
  };
}

// ─── Template: Convite de bolão (usuário existente) ───────────────────────────
export function templatePoolInvite(opts: {
  inviteeName: string;
  organizerName: string;
  poolName: string;
  tournamentName: string;
  memberCount: number;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `🏆 ${opts.organizerName} te convidou para o bolão "${opts.poolName}"`,
    html: baseTemplate("Convite de Bolão", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi convidado! 🏆</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.inviteeName)}</strong>! <strong style="color:${GOLD};">${esc(opts.organizerName)}</strong> te convidou para participar do bolão abaixo.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${TEXT};">${esc(opts.poolName)}</p>
        <p style="margin:0 0 16px;font-size:13px;color:${MUTED};">${esc(opts.tournamentName)}</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">👥 <strong style="color:${TEXT};">${opts.memberCount}</strong> participante${opts.memberCount !== 1 ? "s" : ""} já entraram</p>
      </div>

      ${ctaButton("Entrar no bolão", opts.inviteUrl)}
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED2};">📅 Este convite expira em 7 dias.</p>
    `),
  };
}

// ─── Template: Membro adicionado manualmente ────────────────────────────────
export function templateManualMemberAdd(opts: {
  memberName: string;
  organizerName: string;
  poolName: string;
  poolUrl: string;
  hasEntryFee: boolean;
  entryFee?: number;
}): { subject: string; html: string } {
  return {
    subject: `🎉 Você foi adicionado ao bolão "${opts.poolName}"`,
    html: baseTemplate("Você entrou no bolão!", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi adicionado! 🎉</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">${esc(opts.memberName)}</strong>! <strong style="color:${GOLD};">${esc(opts.organizerName)}</strong> adicionou você diretamente ao bolão abaixo.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 12px;font-size:20px;font-weight:800;color:${TEXT};">${esc(opts.poolName)}</p>
        ${opts.hasEntryFee
          ? `<p style="margin:0;font-size:13px;color:${GOLD};">⚠️ Taxa de inscrição: <strong>R$ ${opts.entryFee?.toFixed(2).replace('.', ',')}</strong>. Aguarde a confirmação do organizador.</p>`
          : `<p style="margin:0;font-size:13px;color:${SUCCESS};">✅ Você já está ativo e pode fazer seus palpites!</p>`
        }
      </div>

      ${ctaButton("Acessar o bolão", opts.poolUrl)}
    `),
  };
}

// ─── Template: Convite para não-membro do Plakr! ──────────────────────────────
export function templatePoolInviteExternal(opts: {
  organizerName: string;
  poolName: string;
  tournamentName: string;
  memberCount: number;
  inviteUrl: string;
  hasEntryFee: boolean;
  entryFee?: number;
  expiresAt?: Date;
}): { subject: string; html: string } {
  return {
    subject: `🏆 ${opts.organizerName} te convidou para o bolão "${opts.poolName}" no Plakr!`,
    html: baseTemplate("Convite para bolão", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi convidado! 🏆</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;"><strong style="color:${GOLD};">${esc(opts.organizerName)}</strong> te convidou para participar do bolão abaixo no <strong style="color:${TEXT};">Plakr!</strong> — a plataforma de bolões esportivos.</p>

      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${TEXT};">${esc(opts.poolName)}</p>
        <p style="margin:0 0 16px;font-size:13px;color:${MUTED};">${esc(opts.tournamentName)}</p>
        <p style="margin:0 0 10px;font-size:13px;color:${MUTED};">👥 <strong style="color:${TEXT};">${opts.memberCount}</strong> participante${opts.memberCount !== 1 ? "s" : ""} já entraram</p>
        ${opts.hasEntryFee
          ? `<p style="margin:0;font-size:13px;color:${GOLD};">⚠️ Taxa de inscrição: <strong>R$ ${opts.entryFee?.toFixed(2).replace('.', ',')}</strong>. O organizador confirmará após o pagamento.</p>`
          : `<p style="margin:0;font-size:13px;color:${SUCCESS};">✅ Entrada gratuita — faça seus palpites imediatamente após entrar!</p>`
        }
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6;">Clique no botão abaixo para criar sua conta gratuita e entrar no bolão automaticamente. Leva menos de 1 minuto!</p>

      ${ctaButton("Criar conta e entrar no bolão", opts.inviteUrl)}

      <p style="margin:16px 0 0;font-size:12px;color:${MUTED2};">📅 Este convite expira em <strong style="color:${TEXT};">${opts.expiresAt ? opts.expiresAt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '7 dias'}</strong>. Se você já tem conta no Plakr!, o mesmo link funcionará para fazer login e entrar no bolão.</p>
    `),
  };
}

// ─── Transporter SMTP (Hostinger) ─────────────────────────────────────────────
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!ENV.smtpUser || !ENV.smtpPass) {
    logger.warn("[Email] SMTP credentials not configured");
    return null;
  }
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpPort === 465,
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return _transporter;
}

// ─── Sender via SMTP ──────────────────────────────────────────────────────────
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  type: string;
}): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      logger.warn("[Email] SMTP not configured, skipping email send");
      return false;
    }

    await transporter.sendMail({
      from: `"${ENV.smtpFromName}" <${ENV.smtpUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    logger.info({ type: opts.type, to: opts.to }, "[Email] Sent via SMTP");
    return true;
  } catch (err) {
    logger.error({ type: opts.type, err }, "[Email] SMTP error sending");
    return false;
  }
}

// ─── Queue helpers ────────────────────────────────────────────────────────────

export async function enqueueEmail(opts: {
  toUserId: number;
  toEmail: string;
  type: "welcome" | "bet_reminder" | "result_available" | "plan_expiring" | "pool_invite";
  subject: string;
  html: string;
  scheduledFor?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(emailQueue).values({
      userId: opts.toUserId,
      toEmail: opts.toEmail,
      subject: opts.subject,
      htmlBody: opts.html,
      status: "pending",
    });
  } catch (err) {
    logger.error({ err }, "[Email] Failed to enqueue");
  }
}

export async function processEmailQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const pending = await db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.status, "pending"))
      .limit(50);

    for (const email of pending) {
      const success = await sendEmail({
        to: email.toEmail,
        subject: email.subject,
        html: email.htmlBody,
        type: "queued",
      });

      await db
        .update(emailQueue)
        .set({
          status: success ? "sent" : "failed",
          sentAt: success ? new Date() : undefined,
          attempts: sql`${emailQueue.attempts} + 1`,
        })
        .where(eq(emailQueue.id, email.id));
    }

    if (pending.length > 0) {
      logger.info({ count: pending.length }, "[Email] Processed emails from queue");
    }
  } catch (err) {
    logger.error({ err }, "[Email] Queue processing error");
  }
}

export async function scheduleBetReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const seventyFiveMinFromNow = new Date(now.getTime() + 75 * 60 * 1000);

    const upcomingGames = await db
      .select({
        gameId: games.id,
        homeTeamName: games.teamAName,
        awayTeamName: games.teamBName,
        matchDate: games.matchDate,
        tournamentId: games.tournamentId,
      })
      .from(games)
      .where(
        and(
          eq(games.status, "scheduled"),
          gte(games.matchDate, oneHourFromNow),
          lte(games.matchDate, seventyFiveMinFromNow)
        )
      )
      .limit(20);

    logger.info({ count: upcomingGames.length }, "[Email] Found games needing bet reminders");

    for (const g of upcomingGames) {
      const activePools = await db
        .select({ id: pools.id, name: pools.name, slug: pools.slug })
        .from(pools)
        .where(and(eq(pools.tournamentId, g.tournamentId), eq(pools.status, "active")));

      for (const pool of activePools) {
        const members = await db
          .select({ userId: poolMembers.userId })
          .from(poolMembers)
          .where(and(eq(poolMembers.poolId, pool.id), eq(poolMembers.isBlocked, false)));

        const matchDate = new Date(g.matchDate as Date);
        const matchTime = matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        const matchDateStr = matchDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) + " às " + matchTime;

        const tmpl = await resolveNotificationTemplate(
          "game_reminder",
          {
            teamA: g.homeTeamName ?? "Time A",
            teamB: g.awayTeamName ?? "Time B",
            matchDate: matchDateStr,
            minutesUntilGame: 60,
            poolName: pool.name,
          },
          {
            title: `⏰ Jogo em 1 hora — ${g.homeTeamName} × ${g.awayTeamName}`,
            body: `O jogo começa às ${matchTime}. Faça seu palpite no bolão "${pool.name}" antes que seja tarde!`,
          }
        );
        if (!tmpl.enabled) continue;

        for (const { userId } of members) {
          await createNotification({
            userId,
            poolId: pool.id,
            type: "game_reminder",
            title: tmpl.title,
            message: tmpl.body,
            actionUrl: `/pools/${pool.id}`,
            actionLabel: "Fazer palpite",
            priority: "high",
            category: "game_reminder",
          });
        }

        try {
          const { poolSponsors } = await import("../drizzle/schema");
          const { and: andOp, eq: eqOp } = await import("drizzle-orm");
          const [sponsor] = await db
            .select()
            .from(poolSponsors)
            .where(andOp(eqOp(poolSponsors.poolId, pool.id), eqOp(poolSponsors.isActive, true)))
            .limit(1);
          if (sponsor && (sponsor as any).sponsoredNotificationActive && (sponsor as any).sponsoredNotificationText) {
            const sponsorText = ((sponsor as any).sponsoredNotificationText as string)
              .replace("{bolao}", pool.name)
              .replace("{jogo}", `${g.homeTeamName} × ${g.awayTeamName}`)
              .replace("{hora}", matchTime);
            for (const { userId } of members) {
              await createNotification({
                userId,
                poolId: pool.id,
                type: "game_reminder",
                title: `⏰ Lembrete — ${pool.name}`,
                message: sponsorText,
                actionUrl: `/pool/${pool.slug}`,
                actionLabel: "Fazer palpite",
                priority: "normal",
                category: "game_reminder",
              });
            }
          }
        } catch (sponsorErr) {
          logger.warn({ poolId: pool.id, sponsorErr }, "[Email] Notificação patrocinada de lembrete falhou (não crítico)");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "[Email] Bet reminder scheduling error");
  }
}

export async function sendPlanExpiryWarnings(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();

    for (const daysLeft of [7, 1]) {
      const targetDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
      const targetStart = new Date(targetDate);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      const expiringPlans = await db
        .select({
          userId: userPlans.userId,
          expiresAt: userPlans.planExpiresAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(userPlans)
        .innerJoin(users, eq(users.id, userPlans.userId))
        .where(
          and(
            eq(userPlans.plan, "pro"),
            eq(userPlans.isActive, true),
            gte(userPlans.planExpiresAt, targetStart),
            lte(userPlans.planExpiresAt, targetEnd)
          )
        );

      for (const plan of expiringPlans) {
        if (!plan.userEmail) continue;

        const { subject, html } = templatePlanExpiring({
          name: plan.userName ?? "Usuário",
          daysLeft,
          expiresAt: plan.expiresAt
            ? new Date(plan.expiresAt as Date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "em breve",
        });

        await enqueueEmail({
          toUserId: plan.userId,
          toEmail: plan.userEmail,
          type: "plan_expiring",
          subject,
          html,
        });
      }

      logger.info({ count: expiringPlans.length, daysLeft }, "[Email] Queued plan expiry warnings");
    }
  } catch (err) {
    logger.error({ err }, "[Email] Plan expiry warning error");
  }
}
