import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar a chave API e temporada configuradas
const [settings] = await conn.execute(
  "SELECT settingKey, settingValue FROM platform_settings WHERE settingKey IN ('apiFootballKey', 'apiFootballSeason')"
);
const cfg = Object.fromEntries(settings.map(s => [s.settingKey, s.settingValue]));
console.log('Config:', cfg);

await conn.end();

// Buscar todos os fixtures da Copa do Mundo 2026 (league=1) via API-Football
const season = cfg.apiFootballSeason || '2026';
const apiKey = cfg.apiFootballKey;

if (!apiKey) {
  console.error('API key não encontrada no banco');
  process.exit(1);
}

// Página 1
let page = 1;
let totalFixtures = 0;
const byRound = {};

while (true) {
  const url = `https://v3.football.api-sports.io/fixtures?league=1&season=${season}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
      'x-rapidapi-key': apiKey,
    }
  });
  const data = await res.json();
  
  if (page === 1) {
    console.log(`Total na API (paginação): ${data.paging?.total} páginas, ${data.results} resultados nesta página`);
    console.log(`Total de fixtures: ${data.paging?.total * data.results} (estimado)`);
  }
  
  const fixtures = data.response || [];
  if (fixtures.length === 0) break;
  
  for (const f of fixtures) {
    const round = f.league?.round || 'unknown';
    byRound[round] = (byRound[round] || 0) + 1;
    totalFixtures++;
  }
  
  if (page >= (data.paging?.total || 1)) break;
  page++;
}

console.log(`\nTotal de fixtures encontrados: ${totalFixtures}`);
console.log('\nPor rodada:');
for (const [round, count] of Object.entries(byRound).sort()) {
  console.log(`  ${round}: ${count} jogos`);
}
