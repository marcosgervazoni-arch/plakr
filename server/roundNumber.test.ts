/**
 * roundNumber.test.ts
 * Testes para a lógica de importação e agrupamento por número de rodada (PRE-001)
 */
import { describe, it, expect } from "vitest";

// ── Helpers replicados da lógica de importação ────────────────────────────────

function parseRoundNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw.replace(/"/g, ""), 10);
  return n > 0 ? n : undefined;
}

function buildGroupKey(roundNumber: number | null | undefined, phase: string | null | undefined): string {
  if (roundNumber != null) return `round_${roundNumber}`;
  return phase ?? "group_stage";
}

function buildRoundLabel(key: string): string {
  if (key.startsWith("round_")) return `Rodada ${key.replace("round_", "")}`;
  return key;
}

// ── Testes de parseRoundNumber ────────────────────────────────────────────────

describe("parseRoundNumber", () => {
  it("retorna o número quando a string é válida", () => {
    expect(parseRoundNumber("5")).toBe(5);
    expect(parseRoundNumber("1")).toBe(1);
    expect(parseRoundNumber("38")).toBe(38);
  });

  it("retorna o número quando há aspas (formato CSV)", () => {
    expect(parseRoundNumber('"5"')).toBe(5);
    expect(parseRoundNumber('"12"')).toBe(12);
  });

  it("retorna undefined para string vazia", () => {
    expect(parseRoundNumber("")).toBeUndefined();
    expect(parseRoundNumber(undefined)).toBeUndefined();
  });

  it("retorna undefined para valores não numéricos", () => {
    expect(parseRoundNumber("abc")).toBeUndefined();
    expect(parseRoundNumber("0")).toBeUndefined();
    expect(parseRoundNumber("-1")).toBeUndefined();
  });
});

// ── Testes de buildGroupKey ───────────────────────────────────────────────────

describe("buildGroupKey", () => {
  it("usa roundNumber quando disponível", () => {
    expect(buildGroupKey(5, "Rodada 5")).toBe("round_5");
    expect(buildGroupKey(1, null)).toBe("round_1");
  });

  it("usa phase quando roundNumber é null", () => {
    expect(buildGroupKey(null, "Grupo A")).toBe("Grupo A");
    expect(buildGroupKey(undefined, "Semifinais")).toBe("Semifinais");
  });

  it("usa fallback group_stage quando ambos são null", () => {
    expect(buildGroupKey(null, null)).toBe("group_stage");
    expect(buildGroupKey(undefined, undefined)).toBe("group_stage");
  });
});

// ── Testes de buildRoundLabel ─────────────────────────────────────────────────

describe("buildRoundLabel", () => {
  it("formata corretamente chaves de rodada", () => {
    expect(buildRoundLabel("round_5")).toBe("Rodada 5");
    expect(buildRoundLabel("round_1")).toBe("Rodada 1");
    expect(buildRoundLabel("round_38")).toBe("Rodada 38");
  });

  it("retorna a chave original para fases não numéricas", () => {
    expect(buildRoundLabel("Grupo A")).toBe("Grupo A");
    expect(buildRoundLabel("group_stage")).toBe("group_stage");
    expect(buildRoundLabel("Semifinais")).toBe("Semifinais");
  });
});

// ── Testes de agrupamento por rodada ─────────────────────────────────────────

describe("agrupamento por roundNumber", () => {
  const mockGames = [
    { id: 1, roundNumber: 1, phase: "Rodada 1", matchDate: new Date("2026-04-05") },
    { id: 2, roundNumber: 1, phase: "Rodada 1", matchDate: new Date("2026-04-06") },
    { id: 3, roundNumber: 2, phase: "Rodada 2", matchDate: new Date("2026-04-12") },
    { id: 4, roundNumber: 2, phase: "Rodada 2", matchDate: new Date("2026-04-13") },
    { id: 5, roundNumber: 3, phase: "Rodada 3", matchDate: new Date("2026-04-19") },
  ];

  it("detecta corretamente que todos os jogos têm roundNumber", () => {
    const allHaveRound = mockGames.every((g) => g.roundNumber != null);
    expect(allHaveRound).toBe(true);
  });

  it("agrupa corretamente por roundNumber", () => {
    const groups = new Map<string, typeof mockGames>();
    mockGames.forEach((g) => {
      const key = buildGroupKey(g.roundNumber, g.phase);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    expect(groups.size).toBe(3);
    expect(groups.get("round_1")?.length).toBe(2);
    expect(groups.get("round_2")?.length).toBe(2);
    expect(groups.get("round_3")?.length).toBe(1);
  });

  it("ordena grupos por número de rodada crescente", () => {
    const groups = new Map<string, typeof mockGames>();
    mockGames.forEach((g) => {
      const key = buildGroupKey(g.roundNumber, g.phase);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      const na = parseInt(a.replace("round_", ""), 10);
      const nb = parseInt(b.replace("round_", ""), 10);
      return na - nb;
    });
    expect(sorted[0][0]).toBe("round_1");
    expect(sorted[1][0]).toBe("round_2");
    expect(sorted[2][0]).toBe("round_3");
  });

  it("não agrupa por roundNumber quando algum jogo não tem o campo", () => {
    const mixedGames = [
      { id: 1, roundNumber: 1, phase: "Rodada 1" },
      { id: 2, roundNumber: null, phase: "Rodada 2" },
    ];
    const allHaveRound = mixedGames.every((g) => g.roundNumber != null);
    expect(allHaveRound).toBe(false);
  });
});
