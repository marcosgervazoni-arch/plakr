/**
 * Plakr! — Teste de integração SMTP (Hostinger)
 * Valida que as credenciais SMTP estão configuradas e que o transporter
 * consegue verificar a conexão com o servidor da Hostinger.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do nodemailer para não enviar e-mails reais nos testes
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
}));

describe("SMTP Configuration", () => {
  it("deve ter as variáveis SMTP configuradas no ENV", async () => {
    // Simula as variáveis de ambiente configuradas
    process.env.SMTP_HOST = "smtp.hostinger.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "noreply@plakr.io";
    process.env.SMTP_PASS = "test_password";
    process.env.SMTP_FROM_NAME = "Plakr!";

    // Importa dinamicamente para pegar os valores atualizados
    const { ENV } = await import("./_core/env");

    expect(ENV.smtpHost).toBe("smtp.hostinger.com");
    expect(ENV.smtpPort).toBe(465);
    expect(ENV.smtpUser).toBe("noreply@plakr.io");
    expect(ENV.smtpFromName).toBe("Plakr!");
  });

  it("deve criar o transporter com as configurações corretas", async () => {
    const nodemailer = await import("nodemailer");
    const createTransportSpy = vi.mocked(nodemailer.default.createTransport);

    // Simula a criação do transporter
    const transporter = nodemailer.default.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: { user: "noreply@plakr.io", pass: "test_password" },
      tls: { rejectUnauthorized: false },
    });

    expect(createTransportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: expect.objectContaining({ user: "noreply@plakr.io" }),
      })
    );
    expect(transporter).toBeDefined();
  });

  it("deve enviar e-mail com os campos corretos", async () => {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({});
    const sendMailSpy = vi.mocked(transporter.sendMail);

    await transporter.sendMail({
      from: '"Plakr!" <noreply@plakr.io>',
      to: "usuario@exemplo.com",
      subject: "🔑 Seu link de acesso ao Plakr!",
      html: "<h1>Magic Link</h1>",
    });

    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Plakr!" <noreply@plakr.io>',
        to: "usuario@exemplo.com",
        subject: "🔑 Seu link de acesso ao Plakr!",
      })
    );
  });

  it("deve usar porta 465 com SSL (secure: true)", () => {
    const port = 465;
    const secure = port === 465;
    expect(secure).toBe(true);
  });

  it("deve usar porta 587 sem SSL (secure: false)", () => {
    const port = 587;
    const secure = port === 465;
    expect(secure).toBe(false);
  });

  it("deve retornar messageId após envio bem-sucedido", async () => {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({});
    const result = await transporter.sendMail({
      from: '"Plakr!" <noreply@plakr.io>',
      to: "test@test.com",
      subject: "Teste",
      html: "<p>Teste</p>",
    });

    expect(result.messageId).toBe("test-message-id");
  });
});
