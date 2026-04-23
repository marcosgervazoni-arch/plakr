/**
 * Backfill: recalcula pool_member_stats para todos os membros com palpites.
 * Corrige o bug onde placeBet não chamava recalculateMemberStats.
 * Uso: node scripts/backfill-member-stats.cjs
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

async function main() {
  const pool = await mysql.createPool({
    uri: DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 5,
  });

  // 1. Buscar todos os membros não bloqueados
  const [members] = await pool.query(
    "SELECT poolId, userId FROM pool_members WHERE isBlocked = 0"
  );
  console.log(`Total de membros a verificar: ${members.length}`);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const { poolId, userId } of members) {
    try {
      // 2. Buscar palpites do membro neste bolão
      const [memberBets] = await pool.query(
        "SELECT * FROM bets WHERE poolId = ? AND userId = ?",
        [poolId, userId]
      );

      if (memberBets.length === 0) {
        skipped++;
        continue;
      }

      // 3. Calcular stats
      let totalPoints = 0;
      let exactScoreCount = 0;
      let correctResultCount = 0;
      let goalDiffCount = 0;
      let oneTeamGoalsCount = 0;
      let totalGoalsCount = 0;
      let landslideCount = 0;
      let zebraCount = 0;

      for (const bet of memberBets) {
        totalPoints += bet.pointsEarned ?? 0;
        if (bet.resultType === "exact") exactScoreCount++;
        else if (bet.resultType === "correct_result") correctResultCount++;
        if ((bet.pointsGoalDiff ?? 0) > 0) goalDiffCount++;
        if ((bet.pointsOneTeamGoals ?? 0) > 0) oneTeamGoalsCount++;
        if ((bet.pointsTotalGoals ?? 0) > 0) totalGoalsCount++;
        if ((bet.pointsLandslide ?? 0) > 0) landslideCount++;
        if ((bet.pointsZebra ?? 0) > 0) zebraCount++;
      }

      // 4. Upsert stats
      await pool.query(
        `INSERT INTO pool_member_stats
          (poolId, userId, totalPoints, exactScoreCount, correctResultCount,
           totalBets, goalDiffCount, oneTeamGoalsCount, totalGoalsCount,
           landslideCount, zebraCount, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           totalPoints = VALUES(totalPoints),
           exactScoreCount = VALUES(exactScoreCount),
           correctResultCount = VALUES(correctResultCount),
           totalBets = VALUES(totalBets),
           goalDiffCount = VALUES(goalDiffCount),
           oneTeamGoalsCount = VALUES(oneTeamGoalsCount),
           totalGoalsCount = VALUES(totalGoalsCount),
           landslideCount = VALUES(landslideCount),
           zebraCount = VALUES(zebraCount),
           updatedAt = NOW()`,
        [poolId, userId, totalPoints, exactScoreCount, correctResultCount,
         memberBets.length, goalDiffCount, oneTeamGoalsCount, totalGoalsCount,
         landslideCount, zebraCount]
      );

      ok++;
      if (ok % 20 === 0) console.log(`Progresso: ${ok} membros atualizados...`);
    } catch (e) {
      errors++;
      console.error(`Erro poolId=${poolId} userId=${userId}:`, e.message);
    }
  }

  console.log(`\nConcluído!`);
  console.log(`  Atualizados: ${ok}`);
  console.log(`  Sem palpites (ignorados): ${skipped}`);
  console.log(`  Erros: ${errors}`);

  await pool.end();
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
