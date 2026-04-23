/**
 * Backfill: recalcula pool_member_stats para todos os membros de todos os bolões.
 * Corrige o bug onde placeBet não chamava recalculateMemberStats.
 * 
 * Uso: node scripts/backfill-member-stats.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and } from "drizzle-orm";

// Carregar variáveis de ambiente
import { config } from "dotenv";
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const pool = await mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
});
const db = drizzle(pool);

// Importar schema
const { poolMembers, pools, bets, poolMemberStats } = await import("../drizzle/schema.ts").catch(() =>
  import("../drizzle/schema.js")
);

// Buscar todos os membros ativos de todos os bolões
const allMembers = await db
  .select({
    poolId: poolMembers.poolId,
    userId: poolMembers.userId,
  })
  .from(poolMembers)
  .where(eq(poolMembers.isBlocked, false));

console.log(`Total de membros a processar: ${allMembers.length}`);

let ok = 0;
let errors = 0;

for (const { poolId, userId } of allMembers) {
  try {
    // Buscar todos os palpites do membro neste bolão
    const memberBets = await db
      .select()
      .from(bets)
      .where(and(eq(bets.poolId, poolId), eq(bets.userId, userId)));

    if (memberBets.length === 0) continue; // sem palpites, não precisa criar stats

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

    // Upsert stats
    await db
      .insert(poolMemberStats)
      .values({
        poolId,
        userId,
        totalPoints,
        exactScoreCount,
        correctResultCount,
        totalBets: memberBets.length,
        goalDiffCount,
        oneTeamGoalsCount,
        totalGoalsCount,
        landslideCount,
        zebraCount,
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          totalPoints,
          exactScoreCount,
          correctResultCount,
          totalBets: memberBets.length,
          goalDiffCount,
          oneTeamGoalsCount,
          totalGoalsCount,
          landslideCount,
          zebraCount,
          updatedAt: new Date(),
        },
      });

    ok++;
    if (ok % 20 === 0) console.log(`Progresso: ${ok} membros processados...`);
  } catch (e) {
    errors++;
    console.error(`Erro ao processar poolId=${poolId} userId=${userId}:`, e.message);
  }
}

console.log(`\nConcluído! ${ok} membros atualizados, ${errors} erros.`);
await pool.end();
