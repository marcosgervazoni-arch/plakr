/**
 * ApostAI — Serviço de E-mail
 * Usa a Manus Notification API (BUILT_IN_FORGE_API_URL) para envio de e-mails.
 * Templates HTML responsivos para: boas-vindas, lembrete de palpite,
 * resultado disponível, expiração de plano Pro e convite de bolão.
 */
import { ENV } from "./_core/env";
import { getDb, createNotification } from "./db";
import { resolveNotificationTemplate } from "./notificationTemplateHelper";
import { emailQueue, users, games, userPlans, pools, poolMembers } from "../drizzle/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";

// ─── HTML escape (S6: previne XSS em dados de usuário interpolados nos templates) ─
function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Brand colors ────────────────────────────────────────────────────────────
const BRAND = "#22c55e";
const BRAND_DARK = "#16a34a";
const BG = "#0a0a0a";
const SURFACE = "#111111";
const TEXT = "#f5f5f5";
const MUTED = "#a3a3a3";

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
            <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:28px 32px;border-bottom:1px solid #1f1f1f;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:${BRAND};letter-spacing:-0.5px;">Apost<span style="color:${TEXT};">AI</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:${MUTED};">Plataforma de Bolões Esportivos</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:${SURFACE};padding:32px 32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                Você está recebendo este e-mail porque tem uma conta no ApostAI.<br/>
                <a href="${ENV.appBaseUrl}" style="color:${BRAND};text-decoration:none;">Acessar plataforma</a>
                &nbsp;·&nbsp;
                <a href="${ENV.appBaseUrl}/settings/notifications" style="color:${MUTED};text-decoration:none;">Gerenciar notificações</a>
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

// ─── Button helper ────────────────────────────────────────────────────────────
function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:8px;">${text}</a>`;
}

// ─── Template: Boas-vindas ────────────────────────────────────────────────────
export function templateWelcome(name: string): { subject: string; html: string } {
  return {
    subject: "Bem-vindo ao ApostAI! 🏆",
    html: baseTemplate("Bem-vindo ao ApostAI", `
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">Olá, ${esc(name)}! 👋</h2>
      <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">Sua conta no ApostAI foi criada com sucesso. Agora você pode participar de bolões esportivos, fazer seus palpites e disputar o ranking com amigos.</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:600;color:${TEXT};">O que você pode fazer:</p>
        <p style="margin:0 0 8px;color:${MUTED};">✅ Entrar em bolões via link de convite ou código</p>
        <p style="margin:0 0 8px;color:${MUTED};">⚽ Fazer palpites nos jogos antes do prazo</p>
        <p style="margin:0 0 8px;color:${MUTED};">🏅 Acompanhar o ranking em tempo real</p>
        <p style="margin:0;color:${MUTED};">🎯 Criar seu próprio bolão (Plano Gratuito: 2 bolões, 50 participantes)</p>
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
  const urgency = opts.minutesLeft <= 30 ? "🚨 Urgente" : "⏰ Lembrete";
  return {
    subject: `${urgency}: Faça seu palpite em ${opts.homeTeam} x ${opts.awayTeam}`,
    html: baseTemplate("Lembrete de Palpite", `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT};">${urgency}: Palpite pendente!</h2>
      <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">Olá, ${esc(opts.name)}! O prazo para palpitar no jogo abaixo está se encerrando.</p>
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Bolão: ${esc(opts.poolName)}</p>
        <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:${TEXT};">${esc(opts.homeTeam)} <span style="color:${BRAND};">×</span> ${esc(opts.awayTeam)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Início: ${opts.matchTime}</p>
        <p style="margin:0;font-size:13px;color:${opts.minutesLeft <= 30 ? "#ef4444" : "#f59e0b"};font-weight:600;">⏱ ${opts.minutesLeft} minutos restantes para palpitar</p>
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
  const emoji = opts.pointsEarned >= 10 ? "🎯" : opts.pointsEarned >= 5 ? "✅" : "❌";
  return {
    subject: `${emoji} Resultado: ${opts.homeTeam} ${opts.homeScore}×${opts.awayScore} ${opts.awayTeam} — ${opts.pointsEarned}pts`,
    html: baseTemplate("Resultado do Jogo", `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT};">Resultado apurado! ${emoji}</h2>
      <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">Olá, ${esc(opts.name)}! O resultado do jogo foi registrado no bolão <strong style="color:${TEXT};">${esc(opts.poolName)}</strong>.</p>
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 12px;font-size:26px;font-weight:800;color:${TEXT};">${esc(opts.homeTeam)} <span style="color:${BRAND};">${opts.homeScore}×${opts.awayScore}</span> ${esc(opts.awayTeam)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Seu palpite: <strong style="color:${TEXT};">${opts.betDescription}</strong></p>
        <p style="margin:0;font-size:20px;font-weight:800;color:${opts.pointsEarned >= 10 ? BRAND : opts.pointsEarned >= 5 ? "#f59e0b" : "#ef4444"};">+${opts.pointsEarned} pontos</p>
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
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT};">${urgency} do Plano Pro</h2>
      <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">Olá, ${esc(opts.name)}! Seu Plano Pro expira em <strong style="color:#f59e0b;">${opts.expiresAt}</strong>. Renove agora para não perder o acesso às funcionalidades exclusivas.</p>
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:600;color:${TEXT};">O que você perde sem o Pro:</p>
        <p style="margin:0 0 8px;color:#ef4444;">❌ Bolões ilimitados (volta ao limite de 2)</p>
        <p style="margin:0 0 8px;color:#ef4444;">❌ Participantes ilimitados (volta ao limite de 50)</p>
        <p style="margin:0 0 8px;color:#ef4444;">❌ Campeonatos personalizados</p>
        <p style="margin:0;color:#ef4444;">❌ Registro de resultados próprios</p>
      </div>
      ${ctaButton("Renovar Plano Pro", `${ENV.appBaseUrl}/subscription`)}
    `),
  };
}

// ─── Template: Convite de bolão ───────────────────────────────────────────────
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
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT};">Você foi convidado! 🏆</h2>
      <p style="margin:0 0 20px;color:${MUTED};line-height:1.6;">Olá, ${esc(opts.inviteeName)}! <strong style="color:${TEXT};">${esc(opts.organizerName)}</strong> te convidou para participar do bolão abaixo.</p>
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${TEXT};">${esc(opts.poolName)}</p>
        <p style="margin:0 0 12px;font-size:13px;color:${MUTED};">${esc(opts.tournamentName)}</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">👥 ${opts.memberCount} participante${opts.memberCount !== 1 ? "s" : ""} já entraram</p>
      </div>
      ${ctaButton("Entrar no bolão", opts.inviteUrl)}
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED};">Este convite expira em 7 dias.</p>
    `),
  };
}

// ─── Sender via Manus Notification API ───────────────────────────────────────
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  type: string;
}): Promise<boolean> {
  try {
    const apiUrl = ENV.forgeApiUrl;
    const apiKey = ENV.forgeApiKey;

    if (!apiUrl || !apiKey) {
      console.warn("[Email] Manus API not configured, skipping email send");
      return false;
    }

    const res = await fetch(`${apiUrl}/v1/notifications/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Email] Failed to send (${opts.type}):`, err);
      return false;
    }

    console.log(`[Email] Sent (${opts.type}) to ${opts.to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Error sending (${opts.type}):`, err);
    return false;
  }
}

// ─── Queue helpers ────────────────────────────────────────────────────────────

/**
 * Enqueue an email for later sending (stored in email_queue table).
 * The cron job processes the queue every 5 minutes.
 */
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
    console.error("[Email] Failed to enqueue:", err);
  }
}

/**
 * Process pending emails from the queue (called by cron every 5 min).
 * Sends up to 50 emails per batch to avoid rate limiting.
 */
export async function processEmailQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();
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
      console.log(`[Email] Processed ${pending.length} emails from queue`);
    }
  } catch (err) {
    console.error("[Email] Queue processing error:", err);
  }
}

/**
 * Schedule bet reminder emails for all pools with games starting in ~1 hour.
 * Called by cron every 15 minutes.
 */
export async function scheduleBetReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const seventyFiveMinFromNow = new Date(now.getTime() + 75 * 60 * 1000);

    // Find games starting in 60–75 minutes that haven't been reminded yet
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

    console.log(`[Email] Found ${upcomingGames.length} games needing bet reminders`);

    for (const g of upcomingGames) {
      // Buscar bolões ativos que usam este torneio
      const activePools = await db
        .select({ id: pools.id, name: pools.name, slug: pools.slug })
        .from(pools)
        .where(and(eq(pools.tournamentId, g.tournamentId), eq(pools.status, "active")));

      for (const pool of activePools) {
        // Buscar membros ativos do bolão
        const members = await db
          .select({ userId: poolMembers.userId })
          .from(poolMembers)
          .where(and(eq(poolMembers.poolId, pool.id), eq(poolMembers.isBlocked, false)));

        const matchDate = new Date(g.matchDate as Date);
        const matchTime = matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        const matchDateStr = matchDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) + " às " + matchTime;

        // Resolver template personalizado (com fallback para texto padrão)
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
      }
    }
  } catch (err) {
    console.error("[Email] Bet reminder scheduling error:", err);
  }
}

/**
 * Send plan expiry warnings (7 days and 1 day before expiry).
 * Called by cron daily at 9:00 AM.
 */
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

      console.log(`[Email] Queued ${expiringPlans.length} plan expiry warnings (${daysLeft}d)`);
    }
  } catch (err) {
    console.error("[Email] Plan expiry warning error:", err);
  }
}
