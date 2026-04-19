import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Corrigir role para 'member'
await conn.query(
  "UPDATE pool_members SET role = 'participant' WHERE poolId = 990007 AND userId IN (2580204, 2460616)"
);
console.log('✅ Role corrigido para member');

// 2. Enfileirar e-mails de cobrança Pix
const pixKey = '01074525027';
const poolName = 'Bolão WILD BEER Copa do Mundo/26';
const entryFee = 'R$ 50,00';
const poolUrl = 'https://plakr.io/pool/wildbeer';

const members = [
  { id: 2580204, name: 'Luiz Fernando Verner', email: 'luizfernando_verner@hotmail.com' },
  { id: 2460616, name: 'Vinicius Zolet',        email: 'vinii_sz@hotmail.com' },
];

for (const m of members) {
  const subject = `Você entrou no ${poolName} — Confirme seu pagamento`;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#121826;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr><td style="background:linear-gradient(135deg,#FFB800,#FF8A00);padding:32px 40px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#0B0F1A;letter-spacing:-1px;">Plakr!</div>
          <div style="font-size:14px;color:#0B0F1A;opacity:0.8;margin-top:4px;">Bolões Esportivos</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#F5F5F5;font-size:18px;font-weight:700;margin:0 0 8px;">Olá, ${m.name}! 👋</p>
          <p style="color:#9CA3AF;font-size:15px;margin:0 0 24px;">
            Você foi adicionado ao <strong style="color:#FFB800;">${poolName}</strong>.<br>
            Para confirmar sua participação, realize o pagamento da taxa de inscrição via Pix.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;border:1px solid #FFB800;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Valor da taxa</div>
              <div style="color:#00FF88;font-size:32px;font-weight:900;margin-bottom:16px;">${entryFee}</div>
              <div style="color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Chave Pix</div>
              <div style="background:#1E2A3A;border-radius:8px;padding:14px 20px;">
                <span style="color:#FFB800;font-size:20px;font-weight:700;letter-spacing:2px;">${pixKey}</span>
              </div>
              <div style="color:#9CA3AF;font-size:12px;margin-top:8px;">CPF do organizador</div>
            </td></tr>
          </table>
          <p style="color:#9CA3AF;font-size:13px;margin:0 0 24px;">
            Após realizar o pagamento, envie o comprovante para o organizador do bolão.<br>
            Sua participação será confirmada assim que o pagamento for aprovado.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${poolUrl}" style="display:inline-block;background:linear-gradient(135deg,#FFB800,#FF8A00);color:#0B0F1A;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Ver meu bolão →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#0B0F1A;padding:20px 40px;text-align:center;">
          <p style="color:#4B5563;font-size:12px;margin:0;">Plakr! · plakr.io · Bolões Esportivos</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await conn.query(
    'INSERT INTO email_queue (userId, toEmail, subject, htmlBody, status) VALUES (?, ?, ?, ?, ?)',
    [m.id, m.email, subject, html, 'pending']
  );
  console.log(`✅ E-mail enfileirado para: ${m.name} <${m.email}>`);
}

await conn.end();
console.log('Concluído!');
