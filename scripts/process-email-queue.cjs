/**
 * Script: processa a fila de e-mail pendente imediatamente.
 * Uso: node scripts/process-email-queue.cjs
 */
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
require("dotenv").config();

async function main() {
  const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });

  // Buscar e-mails pendentes
  const [pending] = await pool.query(
    "SELECT * FROM email_queue WHERE status = 'pending' AND attempts < 3 ORDER BY createdAt ASC LIMIT 10"
  );
  console.log(`E-mails pendentes: ${pending.length}`);

  if (pending.length === 0) {
    await pool.end();
    return;
  }

  // Configurar transporte SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM_NAME || "Plakr!";

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error("Variáveis SMTP não configuradas:", { smtpHost, smtpUser: !!smtpUser, smtpPass: !!smtpPass });
    await pool.end();
    return;
  }

  console.log(`SMTP: ${smtpHost}:${smtpPort} | From: ${smtpFrom} <${smtpUser}>`);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  for (const email of pending) {
    try {
      // Marcar como processando
      await pool.query(
        "UPDATE email_queue SET attempts = attempts + 1 WHERE id = ?",
        [email.id]
      );

      await transporter.sendMail({
        from: `"${smtpFrom}" <${smtpUser}>`,
        to: `"${email.toName}" <${email.toEmail}>`,
        subject: email.subject,
        html: email.htmlBody,
      });

      await pool.query(
        "UPDATE email_queue SET status = 'sent', sentAt = NOW() WHERE id = ?",
        [email.id]
      );
      console.log(`✅ Enviado para: ${email.toEmail} | Assunto: ${email.subject}`);
    } catch (e) {
      await pool.query(
        "UPDATE email_queue SET status = 'failed', errorMessage = ? WHERE id = ?",
        [e.message, email.id]
      );
      console.error(`❌ Falha ao enviar para ${email.toEmail}:`, e.message);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error("Erro fatal:", e.message);
  process.exit(1);
});
