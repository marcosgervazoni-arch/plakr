import { config } from "dotenv";
config();
import nodemailer from "nodemailer";

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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ctaButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},${GOLD2});color:#0B0F1A;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;letter-spacing:0.2px;">${text}</a>`;
}

function infoBox(content, color = GOLD) {
  return `<div style="background:${SURFACE2};border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">${content}</div>`;
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
                  <td>
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
          <tr>
            <td style="background:${SURFACE};padding:32px 32px 28px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#0D1120;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:12px;color:${MUTED2};text-align:center;line-height:1.6;">
                Plakr! — Onde todo mundo acha que entende de futebol.
              </p>
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

const name = "Marcos Gervazoni";
const firstName = esc(name).split(' ')[0];

const bubble1 = (text) => `
  <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
    <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,${GOLD},${GOLD2});display:flex;align-items:center;justify-content:center;font-size:16px;margin-right:12px;">🎙</div>
    <div style="background:${SURFACE2};border:1.5px solid ${GOLD};border-radius:0 12px 12px 12px;padding:14px 18px;max-width:480px;position:relative;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${GOLD};letter-spacing:0.8px;text-transform:uppercase;">Narrador 1</p>
      <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${text}</p>
    </div>
  </div>`;

const bubble2 = (text) => `
  <div style="display:flex;align-items:flex-start;justify-content:flex-end;margin-bottom:16px;">
    <div style="background:#0f1420;border:1.5px solid #3a4055;border-radius:12px 0 12px 12px;padding:14px 18px;max-width:480px;position:relative;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:0.8px;text-transform:uppercase;text-align:right;">Narrador 2</p>
      <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${text}</p>
    </div>
    <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:#1A2235;border:1.5px solid #3a4055;display:flex;align-items:center;justify-content:center;font-size:16px;margin-left:12px;">🎙</div>
  </div>`;

const html = baseTemplate("Bem-vindo ao Plakr!", `
  <h2 style="margin:0 0 24px;font-size:22px;font-weight:800;color:${TEXT};">Bem-vindo ao Plakr!, <span style="background:linear-gradient(135deg,${GOLD},${GOLD2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${firstName}</span>! 🏆</h2>

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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

try {
  await transporter.sendMail({
    from: `"Plakr!" <${process.env.SMTP_USER}>`,
    to: "marcos.gervazoni@gmail.com",
    subject: `${firstName}, você acabou de entrar no jogo. Bem-vindo ao Plakr! 🏆`,
    html,
  });
  console.log("✅ E-mail de boas-vindas enviado com sucesso!");
} catch (e) {
  console.error("❌ Erro ao enviar:", e.message);
}
