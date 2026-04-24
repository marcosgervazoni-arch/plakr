/**
 * Script: cria usuário Vagner Silva, gera convite para o bolão Wild Beer e envia e-mail.
 */
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

async function main() {
  const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });

  const email = "vagnercorretor.imob@gmail.com";
  const name = "Vagner Silva";
  const poolId = 990007;
  const poolName = "Bolão WILD BEER Copa do Mundo/26";
  const poolSlug = "wildbeer";
  const ownerId = 1411418;

  // 1. Criar o usuário (se não existir)
  let userId;
  const [existing] = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
    [email]
  );
  if (existing.length > 0) {
    userId = existing[0].id;
    console.log("Usuário já existe. ID:", userId);
  } else {
    const openId = "email_" + crypto.randomBytes(16).toString("hex");
    const [result] = await pool.query(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [openId, name, email, "magic_link", "user"]
    );
    userId = result.insertId;
    console.log("Usuário criado! ID:", userId, "| Nome:", name);
  }

  // 2. Gerar token de convite (válido por 7 dias)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO pool_invites (token, poolId, invitedEmail, invitedBy, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",
    [token, poolId, email, ownerId, expiresAt]
  );
  const inviteUrl = `https://plakr.io/pools/${poolSlug}/join?token=${token}`;
  console.log("Link de convite gerado (válido 7 dias):", inviteUrl);

  // 3. Montar HTML do e-mail
  const GOLD = "#FFB800";
  const GOLD_DARK = "#FF8A00";
  const BG = "#0B0F1A";
  const SURFACE = "#121826";
  const TEXT = "#F5F5F5";
  const MUTED = "#6B7280";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${SURFACE};border-radius:12px;overflow:hidden;max-width:560px;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${GOLD},${GOLD_DARK});padding:32px;text-align:center;">
          <h1 style="margin:0;color:${BG};font-size:28px;font-weight:900;">Plakr!</h1>
          <p style="margin:8px 0 0;color:${BG};font-size:14px;opacity:0.8;">Plataforma de Boloes Esportivos</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 32px;">
          <h2 style="color:${TEXT};font-size:22px;margin:0 0 16px;">Ola, ${name}!</h2>
          <p style="color:#B0B8C8;font-size:15px;line-height:1.6;margin:0 0 8px;">
            Voce foi convidado para participar do bolao:
          </p>
          <p style="color:${GOLD};font-size:18px;font-weight:700;margin:0 0 24px;">
            ${poolName}
          </p>
          <p style="color:#B0B8C8;font-size:15px;line-height:1.6;margin:0 0 32px;">
            Clique no botao abaixo para aceitar o convite e entrar na disputa!
          </p>
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${inviteUrl}" style="background:linear-gradient(135deg,${GOLD},${GOLD_DARK});color:${BG};text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">
              Entrar no Bolao
            </a>
          </div>
          <p style="color:${MUTED};font-size:13px;text-align:center;margin:0;">
            Este link e valido por <strong>7 dias</strong>. Apos isso, solicite um novo convite ao organizador.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #1E2A3A;text-align:center;">
          <p style="color:${MUTED};font-size:12px;margin:0;">
            <a href="https://plakr.io" style="color:${GOLD};text-decoration:none;">Acessar plataforma</a>
            &nbsp;&middot;&nbsp;
            <span style="color:${MUTED};">plakr.io</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // 4. Enfileirar e-mail
  await pool.query(
    "INSERT INTO email_queue (userId, toEmail, toName, subject, htmlBody, status, attempts, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
    [userId, email, name, `Voce foi convidado para o ${poolName}!`, html, "pending", 0]
  );
  console.log("E-mail enfileirado!");

  // 5. Enviar imediatamente via SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: parseInt(process.env.SMTP_PORT || "465") === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "Plakr!"}" <${process.env.SMTP_USER}>`,
    to: `"${name}" <${email}>`,
    subject: `Voce foi convidado para o ${poolName}!`,
    html,
  });
  console.log("E-mail enviado com sucesso para:", email);

  // Marcar como enviado
  await pool.query(
    "UPDATE email_queue SET status = 'sent', sentAt = NOW() WHERE toEmail = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1",
    [email]
  );

  await pool.end();
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
