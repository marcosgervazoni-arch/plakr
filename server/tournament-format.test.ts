/**
 * Testes unitários para inferTournamentFormat e inferTournamentFormatFromPhases
 */
import { describe, it, expect } from "vitest";
import { inferTournamentFormat, inferTournamentFormatFromPhases, KNOWN_LEAGUE_FORMATS } from "../shared/tournamentFormat";

describe("inferTournamentFormat", () => {
  // ── Overrides por ID conhecido ─────────────────────────────────────────────
  it("retorna groups_knockout para Copa do Mundo (leagueId=1) mesmo sem rounds", () => {
    expect(inferTournamentFormat([], 1)).toBe("groups_knockout");
  });

  it("retorna groups_knockout para Libertadores (leagueId=13) mesmo sem rounds", () => {
    expect(inferTournamentFormat([], 13)).toBe("groups_knockout");
  });

  it("retorna cup para Copa do Brasil (leagueId=73) mesmo sem rounds", () => {
    expect(inferTournamentFormat([], 73)).toBe("cup");
  });

  it("retorna league para Série A (leagueId=71) mesmo sem rounds", () => {
    expect(inferTournamentFormat([], 71)).toBe("league");
  });

  it("retorna league para Premier League (leagueId=39) mesmo sem rounds", () => {
    expect(inferTournamentFormat([], 39)).toBe("league");
  });

  // ── Detecção por rounds ────────────────────────────────────────────────────
  it("detecta groups_knockout quando tem Group Stage + Round of 16", () => {
    const rounds = ["Group Stage - 1", "Group Stage - 2", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
    expect(inferTournamentFormat(rounds)).toBe("groups_knockout");
  });

  it("detecta groups_knockout quando tem Group Stage sem mata-mata (API ainda não publicou)", () => {
    const rounds = ["Group Stage - 1", "Group Stage - 2", "Group Stage - 3"];
    expect(inferTournamentFormat(rounds)).toBe("groups_knockout");
  });

  it("detecta cup quando tem apenas mata-mata sem grupos", () => {
    const rounds = ["1/256-finals", "1/128-finals", "Round of 64", "Round of 32", "Quarter-finals", "Semi-finals", "Final"];
    expect(inferTournamentFormat(rounds)).toBe("cup");
  });

  it("detecta league quando tem apenas Regular Season", () => {
    const rounds = ["Regular Season - 1", "Regular Season - 2", "Regular Season - 38"];
    expect(inferTournamentFormat(rounds)).toBe("league");
  });

  it("detecta groups_knockout para Libertadores com rounds reais 2025", () => {
    const rounds = ["1st Round", "2nd Round", "3rd Round", "Group Stage - 1", "Group Stage - 2", "Group Stage - 3", "Group Stage - 4", "Group Stage - 5", "Group Stage - 6", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
    expect(inferTournamentFormat(rounds, 13)).toBe("groups_knockout");
  });

  it("detecta cup para Copa do Brasil com rounds reais 2025", () => {
    const rounds = ["1st Round", "2nd Round", "3rd Round", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
    expect(inferTournamentFormat(rounds, 73)).toBe("cup");
  });

  it("detecta cup para Copa do Brasil com rounds 2026 (1/256-finals)", () => {
    const rounds = ["1/256-finals", "1/128-finals", "Round of 128", "Round of 64", "Round of 32"];
    expect(inferTournamentFormat(rounds, 73)).toBe("cup");
  });

  it("não classifica Qualification Round como group_stage", () => {
    const rounds = ["Qualification Round 1", "Qualification Round 2", "Group Stage - 1"];
    // Tem Group Stage → groups_knockout
    expect(inferTournamentFormat(rounds)).toBe("groups_knockout");
  });

  it("fallback para league quando rounds são desconhecidos", () => {
    expect(inferTournamentFormat([])).toBe("league");
  });
});

describe("inferTournamentFormatFromPhases", () => {
  it("retorna groups_knockout quando tem group_stage + round_of_16", () => {
    expect(inferTournamentFormatFromPhases(["group_stage", "round_of_16", "quarter_finals", "semi_finals", "final"])).toBe("groups_knockout");
  });

  it("retorna groups_knockout quando tem apenas group_stage (mata-mata não importado ainda)", () => {
    expect(inferTournamentFormatFromPhases(["group_stage"])).toBe("groups_knockout");
  });

  it("retorna cup quando tem apenas fases eliminatórias", () => {
    expect(inferTournamentFormatFromPhases(["round_of_16", "quarter_finals", "semi_finals", "final"])).toBe("cup");
  });

  it("retorna league quando tem apenas regular_season", () => {
    expect(inferTournamentFormatFromPhases(["regular_season"])).toBe("league");
  });

  it("override por leagueId tem prioridade sobre fases", () => {
    // Libertadores (13) deve ser groups_knockout mesmo que só tenha regular_season no banco
    expect(inferTournamentFormatFromPhases(["regular_season"], 13)).toBe("groups_knockout");
  });

  it("Copa do Brasil (73) deve ser cup mesmo que tenha group_stage no banco", () => {
    // Isso não deveria acontecer, mas o override garante
    expect(inferTournamentFormatFromPhases(["group_stage"], 73)).toBe("cup");
  });
});

describe("KNOWN_LEAGUE_FORMATS", () => {
  it("contém as ligas brasileiras mais importantes", () => {
    expect(KNOWN_LEAGUE_FORMATS[71]).toBe("league");   // Série A
    expect(KNOWN_LEAGUE_FORMATS[72]).toBe("league");   // Série B
    expect(KNOWN_LEAGUE_FORMATS[73]).toBe("cup");      // Copa do Brasil
    expect(KNOWN_LEAGUE_FORMATS[13]).toBe("groups_knockout"); // Libertadores
    expect(KNOWN_LEAGUE_FORMATS[11]).toBe("groups_knockout"); // Sudamericana
  });

  it("contém as competições internacionais mais importantes", () => {
    expect(KNOWN_LEAGUE_FORMATS[1]).toBe("groups_knockout");  // Copa do Mundo
    expect(KNOWN_LEAGUE_FORMATS[2]).toBe("groups_knockout");  // Champions League
    expect(KNOWN_LEAGUE_FORMATS[39]).toBe("league");          // Premier League
  });
});
