/**
 * Script de diagnóstico: verifica palpites do Augusto Dalmas Guerra no banco de produção.
 * Uso: node scripts/check-augusto-bets.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// 1. Encontrar o usuário Augusto
const [users] = await conn.execute(
  "SELECT id, name, email, createdAt FROM users WHERE name LIKE ? OR email LIKE ?",
  ["%augusto%", "%augusto%"]
);
console.log("\n=== USUÁRIOS ENCONTRADOS ===");
console.table(users);

if (!users.length) {
  console.log("Nenhum usuário encontrado com 'augusto' no nome/email.");
  await conn.end();
  process.exit(0);
}

for (const user of users) {
  const userId = user.id;
  console.log(`\n=== PALPITES DO USUÁRIO: ${user.name} (id=${userId}) ===`);

  // 2. Total de palpites por bolão
  const [betsByPool] = await conn.execute(`
    SELECT p.name as pool_name, p.id as pool_id, COUNT(b.id) as total_bets
    FROM bets b
    JOIN pools p ON b.poolId = p.id
    WHERE b.userId = ?
    GROUP BY p.id, p.name
    ORDER BY total_bets DESC
  `, [userId]);
  console.log("\n-- Palpites por bolão:");
  console.table(betsByPool);

  // 3. Para cada bolão, verificar jogos sem palpite
  for (const pool of betsByPool) {
    const [missingBets] = await conn.execute(`
      SELECT g.id as game_id, g.teamAName, g.teamBName, g.matchDate, g.status
      FROM games g
      JOIN pools p ON p.tournamentId = g.tournamentId
      WHERE p.id = ?
        AND g.status IN ('scheduled', 'finished', 'live')
        AND NOT EXISTS (
          SELECT 1 FROM bets b2
          WHERE b2.gameId = g.id AND b2.userId = ? AND b2.poolId = ?
        )
      ORDER BY g.matchDate
    `, [pool.pool_id, userId, pool.pool_id]);

    console.log(`\n-- Jogos SEM palpite no bolão "${pool.pool_name}" (${missingBets.length} jogos):`);
    if (missingBets.length > 0) {
      console.table(missingBets);
    } else {
      console.log("  Nenhum jogo sem palpite.");
    }

    // 4. Total de jogos no torneio do bolão
    const [totalGames] = await conn.execute(`
      SELECT COUNT(*) as total_games
      FROM games g
      JOIN pools p ON p.tournamentId = g.tournamentId
      WHERE p.id = ? AND g.status != 'cancelled'
    `, [pool.pool_id]);
    console.log(`  Total de jogos no torneio: ${totalGames[0].total_games} | Palpites feitos: ${pool.total_bets} | Faltando: ${missingBets.length}`);
  }

  // 5. Últimos 10 palpites (para ver quando foram feitos)
  const [recentBets] = await conn.execute(`
    SELECT b.id, b.gameId, g.teamAName, g.teamBName, b.predictedScoreA, b.predictedScoreB,
           b.resultType, b.createdAt, b.updatedAt
    FROM bets b
    JOIN games g ON b.gameId = g.id
    WHERE b.userId = ?
    ORDER BY b.updatedAt DESC
    LIMIT 10
  `, [userId]);
  console.log("\n-- Últimos 10 palpites (mais recentes primeiro):");
  console.table(recentBets);
}

await conn.end();
console.log("\n=== FIM DO DIAGNÓSTICO ===");
