/**
 * Script: regenerate-bet-analyses.mjs
 * Reprocessa as análises de palpite (gameBetAnalyses) para todos os jogos
 * finalizados que têm palpites mas ainda não têm análise gerada.
 *
 * Uso: node scripts/regenerate-bet-analyses.mjs
 */

import { createRequire } from "module";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

// Importar via require para compatibilidade com o build CommonJS do servidor
const require = createRequire(import.meta.url);

// Usar tsx para rodar TypeScript diretamente
import { execSync } from "child_process";

const script = `
import { getDb } from "./server/db.js";
import { games, gameBetAnalyses, bets } from "./drizzle/schema.js";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateBetAnalysis } from "./server/api-football/ai-analysis.js";
import { calculateBetScore } from "./server/scoring.js";
import logger from "./server/logger.js";

async function run() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }

  // Buscar jogos finalizados que têm palpites
  const finishedGames = await db
    .select({
      id: games.id,
      teamAName: games.teamAName,
      teamBName: games.teamBName,
      scoreA: games.scoreA,
      scoreB: games.scoreB,
      roundNumber: games.roundNumber,
      tournamentId: games.tournamentId,
    })
    .from(games)
    .where(eq(games.status, "finished"));

  console.log(\`Found \${finishedGames.length} finished games\`);
  let total = 0, skipped = 0, generated = 0, errors = 0;

  for (const game of finishedGames) {
    // Buscar palpites desse jogo em todos os bolões
    const allBets = await db
      .select({ id: bets.id, userId: bets.userId, poolId: bets.poolId, predictedScoreA: bets.predictedScoreA, predictedScoreB: bets.predictedScoreB })
      .from(bets)
      .where(eq(bets.gameId, game.id));

    if (allBets.length === 0) { skipped++; continue; }

    // Verificar se todos os jogos da rodada estão finalizados
    let allRoundFinished = false;
    if (game.roundNumber) {
      const roundGames = await db
        .select({ status: games.status })
        .from(games)
        .where(and(eq(games.tournamentId, game.tournamentId), eq(games.roundNumber, game.roundNumber)));
      allRoundFinished = roundGames.every(g => g.status === "finished");
    }

    // Agrupar por bolão
    const betsByPool = new Map();
    for (const bet of allBets) {
      if (!betsByPool.has(bet.poolId)) betsByPool.set(bet.poolId, []);
      betsByPool.get(bet.poolId).push(bet);
    }

    for (const [poolId, poolBets] of betsByPool.entries()) {
      for (const bet of poolBets) {
        total++;
        try {
          const breakdown = calculateBetScore(
            bet.predictedScoreA ?? 0, bet.predictedScoreB ?? 0,
            game.scoreA ?? 0, game.scoreB ?? 0,
            { exactScorePoints: 10, correctResultPoints: 5, totalGoalsPoints: 3, goalDiffPoints: 3, oneTeamGoalsPoints: 2, landslidePoints: 5, zebraPoints: 1, landslideMinDiff: 4, zebraThreshold: 75, zebraCountDraw: false, zebraEnabled: true },
            { isZebraGame: false, betterTeam: "A", favoriteWon: true, losingRatio: 0 }
          );

          let poolContext = null;
          if (allRoundFinished) {
            const exactCount = poolBets.filter(b => b.predictedScoreA === game.scoreA && b.predictedScoreB === game.scoreB).length;
            const correctCount = poolBets.filter(b => {
              const pA = b.predictedScoreA ?? 0, pB = b.predictedScoreB ?? 0;
              return (pA > pB && game.scoreA > game.scoreB) || (pA < pB && game.scoreA < game.scoreB) || (pA === pB && game.scoreA === game.scoreB);
            }).length;
            poolContext = { totalParticipants: poolBets.length, exactCount, correctCount, userRank: 1 };
          }

          const analysisText = await generateBetAnalysis({
            homeTeam: game.teamAName ?? "Casa",
            awayTeam: game.teamBName ?? "Visitante",
            scoreA: game.scoreA ?? 0,
            scoreB: game.scoreB ?? 0,
            predictedA: bet.predictedScoreA ?? 0,
            predictedB: bet.predictedScoreB ?? 0,
            resultType: breakdown.resultType,
            totalPoints: breakdown.total,
            isZebra: false,
            poolContext,
          });

          await db.insert(gameBetAnalyses).values({
            gameId: game.id,
            userId: bet.userId,
            poolId,
            analysisText,
          }).onDuplicateKeyUpdate({ set: { analysisText } });

          generated++;
          console.log(\`[OK] game=\${game.id} user=\${bet.userId} pool=\${poolId}\`);
        } catch (e) {
          errors++;
          console.error(\`[ERR] game=\${game.id} user=\${bet.userId}: \${e.message}\`);
        }
      }
    }
  }

  console.log(\`\\nDone: total=\${total} generated=\${generated} skipped=\${skipped} errors=\${errors}\`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
`;

// Escrever script temporário e executar com tsx
import { writeFileSync, unlinkSync } from "fs";
const tmpFile = path.join(__dirname, "../_tmp_regen.ts");
writeFileSync(tmpFile, script);

try {
  execSync(`cd ${path.join(__dirname, "..")} && npx tsx _tmp_regen.ts`, { stdio: "inherit" });
} finally {
  try { unlinkSync(tmpFile); } catch {}
}
