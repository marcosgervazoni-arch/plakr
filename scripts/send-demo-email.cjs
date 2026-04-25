require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const GOLD = "#FFB800";
  const GOLD_DARK = "#FF8A00";
  const BG = "#0B0F1A";
  const SURFACE = "#121826";
  const TEXT = "#F5F5F5";
  const MUTED = "#8A9BB5";
  const BORDER = "#1E2A3A";

  const demoOtp = "483721";
  const demoLink = "https://plakr.io/magic-link/verify?token=EXEMPLO_DEMONSTRACAO";
  const name = "Marcos Gervazoni";

  const html = `<!DOCTYPE html>
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
              <div style="width:56px;height:56px;background:linear-gradient(135deg,${GOLD},${GOLD_DARK});border-radius:14px;display:inline-block;margin-bottom:20px;font-size:28px;line-height:56px;text-align:center;">🔑</div>
              <h2 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${TEXT};">Seu acesso chegou!</h2>
              <p style="margin:0 0 24px;color:${MUTED};line-height:1.7;font-size:15px;">
                Olá, <strong style="color:${TEXT};">${name}</strong>! Use o botão <strong style="color:${GOLD};">ou</strong> o código abaixo para entrar no Plakr! sem precisar de senha.
              </p>
              <!-- Aviso de demonstração -->
              <div style="background:#1a1200;border:1px solid ${GOLD};border-radius:10px;padding:12px 20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0;font-size:13px;color:${GOLD};">⚠️ Este é um e-mail de demonstração — o link e o código abaixo são fictícios.</p>
              </div>
              <!-- Botão CTA -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${demoLink}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},${GOLD_DARK});color:#0B0F1A;font-weight:800;font-size:16px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                  ✅ Entrar no Plakr!
                </a>
              </div>
              <!-- Separador -->
              <table width="100%" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid ${BORDER};"></td>
                  <td style="padding:0 12px;white-space:nowrap;font-size:12px;color:${MUTED};">ou use o código</td>
                  <td style="border-top:1px solid ${BORDER};"></td>
                </tr>
              </table>
              <!-- Código OTP em destaque -->
              <div style="background:${BG};border:2px solid ${GOLD};border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Código de acesso</p>
                <p style="margin:0;font-size:42px;font-weight:900;color:${GOLD};letter-spacing:10px;font-family:monospace;">${demoOtp}</p>
                <p style="margin:8px 0 0;font-size:11px;color:${MUTED};">Digite este código na tela do Plakr!</p>
              </div>
              <!-- Info box -->
              <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid ${GOLD};border-radius:10px;padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">⏰ O link e o código expiram em <strong style="color:${GOLD};">15 minutos</strong>.</p>
                <p style="margin:0;font-size:13px;color:${MUTED};">Se você não solicitou este acesso, ignore este e-mail.</p>
              </div>
              <!-- Link fallback -->
              <p style="margin:20px 0 0;font-size:12px;color:${MUTED};">
                Se o botão não funcionar, copie e cole este link no navegador:<br/>
                <a href="${demoLink}" style="color:${GOLD};word-break:break-all;font-size:11px;">${demoLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0D1220;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                Você está recebendo este e-mail porque solicitou acesso ao Plakr!.<br/>
                <a href="https://plakr.io" style="color:${GOLD};text-decoration:none;">Acessar plataforma</a>
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
</html>`;

  const info = await transporter.sendMail({
    from: `"Plakr!" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: 'marcos.gervazoni@gmail.com',
    subject: '🔑 [DEMO] Seu acesso ao Plakr! está aqui',
    html,
  });

  console.log('E-mail enviado:', info.messageId);
  console.log('Resposta SMTP:', info.response);
}

main().catch(console.error);
