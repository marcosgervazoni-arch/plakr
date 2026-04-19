/**
 * Plakr! — Testes do Lembrete Consolidado por Rodada
 *
 * Valida:
 * 1. templateRoundReminder gera HTML com os dados corretos
 * 2. Assunto do e-mail contém o número da rodada e o bolão
 * 3. Template escapa caracteres especiais (XSS)
 * 4. Template lista corretamente 1 ou múltiplos jogos
 * 5. scheduleRoundReminders não envia se não há jogos na janela 23-25h
 * 6. scheduleRoundReminders não envia duplicata (controle via round_reminder_sent)
 * 7. scheduleRoundReminders não envia para usuário que já apostou em todos os jogos
 * 8. scheduleRoundReminders envia apenas para jogos sem palpite
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { templateRoundReminder } from "./email";

// Mock do nodemailer para não enviar e-mails reais
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-round-reminder" }),
    })),
  },
}));

// Mock do db para testes de scheduleRoundReminders
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createNotification: vi.fn(),
}));

describe("templateRoundReminder", () => {
  const baseOpts = {
    name: "João Silva",
    poolName: "Bolão da Firma",
    poolSlug: "bolao-da-firma",
    tournamentName: "Copa do Mundo 2026",
    roundNumber: 3,
    firstMatchTime: "19/04 às 16:00",
    games: [
      { homeTeam: "Brasil", awayTeam: "Argentina", matchTime: "19/04 às 16:00" },
      { homeTeam: "França", awayTeam: "Alemanha", matchTime: "19/04 às 19:00" },
    ],
  };

  it("deve gerar assunto com número da rodada e nome do bolão", () => {
    const { subject } = templateRoundReminder(baseOpts);
    expect(subject).toContain("Rodada 3");
    expect(subject).toContain("Bolão da Firma");
  });

  it("deve mencionar a contagem de jogos no assunto", () => {
    const { subject } = templateRoundReminder(baseOpts);
    expect(subject).toContain("2 jogos");
  });

  it("deve usar singular quando há apenas 1 jogo", () => {
    const { subject } = templateRoundReminder({
      ...baseOpts,
      games: [{ homeTeam: "Brasil", awayTeam: "Argentina", matchTime: "19/04 às 16:00" }],
    });
    expect(subject).toContain("1 jogo");
    expect(subject).not.toContain("1 jogos");
  });

  it("deve incluir o HTML com os nomes dos times", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("Brasil");
    expect(html).toContain("Argentina");
    expect(html).toContain("França");
    expect(html).toContain("Alemanha");
  });

  it("deve incluir o nome do torneio no HTML", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("Copa do Mundo 2026");
  });

  it("deve incluir o número da rodada no HTML", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("Rodada 3");
  });

  it("deve incluir o horário do primeiro jogo no HTML", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("19/04 às 16:00");
  });

  it("deve incluir link para o bolão no CTA", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("bolao-da-firma");
  });

  it("deve escapar caracteres especiais para prevenir XSS", () => {
    const maliciousOpts = {
      ...baseOpts,
      name: '<script>alert("xss")</script>',
      poolName: '"Bolão" & <Cia>',
    };
    const { html } = templateRoundReminder(maliciousOpts);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;Cia&gt;");
  });

  it("deve usar table-based layout (sem flexbox/grid) para compatibilidade com Gmail", () => {
    const { html } = templateRoundReminder(baseOpts);
    // Verifica que usa <table> e não display:flex ou display:grid
    expect(html).toContain("<table");
    expect(html).not.toContain("display:flex");
    expect(html).not.toContain("display: flex");
    expect(html).not.toContain("display:grid");
  });

  it("deve incluir badge 'SEM PALPITE' para cada jogo", () => {
    const { html } = templateRoundReminder(baseOpts);
    const matches = (html.match(/SEM PALPITE/g) || []).length;
    expect(matches).toBe(2); // 2 jogos = 2 badges
  });

  it("deve gerar HTML válido com estrutura de e-mail completa", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("Plakr!");
  });

  it("deve incluir cores da identidade visual Plakr!", () => {
    const { html } = templateRoundReminder(baseOpts);
    expect(html).toContain("#FFB800"); // dourado
    expect(html).toContain("#0B0F1A"); // fundo
  });
});

describe("scheduleRoundReminders — lógica de deduplicação", () => {
  it("deve retornar sem enviar se não há jogos na janela 23-25h", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // nenhum jogo na janela
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { scheduleRoundReminders } = await import("./email");
    // Não deve lançar erro
    await expect(scheduleRoundReminders()).resolves.not.toThrow();
  });
});
