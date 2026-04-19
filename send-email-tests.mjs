/**
 * Script de teste: envia um e-mail de cada tipo para validação visual.
 * Uso: node send-email-tests.mjs
 */
import { createRequire } from "module";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, ".env") });

const require = createRequire(import.meta.url);
const nodemailer = require("nodemailer");

const TO = "marcos.gervazoni@gmail.com";
const FROM_NAME = process.env.SMTP_FROM_NAME || "Plakr!";
const FROM_EMAIL = process.env.SMTP_USER;
const APP_URL = process.env.VITE_APP_BASE_URL || "https://plakr.io";

// ─── Brand colors ─────────────────────────────────────────────────────────────
const BG       = "#0B0F1A";
const SURFACE  = "#121826";
const SURFACE2 = "#1A2235";
const BORDER   = "rgba(255,255,255,0.08)";
const GOLD     = "#FFB800";
const GOLD2    = "#FF8A00";
const SUCCESS  = "#00FF88";
const ERROR    = "#FF3B3B";
const INFO     = "#00C2FF";
const TEXT     = "#F5F5F5";
const MUTED    = "#9CA3AF";
const MUTED2   = "#6B7280";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:${SURFACE};border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid ${BORDER};">
            <table width="100%"><tr>
              <td><span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;"><span style="color:${GOLD};">Plakr</span><span style="color:${TEXT};">!</span></span></td>
              <td align="right"><span style="font-size:11px;color:${MUTED2};letter-spacing:0.5px;text-transform:uppercase;">Bolões Esportivos</span></td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="background:${SURFACE};padding:32px 32px 28px;">${content}</td></tr>
        <tr>
          <td style="background:#0D1120;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
            <p style="margin:0 0 8px;font-size:12px;color:${MUTED2};text-align:center;">Você está recebendo este e-mail porque tem uma conta no Plakr!.</p>
            <p style="margin:0;font-size:12px;text-align:center;">
              <a href="${APP_URL}" style="color:${GOLD};text-decoration:none;font-weight:600;">Acessar plataforma</a>
              <span style="color:${MUTED2};margin:0 8px;">·</span>
              <a href="${APP_URL}/settings/notifications" style="color:${MUTED2};text-decoration:none;">Gerenciar notificações</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function ctaButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},${GOLD2});color:#0B0F1A;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;">${text}</a>`;
}

function divider() {
  return `<div style="height:1px;background:${BORDER};margin:24px 0;"></div>`;
}

function infoBox(content, color = GOLD) {
  return `<div style="background:${SURFACE2};border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">${content}</div>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────
const emails = [
  {
    label: "1. Magic Link",
    subject: "🔑 Seu link de acesso ao Plakr! chegou",
    html: baseTemplate("Acesso ao Plakr!", `
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:${TEXT};">Seu link de acesso chegou! 🔑</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! Clique no botão abaixo para entrar no Plakr! sem precisar de senha.</p>
      ${infoBox(`
        <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">⏱ Este link expira em <strong style="color:${GOLD};">15 minutos</strong> e só pode ser usado uma vez.</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail com segurança.</p>
      `, INFO)}
      <div style="margin-top:24px;">${ctaButton("✅ Entrar no Plakr!", APP_URL + "/magic-link/verify?token=EXEMPLO")}</div>
      ${divider()}
      <p style="margin:0;font-size:12px;color:${MUTED2};">Se o botão não funcionar, copie e cole o link no navegador.</p>
    `),
  },
  {
    label: "2. Boas-vindas",
    subject: "🏆 Bem-vindo ao Plakr!! Sua conta está pronta",
    html: baseTemplate("Bem-vindo ao Plakr!", `
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:${TEXT};">Olá, Marcos Gervazoni! 👋</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Sua conta no <strong style="color:${TEXT};">Plakr!</strong> foi criada com sucesso. Agora você pode participar de bolões esportivos, fazer seus palpites e disputar o ranking com amigos.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-weight:700;font-size:14px;color:${TEXT};">O que você pode fazer agora:</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">🏅 <strong style="color:${TEXT};">Entrar em bolões</strong> via link de convite ou código</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">⚽ <strong style="color:${TEXT};">Fazer palpites</strong> nos jogos antes do prazo</p>
        <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">📊 <strong style="color:${TEXT};">Acompanhar o ranking</strong> em tempo real</p>
        <p style="margin:0;color:${MUTED};font-size:13px;">🎯 <strong style="color:${TEXT};">Criar seu bolão</strong> (Plano Gratuito: 2 bolões, 50 participantes)</p>
      </div>
      ${ctaButton("Acessar minha conta", APP_URL)}
    `),
  },
  {
    label: "3. Lembrete de palpite (urgente)",
    subject: "🚨 Urgente: Faça seu palpite em Brasil × Argentina",
    html: baseTemplate("Lembrete de Palpite", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">🚨 Urgente: Palpite pendente!</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! O prazo para palpitar no jogo abaixo está se encerrando.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:11px;color:${MUTED2};text-transform:uppercase;letter-spacing:1px;">Bolão</p>
        <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:${GOLD};">WILD BEER Copa do Mundo/26</p>
        <p style="margin:0 0 16px;font-size:26px;font-weight:900;color:${TEXT};">Brasil <span style="color:${GOLD};">×</span> Argentina</p>
        <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Início: <strong style="color:${TEXT};">21h00 de hoje</strong></p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${ERROR};">⏱ 25 minutos restantes para palpitar</p>
      </div>
      ${ctaButton("Fazer meu palpite agora", APP_URL + "/pool/wild-beer-copa-26")}
    `),
  },
  {
    label: "4. Resultado disponível (acerto exato)",
    subject: "🎯 Resultado: Brasil 2×1 Argentina — 10pts",
    html: baseTemplate("Resultado do Jogo", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Resultado apurado! 🎯</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! O resultado do jogo foi registrado no bolão <strong style="color:${GOLD};">WILD BEER Copa do Mundo/26</strong>.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;border:1px solid ${BORDER};">
        <p style="margin:0 0 16px;font-size:28px;font-weight:900;color:${TEXT};">Brasil <span style="color:${GOLD};">2×1</span> Argentina</p>
        <div style="height:1px;background:${BORDER};margin:16px 0;"></div>
        <p style="margin:0 0 8px;font-size:13px;color:${MUTED};">Seu palpite: <strong style="color:${TEXT};">Brasil 2×1</strong></p>
        <p style="margin:0;font-size:32px;font-weight:900;color:${SUCCESS};">+10 pts</p>
      </div>
      ${ctaButton("Ver ranking do bolão", APP_URL + "/pool/wild-beer-copa-26")}
    `),
  },
  {
    label: "5. Expiração de plano Pro (7 dias)",
    subject: "⚠️ 7 dias restantes — Seu Plano Pro expira em breve",
    html: baseTemplate("Plano Pro Expirando", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">⚠️ 7 dias restantes do Plano Pro</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! Seu Plano Pro expira em <strong style="color:${GOLD};">26 de abril de 2026</strong>. Renove agora para não perder o acesso às funcionalidades exclusivas.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-weight:700;font-size:14px;color:${TEXT};">O que você perde sem o Pro:</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Bolões ilimitados (volta ao limite de 2)</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Participantes ilimitados (volta ao limite de 50)</p>
        <p style="margin:0 0 10px;font-size:13px;color:${ERROR};">❌ Campeonatos personalizados</p>
        <p style="margin:0;font-size:13px;color:${ERROR};">❌ Registro de resultados próprios</p>
      </div>
      ${ctaButton("Renovar Plano Pro", APP_URL + "/subscription")}
    `),
  },
  {
    label: "6. Convite de bolão (usuário existente)",
    subject: "🏆 Gerva te convidou para o bolão \"WILD BEER Copa do Mundo/26\"",
    html: baseTemplate("Convite de Bolão", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi convidado! 🏆</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! <strong style="color:${GOLD};">Gerva</strong> te convidou para participar do bolão abaixo.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${TEXT};">WILD BEER Copa do Mundo/26</p>
        <p style="margin:0 0 16px;font-size:13px;color:${MUTED};">Copa do Mundo FIFA 2026</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">👥 <strong style="color:${TEXT};">12</strong> participantes já entraram</p>
      </div>
      ${ctaButton("Entrar no bolão", APP_URL + "/pool-invite/TOKEN_EXEMPLO")}
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED2};">📅 Este convite expira em 7 dias.</p>
    `),
  },
  {
    label: "7. Convite externo (não-membro do Plakr!)",
    subject: "🏆 Gerva te convidou para o bolão \"WILD BEER Copa do Mundo/26\" no Plakr!",
    html: baseTemplate("Convite para bolão", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi convidado! 🏆</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;"><strong style="color:${GOLD};">Gerva</strong> te convidou para participar do bolão abaixo no <strong style="color:${TEXT};">Plakr!</strong> — a plataforma de bolões esportivos.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${TEXT};">WILD BEER Copa do Mundo/26</p>
        <p style="margin:0 0 16px;font-size:13px;color:${MUTED};">Copa do Mundo FIFA 2026</p>
        <p style="margin:0 0 10px;font-size:13px;color:${MUTED};">👥 <strong style="color:${TEXT};">12</strong> participantes já entraram</p>
        <p style="margin:0;font-size:13px;color:${SUCCESS};">✅ Entrada gratuita — faça seus palpites imediatamente após entrar!</p>
      </div>
      <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6;">Clique no botão abaixo para criar sua conta gratuita e entrar no bolão automaticamente. Leva menos de 1 minuto!</p>
      ${ctaButton("Criar conta e entrar no bolão", APP_URL + "/join/TOKEN_EXEMPLO")}
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED2};">📅 Este convite expira em 7 dias. Se você já tem conta no Plakr!, o mesmo link funcionará para fazer login e entrar no bolão.</p>
    `),
  },
  {
    label: "8. Membro adicionado manualmente",
    subject: "🎉 Você foi adicionado ao bolão \"WILD BEER Copa do Mundo/26\"",
    html: baseTemplate("Você entrou no bolão!", `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Você foi adicionado! 🎉</h2>
      <p style="margin:0 0 24px;color:${MUTED};line-height:1.6;">Olá, <strong style="color:${TEXT};">Marcos Gervazoni</strong>! <strong style="color:${GOLD};">Gerva</strong> adicionou você diretamente ao bolão abaixo.</p>
      <div style="background:${SURFACE2};border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${BORDER};">
        <p style="margin:0 0 12px;font-size:20px;font-weight:800;color:${TEXT};">WILD BEER Copa do Mundo/26</p>
        <p style="margin:0;font-size:13px;color:${SUCCESS};">✅ Você já está ativo e pode fazer seus palpites!</p>
      </div>
      ${ctaButton("Acessar o bolão", APP_URL + "/pool/wild-beer-copa-26")}
    `),
  },
];

// ─── Envio ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: parseInt(process.env.SMTP_PORT || "465") === 465,
  auth: {
    user: FROM_EMAIL,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

let success = 0;
let failed = 0;

for (const email of emails) {
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: TO,
      subject: `[TESTE ${email.label}] ${email.subject}`,
      html: email.html,
    });
    console.log(`✅ Enviado: ${email.label}`);
    success++;
    // Pequena pausa para não sobrecarregar o SMTP
    await new Promise(r => setTimeout(r, 800));
  } catch (err) {
    console.error(`❌ Falhou: ${email.label} — ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 Resultado: ${success} enviados, ${failed} falharam`);
