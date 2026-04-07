const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('No DATABASE_URL'); process.exit(1); }
  const conn = await mysql.createConnection(url);

  // Últimas 20 sincronizações
  const [logs] = await conn.execute(`
    SELECT syncType, status, triggeredBy, requestsUsed, gamesCreated, gamesUpdated, resultsApplied, errorMessage, createdAt
    FROM api_sync_log
    ORDER BY createdAt DESC
    LIMIT 20
  `);
  console.log('=== ÚLTIMAS SINCRONIZAÇÕES ===');
  console.log(JSON.stringify(logs, null, 2));

  // Contar jogos por status
  const [gameStats] = await conn.execute(`
    SELECT status, COUNT(*) as total FROM games GROUP BY status
  `);
  console.log('\n=== JOGOS POR STATUS ===');
  console.log(JSON.stringify(gameStats, null, 2));

  // Jogos agendados sem externalId (não vinculados à API)
  const [noExtId] = await conn.execute(`
    SELECT COUNT(*) as total FROM games WHERE status = 'scheduled' AND external_id IS NULL
  `);
  console.log('\n=== JOGOS AGENDADOS SEM external_id ===');
  console.log(JSON.stringify(noExtId, null, 2));

  // Torneios vinculados à API
  const [linked] = await conn.execute(`
    SELECT id, name, api_football_league_id, api_football_season, format, is_global
    FROM tournaments
    WHERE api_football_league_id IS NOT NULL
    ORDER BY name
  `);
  console.log('\n=== TORNEIOS VINCULADOS À API ===');
  console.log(JSON.stringify(linked, null, 2));

  await conn.end();
}
main().catch(e => console.error(e));
