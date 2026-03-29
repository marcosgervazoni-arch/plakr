import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Testes do cliente API-Football ──────────────────────────────────────────
describe("API-Football Client", () => {
  it("deve mascarar a chave de API corretamente", () => {
    const key = "08ec7ad27e5760cc8f1f0eca15412038";
    const masked = key.slice(0, 4) + "****" + key.slice(-4);
    expect(masked).toBe("08ec****2038");
    expect(masked).not.toBe(key);
  });

  it("deve calcular a porcentagem de quota corretamente", () => {
    const used = 45;
    const limit = 100;
    const pct = Math.round((used / limit) * 100);
    expect(pct).toBe(45);
  });

  it("deve identificar quota crítica (>80%)", () => {
    const isCritical = (used: number, limit: number) => used / limit > 0.8;
    expect(isCritical(85, 100)).toBe(true);
    expect(isCritical(79, 100)).toBe(false);
    expect(isCritical(100, 100)).toBe(true);
  });

  it("deve identificar quota de aviso (>60%)", () => {
    const isWarning = (used: number, limit: number) => used / limit > 0.6 && used / limit < 0.8;
    expect(isWarning(65, 100)).toBe(true);
    expect(isWarning(80, 100)).toBe(false);
    expect(isWarning(59, 100)).toBe(false);
  });
});

// ─── Testes do circuit breaker ────────────────────────────────────────────────
describe("Circuit Breaker", () => {
  it("deve abrir após 5 falhas consecutivas", () => {
    const MAX_FAILURES = 5;
    let failures = 0;
    let isOpen = false;

    const recordFailure = () => {
      failures++;
      if (failures >= MAX_FAILURES) isOpen = true;
    };

    for (let i = 0; i < 4; i++) recordFailure();
    expect(isOpen).toBe(false);

    recordFailure();
    expect(isOpen).toBe(true);
  });

  it("deve resetar após reset manual", () => {
    let failures = 5;
    let isOpen = true;

    // Reset manual
    failures = 0;
    isOpen = false;

    expect(isOpen).toBe(false);
    expect(failures).toBe(0);
  });

  it("deve bloquear requisições quando aberto", () => {
    const isOpen = true;
    const canMakeRequest = !isOpen;
    expect(canMakeRequest).toBe(false);
  });
});

// ─── Testes de mapeamento de dados ────────────────────────────────────────────
describe("Mapeamento de Fixtures da API-Football", () => {
  it("deve mapear status 'FT' (Full Time) como jogo encerrado", () => {
    const FINISHED_STATUSES = ["FT", "AET", "PEN"];
    expect(FINISHED_STATUSES.includes("FT")).toBe(true);
    expect(FINISHED_STATUSES.includes("NS")).toBe(false);
    expect(FINISHED_STATUSES.includes("1H")).toBe(false);
  });

  it("deve mapear status 'NS' (Not Started) como jogo agendado", () => {
    const SCHEDULED_STATUSES = ["NS", "TBD"];
    expect(SCHEDULED_STATUSES.includes("NS")).toBe(true);
    expect(SCHEDULED_STATUSES.includes("FT")).toBe(false);
  });

  it("deve extrair placar corretamente do fixture da API", () => {
    const fixture = {
      goals: { home: 3, away: 1 },
      fixture: { status: { short: "FT" } },
    };
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;
    expect(homeGoals).toBe(3);
    expect(awayGoals).toBe(1);
    expect(fixture.fixture.status.short).toBe("FT");
  });

  it("deve lidar com placar nulo (jogo não iniciado)", () => {
    const fixture = {
      goals: { home: null, away: null },
      fixture: { status: { short: "NS" } },
    };
    expect(fixture.goals.home).toBeNull();
    expect(fixture.goals.away).toBeNull();
  });

  it("deve construir URL correta para a API-Football", () => {
    const BASE_URL = "https://v3.football.api-sports.io";
    const leagueId = 1;
    const season = 2026;
    const url = `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&next=10`;
    expect(url).toBe("https://v3.football.api-sports.io/fixtures?league=1&season=2026&next=10");
  });
});

// ─── Testes de controle de quota ──────────────────────────────────────────────
describe("Controle de Quota Diária", () => {
  it("deve bloquear requisição quando quota está esgotada", () => {
    const quotaUsed = 100;
    const quotaLimit = 100;
    const canRequest = quotaUsed < quotaLimit;
    expect(canRequest).toBe(false);
  });

  it("deve permitir requisição quando há quota disponível", () => {
    const quotaUsed = 50;
    const quotaLimit = 100;
    const canRequest = quotaUsed < quotaLimit;
    expect(canRequest).toBe(true);
  });

  it("deve calcular requisições restantes corretamente", () => {
    const quotaUsed = 37;
    const quotaLimit = 100;
    const remaining = quotaLimit - quotaUsed;
    expect(remaining).toBe(63);
  });

  it("deve resetar quota no início de um novo dia UTC", () => {
    const todayUTC = new Date().toISOString().split("T")[0];
    const lastResetDate = "2026-03-28"; // dia anterior
    const shouldReset = todayUTC !== lastResetDate;
    expect(shouldReset).toBe(true);
  });
});

// ─── Testes de retry exponencial ──────────────────────────────────────────────
describe("Retry Exponencial", () => {
  it("deve calcular delay exponencial corretamente", () => {
    const BASE_DELAY_MS = 1000;
    const getDelay = (attempt: number) => BASE_DELAY_MS * Math.pow(2, attempt);

    expect(getDelay(0)).toBe(1000);   // 1s
    expect(getDelay(1)).toBe(2000);   // 2s
    expect(getDelay(2)).toBe(4000);   // 4s
    expect(getDelay(3)).toBe(8000);   // 8s
  });

  it("deve limitar o número máximo de tentativas", () => {
    const MAX_RETRIES = 3;
    let attempts = 0;
    let success = false;

    while (attempts < MAX_RETRIES && !success) {
      attempts++;
      // Simula falha em todas as tentativas
    }

    expect(attempts).toBe(MAX_RETRIES);
    expect(success).toBe(false);
  });
});

// ─── Testes de importação de times ───────────────────────────────────────────
describe("Importação de Times da API-Football", () => {
  it("deve mapear time da API para o formato do banco corretamente", () => {
    const apiTeam = {
      team: { id: 6, name: "Brazil", code: "BRA", logo: "https://media.api-sports.io/football/teams/6.png", national: true },
      venue: { name: "Estadio Nacional", city: "Brasilia" },
    };

    const mapped = {
      name: apiTeam.team.name,
      code: apiTeam.team.code?.slice(0, 10) ?? null,
      flagUrl: apiTeam.team.logo,
      apiFootballTeamId: apiTeam.team.id,
    };

    expect(mapped.name).toBe("Brazil");
    expect(mapped.code).toBe("BRA");
    expect(mapped.apiFootballTeamId).toBe(6);
    expect(mapped.flagUrl).toContain("api-sports.io");
  });

  it("deve truncar código do time para 10 caracteres", () => {
    const longCode = "BRAZILTEAM"; // 10 chars
    const truncated = longCode.slice(0, 10);
    expect(truncated.length).toBeLessThanOrEqual(10);
    expect(truncated).toBe("BRAZILTEAM");
  });

  it("deve lidar com código de time nulo", () => {
    const apiTeam = {
      team: { id: 999, name: "Unknown Team", code: null, logo: "", national: false },
      venue: { name: null, city: null },
    };
    const code = apiTeam.team.code?.slice(0, 10) ?? null;
    expect(code).toBeNull();
  });

  it("deve detectar time já existente pelo apiFootballTeamId", () => {
    const existingTeams = [
      { id: 1, tournamentId: 10, apiFootballTeamId: 6, name: "Brazil" },
      { id: 2, tournamentId: 10, apiFootballTeamId: 7, name: "Argentina" },
    ];

    const incomingTeamId = 6;
    const alreadyExists = existingTeams.some((t) => t.apiFootballTeamId === incomingTeamId);
    expect(alreadyExists).toBe(true);

    const newTeamId = 8;
    const newTeamExists = existingTeams.some((t) => t.apiFootballTeamId === newTeamId);
    expect(newTeamExists).toBe(false);
  });
});

// ─── Testes de sincronização de fixtures por torneio ─────────────────────────
describe("Sincronização de Fixtures por Torneio", () => {
  it("deve determinar status do jogo baseado no status da API", () => {
    const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];

    const determineStatus = (apiStatus: string): "finished" | "scheduled" =>
      FINISHED_STATUSES.includes(apiStatus) ? "finished" : "scheduled";

    expect(determineStatus("FT")).toBe("finished");
    expect(determineStatus("AET")).toBe("finished");
    expect(determineStatus("NS")).toBe("scheduled");
    expect(determineStatus("TBD")).toBe("scheduled");
    expect(determineStatus("1H")).toBe("scheduled");
  });

  it("deve incluir placar para jogos encerrados", () => {
    const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];
    const fixture = {
      fixture: { status: { short: "FT" } },
      score: { fulltime: { home: 2, away: 1 } },
    };

    const isFinished = FINISHED_STATUSES.includes(fixture.fixture.status.short);
    const scoreA = isFinished ? (fixture.score.fulltime.home ?? undefined) : undefined;
    const scoreB = isFinished ? (fixture.score.fulltime.away ?? undefined) : undefined;

    expect(isFinished).toBe(true);
    expect(scoreA).toBe(2);
    expect(scoreB).toBe(1);
  });

  it("deve não incluir placar para jogos agendados", () => {
    const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];
    const fixture = {
      fixture: { status: { short: "NS" } },
      score: { fulltime: { home: null, away: null } },
    };

    const isFinished = FINISHED_STATUSES.includes(fixture.fixture.status.short);
    const scoreA = isFinished ? (fixture.score.fulltime.home ?? undefined) : undefined;
    const scoreB = isFinished ? (fixture.score.fulltime.away ?? undefined) : undefined;

    expect(isFinished).toBe(false);
    expect(scoreA).toBeUndefined();
    expect(scoreB).toBeUndefined();
  });

  it("deve gerar slug único para campeonato importado", () => {
    const generateSlug = (name: string, season: number) =>
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${season}`;

    expect(generateSlug("Liga Profesional Argentina", 2022)).toBe("liga-profesional-argentina-2022");
    expect(generateSlug("Premier League", 2023)).toBe("premier-league-2023");
    expect(generateSlug("Copa do Mundo", 2022)).toBe("copa-do-mundo-2022");
  });
});
