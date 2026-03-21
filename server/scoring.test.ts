import { describe, expect, it } from "vitest";
import { calculateBetScore } from "./scoring";

const DEFAULT_RULES = {
  exactScorePoints: 10,
  correctResultPoints: 5,
  totalGoalsPoints: 2,
  goalDiffPoints: 2,
  zebraPoints: 3,
  zebraEnabled: true,
};

describe("calculateBetScore", () => {
  it("awards exact score points for perfect prediction", () => {
    const result = calculateBetScore(2, 1, 2, 1, DEFAULT_RULES, false);
    expect(result.points).toBe(10 + 2 + 2); // exact + totalGoals + goalDiff
    expect(result.resultType).toBe("exact");
  });

  it("awards correct result points for right winner but wrong score", () => {
    const result = calculateBetScore(2, 0, 3, 1, DEFAULT_RULES, false);
    expect(result.resultType).toBe("correct_result");
    expect(result.points).toBe(5 + 2); // correct + goalDiff (both diff=2)
  });

  it("awards zero points for wrong result", () => {
    const result = calculateBetScore(1, 0, 0, 1, DEFAULT_RULES, false);
    expect(result.resultType).toBe("wrong");
    expect(result.points).toBe(0);
  });

  it("awards zebra bonus when enabled and result is correct upset", () => {
    const result = calculateBetScore(0, 1, 0, 2, DEFAULT_RULES, true);
    expect(result.resultType).toBe("correct_result");
    expect(result.points).toBeGreaterThanOrEqual(5 + 3); // correct + zebra
  });

  it("does not award zebra bonus when disabled", () => {
    const rules = { ...DEFAULT_RULES, zebraEnabled: false };
    // 0-1 vs 0-2: correct result (B wins), diff 1 vs 2 — no goalDiff match, no totalGoals match
    const result = calculateBetScore(0, 1, 0, 2, rules, true);
    expect(result.resultType).toBe("correct_result");
    expect(result.points).toBe(5); // correct only, no zebra, no goalDiff (1≠2), no totalGoals (1≠2)
  });

  it("awards total goals bonus when total matches and result is correct", () => {
    // 2-1 vs 3-0: team A wins in both (correct result), total goals 3=3 (match), diff 1 vs 3 (no match)
    const result = calculateBetScore(2, 1, 3, 0, DEFAULT_RULES, false);
    expect(result.resultType).toBe("correct_result");
    expect(result.points).toBe(5 + 2); // correct + totalGoals (2+1=3=3+0)
  });

  it("awards goal difference bonus when diff matches", () => {
    const result = calculateBetScore(3, 1, 4, 2, DEFAULT_RULES, false);
    // diff: 3-1=2, 4-2=2 → goalDiff match
    // result: both team A wins → correctResult
    expect(result.resultType).toBe("correct_result");
    expect(result.points).toBeGreaterThanOrEqual(5 + 2); // correct + goalDiff
  });

  it("handles draw predictions correctly", () => {
    const result = calculateBetScore(1, 1, 1, 1, DEFAULT_RULES, false);
    expect(result.resultType).toBe("exact");
    expect(result.points).toBe(10 + 2 + 2); // exact + totalGoals + goalDiff
  });

  it("handles wrong draw prediction (predicted draw, actual win)", () => {
    const result = calculateBetScore(1, 1, 2, 0, DEFAULT_RULES, false);
    expect(result.resultType).toBe("wrong");
    expect(result.points).toBe(0);
  });
});
