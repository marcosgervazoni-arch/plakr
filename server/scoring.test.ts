/**
 * Testes do sistema de pontuação ApostAI
 * Baseados no documento SISTEMA-PONTUACAO-APOSTAI.md
 *
 * Configuração padrão (valores do documento):
 *   Placar Exato:       10 pts
 *   Resultado Correto:   5 pts
 *   Total de Gols:       3 pts
 *   Diferença de Gols:   3 pts
 *   Gols de um Time:     2 pts
 *   Goleada:             5 pts
 *   Zebra:               1 pt  (threshold >= 75%, empate NÃO conta)
 */

import { describe, it, expect } from "vitest";
import {
  calculateBetScore,
  calculateZebraContext,
  type ScoringRules,
  type ZebraContext,
} from "./scoring";

// ─── CONFIGURAÇÃO PADRÃO ─────────────────────────────────────────────────────

const DEFAULT_RULES: ScoringRules = {
  exactScorePoints: 10,
  correctResultPoints: 5,
  totalGoalsPoints: 3,
  goalDiffPoints: 3,
  oneTeamGoalsPoints: 2,
  landslidePoints: 5,
  zebraPoints: 1,
  zebraThreshold: 75,
  zebraCountDraw: false,
  zebraEnabled: true,
};

const NO_ZEBRA_CTX: ZebraContext = {
  isZebraGame: false,
  betterTeam: "A",
  favoriteWon: true,
};

// ─── HELPER ──────────────────────────────────────────────────────────────────

function score(
  predA: number,
  predB: number,
  realA: number,
  realB: number,
  rules: ScoringRules = DEFAULT_RULES,
  zebraCtx: ZebraContext = NO_ZEBRA_CTX
) {
  return calculateBetScore(predA, predB, realA, realB, rules, zebraCtx);
}

// ─── 1. PLACAR EXATO ─────────────────────────────────────────────────────────

describe("Critério 1 — Placar Exato (10 pts)", () => {
  it("acerta o placar exato 2x1", () => {
    const r = score(2, 1, 2, 1);
    expect(r.resultType).toBe("exact");
    expect(r.pointsExactScore).toBe(10);
  });

  it("acerta o placar exato 0x0", () => {
    const r = score(0, 0, 0, 0);
    expect(r.resultType).toBe("exact");
    expect(r.pointsExactScore).toBe(10);
  });

  it("acerta o placar exato 3x3", () => {
    const r = score(3, 3, 3, 3);
    expect(r.resultType).toBe("exact");
    expect(r.pointsExactScore).toBe(10);
  });

  it("nao ganha placar exato quando erra o resultado", () => {
    const r = score(2, 0, 1, 2);
    expect(r.pointsExactScore).toBe(0);
  });
});

// ─── 2. RESULTADO CORRETO ────────────────────────────────────────────────────

describe("Critério 2 — Resultado Correto (5 pts, nao acumulavel com Placar Exato)", () => {
  it("acerta o resultado vitoria do time A mas erra o placar", () => {
    const r = score(3, 0, 2, 1);
    expect(r.resultType).toBe("correct_result");
    expect(r.pointsCorrectResult).toBe(5);
    expect(r.pointsExactScore).toBe(0);
  });

  it("acerta o resultado empate mas erra o placar", () => {
    const r = score(1, 1, 0, 0);
    expect(r.resultType).toBe("correct_result");
    expect(r.pointsCorrectResult).toBe(5);
  });

  it("acerta o resultado vitoria do time B mas erra o placar", () => {
    const r = score(0, 2, 1, 3);
    expect(r.resultType).toBe("correct_result");
    expect(r.pointsCorrectResult).toBe(5);
  });

  it("acumula resultado correto com placar exato (10+5=15 com valores padrao)", () => {
    const r = score(2, 1, 2, 1);
    // Placar exato E resultado correto sao cumulativos conforme o documento
    expect(r.pointsCorrectResult).toBe(5);
    expect(r.pointsExactScore).toBe(10);
    expect(r.total).toBeGreaterThanOrEqual(15);
  });

  it("erra o resultado — 0 pts de resultado", () => {
    const r = score(2, 0, 0, 1);
    expect(r.resultType).toBe("wrong");
    expect(r.pointsCorrectResult).toBe(0);
    expect(r.pointsExactScore).toBe(0);
  });
});

// ─── 3. TOTAL DE GOLS ────────────────────────────────────────────────────────

describe("Critério 3 — Total de Gols (3 pts)", () => {
  it("nao ganha total de gols quando erra o resultado (2+1=3, real 1+2=3, mas resultado diferente)", () => {
    // Criterio 3 requer resultado correto: pred A vence, real B vence => resultado errado
    const r = score(2, 1, 1, 2);
    expect(r.pointsTotalGoals).toBe(0);
    expect(r.resultType).toBe("wrong");
  });

  it("acerta o total de gols com placar exato (acumula)", () => {
    const r = score(2, 1, 2, 1);
    expect(r.pointsTotalGoals).toBe(3);
    expect(r.pointsExactScore).toBe(10);
  });

  it("nao ganha total de gols quando erra (2+1=3, real 2+2=4)", () => {
    const r = score(2, 1, 2, 2);
    expect(r.pointsTotalGoals).toBe(0);
  });

  it("acerta total de gols 0+0=0", () => {
    const r = score(0, 0, 0, 0);
    expect(r.pointsTotalGoals).toBe(3);
  });
});

// ─── 4. DIFERENÇA DE GOLS ────────────────────────────────────────────────────

describe("Critério 4 — Diferença de Gols (3 pts)", () => {
  it("acerta a diferença de gols (3-1=2, real 2-0=2)", () => {
    const r = score(3, 1, 2, 0);
    expect(r.pointsGoalDiff).toBe(3);
  });

  it("acerta a diferença de gols com placar exato (acumula)", () => {
    const r = score(2, 1, 2, 1);
    expect(r.pointsGoalDiff).toBe(3);
    expect(r.pointsExactScore).toBe(10);
  });

  it("acerta diferença de gols em empate (0-0=0, real 1-1=0)", () => {
    const r = score(0, 0, 1, 1);
    expect(r.pointsGoalDiff).toBe(3);
  });

  it("nao ganha diferença quando erra (2-1=1, real 3-0=3)", () => {
    const r = score(2, 1, 3, 0);
    expect(r.pointsGoalDiff).toBe(0);
  });
});

// ─── 5. GOLS DE UM TIME ──────────────────────────────────────────────────────

describe("Critério 5 — Gols de um Time (2 pts por time acertado)", () => {
  it("acerta os gols do time A (pred 2x0, real 2x1)", () => {
    const r = score(2, 0, 2, 1);
    expect(r.pointsOneTeamGoals).toBe(2);
  });

  it("acerta os gols do time B (pred 0x1, real 2x1)", () => {
    const r = score(0, 1, 2, 1);
    expect(r.pointsOneTeamGoals).toBe(2);
  });

  it("acumula oneTeamGoals com placar exato (criterio 5 e independente)", () => {
    // Criterio 5 e independente do resultado — acumula com tudo
    const r = score(2, 1, 2, 1);
    expect(r.pointsExactScore).toBe(10);
    // Acerta gols de ambos os times no placar exato
    expect(r.pointsOneTeamGoals).toBe(2);
  });

  it("nao ganha gols de um time quando erra os dois (pred 3x1, real 2x0)", () => {
    const r = score(3, 1, 2, 0);
    expect(r.pointsOneTeamGoals).toBe(0);
  });
});

// ─── 6. GOLEADA ──────────────────────────────────────────────────────────────

describe("Critério 6 — Goleada (5 pts, diferença >= 3 gols)", () => {
  it("acerta que seria goleada (pred 3x0, real 4x0)", () => {
    const r = score(3, 0, 4, 0);
    expect(r.pointsLandslide).toBe(5);
  });

  it("acerta que seria goleada com placar exato (acumula)", () => {
    const r = score(3, 0, 3, 0);
    expect(r.pointsLandslide).toBe(5);
    expect(r.pointsExactScore).toBe(10);
  });

  it("nao ganha goleada quando previu goleada mas nao houve (pred 3x0, real 2x1)", () => {
    const r = score(3, 0, 2, 1);
    expect(r.pointsLandslide).toBe(0);
  });

  it("nao ganha goleada quando houve goleada mas nao previu (pred 2x1, real 4x0)", () => {
    const r = score(2, 1, 4, 0);
    expect(r.pointsLandslide).toBe(0);
  });

  it("nao ganha goleada com diferença de 2 gols (pred 2x0, real 3x1)", () => {
    const r = score(2, 0, 3, 1);
    expect(r.pointsLandslide).toBe(0);
  });

  it("goleada reversa: time B vence por 3+ (pred 0x3, real 0x4)", () => {
    const r = score(0, 3, 0, 4);
    expect(r.pointsLandslide).toBe(5);
  });
});

// ─── 7. ZEBRA ────────────────────────────────────────────────────────────────

describe("Critério 7 — Zebra (1 pt, threshold >= 75%)", () => {
  const zebraCtxVitB: ZebraContext = {
    isZebraGame: true,
    betterTeam: "A",
    favoriteWon: false,
  };

  const zebraCtxEmpate: ZebraContext = {
    isZebraGame: true,
    betterTeam: "A",
    favoriteWon: false,
  };

  it("ganha zebra quando acerta que o azarao venceria (resultado correto)", () => {
    const r = score(0, 1, 0, 2, DEFAULT_RULES, zebraCtxVitB);
    expect(r.pointsZebra).toBe(1);
    expect(r.pointsCorrectResult).toBe(5);
  });

  it("nao ganha zebra quando erra o resultado mesmo em jogo de zebra", () => {
    const r = score(2, 0, 0, 1, DEFAULT_RULES, zebraCtxVitB);
    expect(r.pointsZebra).toBe(0);
    expect(r.resultType).toBe("wrong");
  });

  it("nao ganha zebra quando zebraEnabled = false", () => {
    const rulesNoZebra = { ...DEFAULT_RULES, zebraEnabled: false };
    const r = score(0, 1, 0, 2, rulesNoZebra, zebraCtxVitB);
    expect(r.pointsZebra).toBe(0);
  });

  it("nao ganha zebra em jogo normal (isZebraGame = false)", () => {
    const r = score(0, 1, 0, 2, DEFAULT_RULES, NO_ZEBRA_CTX);
    expect(r.pointsZebra).toBe(0);
  });

  it("empate NAO conta como zebra quando zebraCountDraw = false", () => {
    const r = score(1, 1, 0, 0, DEFAULT_RULES, zebraCtxEmpate);
    expect(r.pointsZebra).toBe(0);
    expect(r.pointsCorrectResult).toBe(5);
  });

  it("empate conta como zebra quando zebraCountDraw = true", () => {
    const rulesDrawZebra = { ...DEFAULT_RULES, zebraCountDraw: true };
    const zebraDrawCtx: ZebraContext = { isZebraGame: true, betterTeam: "A", favoriteWon: false };
    const r = score(1, 1, 0, 0, rulesDrawZebra, zebraDrawCtx);
    expect(r.pointsZebra).toBe(1);
  });
});

// ─── calculateZebraContext ────────────────────────────────────────────────────

describe("calculateZebraContext — deteccao automatica de zebra", () => {
  const bets = [
    { predictedScoreA: 2, predictedScoreB: 0 },
    { predictedScoreA: 2, predictedScoreB: 0 },
    { predictedScoreA: 2, predictedScoreB: 0 },
    { predictedScoreA: 2, predictedScoreB: 0 },
    { predictedScoreA: 0, predictedScoreB: 1 },
  ];

  it("detecta zebra quando >= 75% apostou no favorito e o azarao venceu", () => {
    const ctx = calculateZebraContext(bets, 0, 1);
    expect(ctx.isZebraGame).toBe(true);
    expect(ctx.betterTeam).toBe("A");
    expect(ctx.favoriteWon).toBe(false);
  });

  it("nao detecta zebra quando o favorito venceu", () => {
    const ctx = calculateZebraContext(bets, 2, 0);
    expect(ctx.isZebraGame).toBe(false);
  });

  it("nao detecta zebra quando menos de 75% apostou no mesmo resultado", () => {
    const evenBets = [
      { predictedScoreA: 2, predictedScoreB: 0 },
      { predictedScoreA: 2, predictedScoreB: 0 },
      { predictedScoreA: 0, predictedScoreB: 1 },
      { predictedScoreA: 0, predictedScoreB: 1 },
    ];
    const ctx = calculateZebraContext(evenBets, 0, 1);
    expect(ctx.isZebraGame).toBe(false);
  });

  it("retorna isZebraGame = false quando nao ha palpites", () => {
    const ctx = calculateZebraContext([], 1, 0);
    expect(ctx.isZebraGame).toBe(false);
  });
});

// ─── TOTAL CALCULADO CORRETAMENTE ────────────────────────────────────────────

describe("Campo total — soma de todos os criterios", () => {
  it("total = soma de todos os campos de pontos", () => {
    const r = score(2, 1, 2, 1);
    const sum = r.pointsExactScore + r.pointsCorrectResult + r.pointsTotalGoals +
                r.pointsGoalDiff + r.pointsOneTeamGoals + r.pointsLandslide + r.pointsZebra;
    expect(r.total).toBe(sum);
  });

  it("total so tem criterios independentes quando erra o resultado", () => {
    // 3x0 vs 0x3: resultado errado, mas diferenca de gols e igual (3-0=3 e 0-3=3)
    // Criterio 4 (diff de gols) e independente do resultado => 3 pts
    const r = score(3, 0, 0, 3);
    expect(r.resultType).toBe("wrong");
    expect(r.pointsExactScore).toBe(0);
    expect(r.pointsCorrectResult).toBe(0);
    expect(r.pointsGoalDiff).toBe(3); // diferenca = 3 nos dois casos
    expect(r.total).toBe(3);
  });
});
