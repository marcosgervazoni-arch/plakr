const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('NO DATABASE_URL'); process.exit(1); }
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.execute(
    "SELECT id, teamAName, teamBName, scoreA, scoreB, goalsTimeline, aiSummary, aiNarration FROM games WHERE teamAName LIKE '%Gremio%' OR teamBName LIKE '%Remo%' ORDER BY matchDate DESC LIMIT 3"
  );
  for (const r of rows) {
    console.log('ID:', r.id, r.teamAName, 'x', r.teamBName, r.scoreA, '-', r.scoreB);
    console.log('goalsTimeline:', r.goalsTimeline);
    console.log('aiSummary:', r.aiSummary ? r.aiSummary.substring(0, 300) : 'null');
    console.log('aiNarration:', r.aiNarration ? r.aiNarration.substring(0, 300) : 'null');
    console.log('---');
  }
  await conn.end();
}

main().catch(console.error);
