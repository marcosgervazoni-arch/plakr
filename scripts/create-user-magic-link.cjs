/**
 * Script: cria usuário manualmente e enfileira magic link de acesso.
 * Uso: node scripts/create-user-magic-link.cjs
 */
const mysql = require("mysql2/promise");
const crypto = require("crypto");
require("dotenv").config();

async function main() {
  const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });
  const email = "jevefutsal02@gmail.com";
  const name = "Jeverton Candido";

  // 1. Criar o usuário
  const openId = "email_" + crypto.randomBytes(16).toString("hex");
  const [result] = await pool.query(
    "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
    [openId, name, email, "magic_link", "user"]
  );
  const userId = result.insertId;
  console.log("Usuário criado! ID:", userId, "| Nome:", name, "| E-mail:", email);

  // 2. Gerar magic link (válido por 24h)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO magic_links (email, token, returnPath, expiresAt, createdAt) VALUES (?, ?, ?, ?, NOW())",
    [email, token, "/dashboard", expiresAt]
  );
  const magicUrl = "https://plakr.io/magic-link/verify?token=" + token;
  console.log("Magic link gerado (válido 24h):", magicUrl);

  // 3. Montar HTML do e-mail
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#121826;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#FFB800,#FF8A00);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#0B0F1A;font-size:28px;font-weight:900;">Plakr!</h1>
          <p style="margin:8px 0 0;color:#0B0F1A;font-size:14px;">Plataforma de Boloes Esportivos</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">Ola, ${name}!</h2>
          <p style="color:#B0B8C8;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Sua conta no <strong style="color:#FFB800;">Plakr!</strong> foi criada com sucesso.<br>
            Clique no botao abaixo para acessar a plataforma:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${magicUrl}" style="background:linear-gradient(135deg,#FFB800,#FF8A00);color:#0B0F1A;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">
              Acessar o Plakr!
            </a>
          </div>
          <p style="color:#6B7280;font-size:13px;text-align:center;margin:0;">
            Este link e valido por <strong>24 horas</strong>. Apos isso, acesse <a href="https://plakr.io" style="color:#FFB800;">plakr.io</a> e solicite um novo link.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #1E2A3A;text-align:center;">
          <p style="color:#4B5563;font-size:12px;margin:0;">
            <a href="https://plakr.io" style="color:#FFB800;text-decoration:none;">Acessar plataforma</a>
            &nbsp;&middot;&nbsp;
            <span style="color:#4B5563;">plakr.io</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // 4. Enfileirar o e-mail
  await pool.query(
    "INSERT INTO email_queue (userId, toEmail, toName, subject, htmlBody, status, attempts, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
    [userId, email, name, "Seu acesso ao Plakr! esta pronto", html, "pending", 0]
  );
  console.log("E-mail enfileirado com sucesso!");
  console.log("O worker de e-mail vai processar e enviar em instantes.");

  await pool.end();
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
