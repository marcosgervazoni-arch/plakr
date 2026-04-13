/**
 * recalculate-breakdown.mjs
 * Reprocessa o breakdown de pontuação para jogos finalizados cujos palpites
 * têm pointsGoalDiff = 0 AND pointsEarned > 0 — indicando que foram processados
 * antes da correção do Gap 1 (scoring.ts).
 *
 * Uso: node scripts/recalculate-breakdown.mjs [--dry-run]
 *
 * O script NÃO altera o pointsEarned total (que já estava correto),
 * apenas preenche os campos de breakdown que ficavam em 0.
 */

import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const DRY_RUN = process.argv.includes("--dry-run");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrado no .env");
  process.exit(1);
}

// ─── Helpers de pontuação (inline) ───────────────────────────────────────────

function getSide(a, b) {
  return a > b ? "A" : a < b ? "B" : "draw";
}

function calculateBetScore(predA, predB, actA, actB, rules, zebraCtx = { isZebraGame: false }) {
  const bd = {
    pointsExactScore: 0, pointsCorrectResult: 0, pointsTotalGoals: 0,
    pointsGoalDiff: 0, pointsOneTeamGoals: 0, pointsLandslide: 0,
    pointsZebra: 0, isZebra: false, total: 0, resultType: "wrong",
  };

  const predSide = getSide(predA, predB);
  const actSide  = getSide(actA, actB);
  const correct  = predSide === actSide;

  if (Math.abs(predA - predB) === Math.abs(actA - actB)) bd.pointsGoalDiff = rules.goalDiffPoints;
  if (predA === actA || predB === actB)                   bd.pointsOneTeamGoals = rules.oneTeamGoalsPoints;

  if (correct) {
    bd.pointsCorrectResult = rules.correctResultPoints;
    if (predA === actA && predB === actB) {
      bd.pointsExactScore = rules.exactScorePoints;
      bd.resultType = "exact";
    } else {
      bd.resultType = "correct_result";
    }
    if (predA + predB === actA + actB) bd.pointsTotalGoals = rules.totalGoalsPoints;
    const minDiff = rules.landslideMinDiff ?? 4;
    if (Math.abs(actA - actB) >= minDiff && Math.abs(predA - predB) >= minDiff)
      bd.pointsLandslide = rules.landslidePoints;
    if (rules.zebraEnabled && zebraCtx.isZebraGame) {
      const isDrawResult = actSide === "draw";
      if (!isDrawResult || rules.zebraCountDraw) { bd.pointsZebra = rules.zebraPoints; bd.isZebra = true; }
    }
  }

  bd.total = bd.pointsExactScore + bd.pointsCorrectResult + bd.pointsTotalGoals +
             bd.pointsGoalDiff + bd.pointsOneTeamGoals + bd.pointsLandslide + bd.pointsZebra;
  return bd;
}

function calculateZebraContext(bets, actA, actB, threshold = 75) {
  if (bets.length === 0) return { isZebraGame: false };
  const actSide = getSide(actA, actB);
  const votes = { A: 0, B: 0, draw: 0 };
  for (const b of bets) votes[getSide(b.predicted_score_a, b.predicted_score_b)]++;
  const betterTeam = votes.A >= votes.B && votes.A >= votes.draw ? "A"
    : votes.B >= votes.A && votes.B >= votes.draw ? "B" : "draw";
  const losingRatio = (bets.length - votes[actSide]) / bets.length;
  const favoriteWon = actSide === betterTeam;
  return { isZebraGame: (losingRatio * 100) >= threshold && !favoriteWon };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await createConnection(DATABASE_URL);

  console.log(`[recalculate-breakdown] Iniciando${DRY_RUN ? " (DRY RUN — nenhuma alteração será feita)" : ""}...`);

  // Buscar jogos finalizados com placar registrado
  const [finishedGames] = await conn.execute(
    `SELECT id, tournamentId, teamAName, teamBName, scoreA, scoreB
     FROM games WHERE status = 'finished' AND scoreA IS NOT NULL AND scoreB IS NOT NULL`
  );

  console.log(`[recalculate-breakdown] ${finishedGames.length} jogos finalizados encontrados`);

  let gamesProcessed = 0;
  let betsUpdated = 0;

  for (const game of finishedGames) {
    // Verificar se há palpites com breakdown incompleto (pointsGoalDiff = 0 AND pointsEarned > 0)
    const [staleBets] = await conn.execute(
      `SELECT b.id, b.poolId, b.userId, b.predictedScoreA, b.predictedScoreB, b.pointsEarned
       FROM bets b
       WHERE b.gameId = ? AND b.pointsGoalDiff = 0 AND b.pointsEarned > 0`,
      [game.id]
    );

    if (staleBets.length === 0) continue;

    console.log(`\n  Jogo ${game.id} (${game.teamAName} ${game.scoreA}x${game.scoreB} ${game.teamBName}): ${staleBets.length} palpite(s) para reprocessar`);
    gamesProcessed++;

    // Agrupar por bolão
    const poolIds = [...new Set(staleBets.map(b => b.poolId))];

    for (const poolId of poolIds) {
      // Buscar regras do bolão
      const [rulesRows] = await conn.execute(
        `SELECT * FROM pool_scoring_rules WHERE poolId = ? LIMIT 1`,
        [poolId]
      );
      const rulesRow = rulesRows[0] ?? {};

      const rules = {
        exactScorePoints:    rulesRow.exactScorePoints    ?? 10,
        correctResultPoints: rulesRow.correctResultPoints ?? 5,
        totalGoalsPoints:    rulesRow.totalGoalsPoints    ?? 3,
        goalDiffPoints:      rulesRow.goalDiffPoints      ?? 3,
        oneTeamGoalsPoints:  rulesRow.oneTeamGoalsPoints  ?? 2,
        landslidePoints:     rulesRow.landslidePoints     ?? 5,
        landslideMinDiff:    rulesRow.landslideMinDiff    ?? 4,
        zebraPoints:         rulesRow.zebraPoints         ?? 1,
        zebraThreshold:      rulesRow.zebraThreshold      ?? 75,
        zebraCountDraw:      rulesRow.zebraCountDraw      ?? false,
        zebraEnabled:        rulesRow.zebraEnabled        ?? true,
      };

      // Buscar todos os palpites do jogo neste bolão para calcular contexto zebra
      const [allGameBets] = await conn.execute(
        `SELECT predictedScoreA as predicted_score_a, predictedScoreB as predicted_score_b FROM bets WHERE gameId = ? AND poolId = ?`,
        [game.id, poolId]
      );
      const zebraCtx = calculateZebraContext(allGameBets, game.scoreA, game.scoreB, rules.zebraThreshold);

      // Reprocessar palpites stale deste bolão
      const poolStaleBets = staleBets.filter(b => b.poolId === poolId);
      for (const bet of poolStaleBets) {
        const bd = calculateBetScore(
          bet.predictedScoreA, bet.predictedScoreB,
          game.scoreA, game.scoreB,
          rules, zebraCtx
        );

        console.log(`    Bet ${bet.id}: pointsGoalDiff=${bd.pointsGoalDiff}, pointsOneTeamGoals=${bd.pointsOneTeamGoals}, pointsLandslide=${bd.pointsLandslide}, pointsZebra=${bd.pointsZebra}, isZebra=${bd.isZebra}`);

        if (!DRY_RUN) {
          await conn.execute(
            `UPDATE bets SET
              pointsExactScore = ?,
              pointsCorrectResult = ?,
              pointsTotalGoals = ?,
              pointsGoalDiff = ?,
              pointsOneTeamGoals = ?,
              pointsLandslide = ?,
              pointsZebra = ?,
              isZebra = ?
             WHERE id = ?`,
            [
              bd.pointsExactScore, bd.pointsCorrectResult, bd.pointsTotalGoals,
              bd.pointsGoalDiff, bd.pointsOneTeamGoals, bd.pointsLandslide,
              bd.pointsZebra, bd.isZebra ? 1 : 0,
              bet.id
            ]
          );
        }
        betsUpdated++;
      }

      // Recalcular pool_member_stats para este bolão
      if (!DRY_RUN) {
        const [members] = await conn.execute(
          `SELECT userId FROM pool_members WHERE poolId = ?`,
          [poolId]
        );

        for (const member of members) {
          const [memberBets] = await conn.execute(
            `SELECT pointsEarned, resultType, pointsGoalDiff, pointsOneTeamGoals,
                    pointsTotalGoals, pointsLandslide, pointsZebra
             FROM bets WHERE poolId = ? AND userId = ?`,
            [poolId, member.userId]
          );

          const totalPoints        = memberBets.reduce((s, b) => s + (b.pointsEarned ?? 0), 0);
          const exactScoreCount    = memberBets.filter(b => b.resultType === "exact").length;
          const correctResultCount = memberBets.filter(b => b.resultType === "correct_result").length;
          const goalDiffCount      = memberBets.filter(b => (b.pointsGoalDiff     ?? 0) > 0).length;
          const oneTeamGoalsCount  = memberBets.filter(b => (b.pointsOneTeamGoals ?? 0) > 0).length;
          const totalGoalsCount    = memberBets.filter(b => (b.pointsTotalGoals   ?? 0) > 0).length;
          const landslideCount     = memberBets.filter(b => (b.pointsLandslide    ?? 0) > 0).length;
          const zebraCount         = memberBets.filter(b => (b.pointsZebra        ?? 0) > 0).length;

          await conn.execute(
            `INSERT INTO pool_member_stats
               (poolId, userId, totalPoints, exactScoreCount, correctResultCount,
                totalBets, goalDiffCount, oneTeamGoalsCount, totalGoalsCount,
                landslideCount, zebraCount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               totalPoints = VALUES(totalPoints),
               exactScoreCount = VALUES(exactScoreCount),
               correctResultCount = VALUES(correctResultCount),
               totalBets = VALUES(totalBets),
               goalDiffCount = VALUES(goalDiffCount),
               oneTeamGoalsCount = VALUES(oneTeamGoalsCount),
               totalGoalsCount = VALUES(totalGoalsCount),
               landslideCount = VALUES(landslideCount),
               zebraCount = VALUES(zebraCount)`,
            [poolId, member.userId, totalPoints, exactScoreCount, correctResultCount,
             memberBets.length, goalDiffCount, oneTeamGoalsCount, totalGoalsCount,
             landslideCount, zebraCount]
          );
        }
      }
    }
  }

  console.log(`\n[recalculate-breakdown] Concluído:`);
  console.log(`  - ${gamesProcessed} jogo(s) com palpites stale`);
  console.log(`  - ${betsUpdated} palpite(s) ${DRY_RUN ? "identificado(s) (dry-run)" : "atualizado(s)"}`);
  if (DRY_RUN) console.log(`\n  Para aplicar as correções, execute sem --dry-run`);

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
