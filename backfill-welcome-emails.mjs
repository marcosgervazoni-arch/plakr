/**
 * Backfill: Enviar e-mail de boas-vindas para usuários que não receberam
 * Versão 2: balões de fala com table-based layout (compatível com Gmail/Outlook)
 */
import { createConnection } from "mysql2/promise";
import nodemailer from "nodemailer";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);

const GOLD = "#FFB800";
const GOLD2 = "#FF8A00";
const BG = "#0B0F1A";
const SURFACE = "#121826";
const SURFACE2 = "#1A2235";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F5F5F5";
const MUTED = "#9CA3AF";
const MUTED2 = "#6B7280";

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ctaButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background:${GOLD};color:#0B0F1A;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;letter-spacing:0.2px;">${text}</a>`;
}

function infoBox(content, color = GOLD) {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
    <tr>
      <td style="background:${SURFACE2};border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;">${content}</td>
    </tr>
  </table>`;
}

function baseTemplate(title, content) {
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
          <tr>
            <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid ${BORDER};">
              <table width="100%">
                <tr>
                  <td><span style="font-size:24px;font-weight:900;color:${GOLD};letter-spacing:-0.5px;">Plakr!</span></td>
                  <td align="right"><span style="font-size:11px;color:${MUTED2};letter-spacing:0.5px;text-transform:uppercase;">Bolões Esportivos</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${SURFACE};padding:32px 32px 28px;">${content}</td>
          </tr>
          <tr>
            <td style="background:#0D1120;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:12px;color:${MUTED2};text-align:center;line-height:1.6;">Plakr! — Onde todo mundo acha que entende de futebol.</p>
              <p style="margin:0;font-size:12px;text-align:center;">
                <a href="https://plakr.io" style="color:${GOLD};text-decoration:none;font-weight:600;">Acessar plataforma</a>
                <span style="color:${MUTED2};margin:0 8px;">·</span>
                <a href="https://plakr.io/settings/notifications" style="color:${MUTED2};text-decoration:none;">Gerenciar notificações</a>
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

// Balão Narrador 1 — esquerda, borda dourada (table-based, compatível com Gmail)
function bubble1(text) {
  return `
  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
    <tr>
      <td valign="top" width="48" style="padding-right:12px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="36" height="36" align="center" valign="middle"
            style="width:36px;height:36px;border-radius:50%;background:${GOLD};font-size:18px;text-align:center;line-height:36px;">🎙</td>
        </tr></table>
      </td>
      <td valign="top">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="background:${SURFACE2};border:1.5px solid ${GOLD};border-radius:0 12px 12px 12px;padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${GOLD};letter-spacing:0.8px;text-transform:uppercase;">Narrador 1</p>
            <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${text}</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>`;
}

// Balão Narrador 2 — direita, borda cinza (table-based, compatível com Gmail)
function bubble2(text) {
  return `
  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
    <tr>
      <td valign="top">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="background:#0f1420;border:1.5px solid #3a4055;border-radius:12px 0 12px 12px;padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:0.8px;text-transform:uppercase;text-align:right;">Narrador 2</p>
            <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${text}</p>
          </td>
        </tr></table>
      </td>
      <td valign="top" width="48" style="padding-left:12px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="36" height="36" align="center" valign="middle"
            style="width:36px;height:36px;border-radius:50%;background:#1A2235;border:1.5px solid #3a4055;font-size:18px;text-align:center;line-height:36px;">🎙</td>
        </tr></table>
      </td>
    </tr>
  </table>`;
}

function buildWelcomeEmail(name, email) {
  const firstName = esc(name || email.split('@')[0]).split(' ')[0];

  const html = baseTemplate("Bem-vindo ao Plakr!", `
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:800;color:${TEXT};">Bem-vindo ao Plakr!, <span style="color:${GOLD};">${firstName}</span>! 🏆</h2>

    ${bubble1(`GEEENTE! Olha quem chegou! <strong>${firstName}</strong> acabou de criar conta no Plakr! e eu já tô vibrando aqui!`)}

    ${bubble2(`Calma, calma... Deixa eu ver o histórico desse apostador primeiro.`)}

    ${bubble1(`Histórico? Cara, ele acabou de chegar! Dá uma chance!`)}

    ${bubble2(`Tá bom. <strong>${firstName}</strong>, seja bem-vindo. Aqui no Plakr! a gente faz bolão de verdade — com placar, pontuação, ranking e aquela pressão gostosa de estar perdendo pro seu chefe na última rodada.`)}

    ${bubble1(`E o melhor? Você pode criar o seu próprio bolão agora mesmo. Chama a galera, define as regras e vira o organizador que todo mundo ama odiar.`)}

    ${infoBox(`
      <p style="margin:0 0 6px;font-size:13px;color:${TEXT};font-weight:700;">Seu próximo passo:</p>
      <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">Explore os bolões disponíveis, entre em um que te chamaram ou crie o seu. O apito já tocou.</p>
    `, GOLD)}

    <div style="margin-top:24px;text-align:center;">
      ${ctaButton("Entrar em campo →", "https://plakr.io")}
    </div>
  `);

  return {
    subject: `${firstName}, você acabou de entrar no jogo. Bem-vindo ao Plakr! 🏆`,
    html,
  };
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

// Buscar apenas o marcos.gervazoni (welcomeEmailSent = 0 após reset manual)
// Para reenviar para todos: remover o AND email = '...'
const [rows] = await conn.execute(
  "SELECT id, name, email FROM users WHERE email = 'marcos.gervazoni@gmail.com' ORDER BY createdAt ASC"
);

console.log(`📋 Enviando para ${rows.length} usuário(s)\n`);

let sent = 0;
let failed = 0;

for (const user of rows) {
  try {
    const { subject, html } = buildWelcomeEmail(user.name, user.email);
    await transporter.sendMail({
      from: `"Plakr!" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `[v2 corrigido] ${subject}`,
      html,
    });
    console.log(`✅ [${++sent}] ${user.email} (${user.name || 'sem nome'})`);
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.error(`❌ Falha para ${user.email}: ${e.message}`);
    failed++;
  }
}

await conn.end();
console.log(`\n📊 Resultado: ${sent} enviados, ${failed} falhas`);
