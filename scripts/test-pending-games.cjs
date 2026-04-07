const mysql = require('mysql2/promise');
const https = require('https');

function apiRequest(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path,
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [settings] = await conn.execute('SELECT apiFootballKey FROM platform_settings WHERE id = 1');
  const apiKey = settings[0].apiFootballKey;
  
  // Testar jogos de diferentes torneios
  const testCases = [
    { id: 120330, ext: 1526758, name: 'Inter De Limeira x Floresta (Série B)' },
    { id: 120400, ext: 1520623, name: 'Cuiaba x Ceara (Série A)' },
  ];
  
  // Buscar um jogo da Copa do Brasil
  const [copaBrasil] = await conn.execute("SELECT g.id, g.teamAName, g.teamBName, g.externalId FROM games g JOIN tournaments t ON g.tournamentId = t.id WHERE g.status='finished' AND g.matchStatistics IS NULL AND t.name = 'Copa Do Brasil' LIMIT 1");
  if (copaBrasil.length > 0) {
    testCases.push({ id: copaBrasil[0].id, ext: parseInt(copaBrasil[0].externalId), name: `${copaBrasil[0].teamAName} x ${copaBrasil[0].teamBName} (Copa do Brasil)` });
  }
  
  await conn.end();
  
  for (const tc of testCases) {
    console.log(`\nTestando: ${tc.name} (fixture ${tc.ext})`);
    try {
      const statsResult = await apiRequest(`/fixtures/statistics?fixture=${tc.ext}`, apiKey);
      console.log('  Stats response count:', statsResult.response ? statsResult.response.length : 0);
      if (statsResult.errors && Object.keys(statsResult.errors).length > 0) {
        console.log('  → ERRO DA API:', JSON.stringify(statsResult.errors));
      } else if (!statsResult.response || statsResult.response.length === 0) {
        console.log('  → SEM DADOS (API não tem stats para este jogo)');
      } else {
        console.log('  → OK, tem dados!');
      }
      
      // Também testar events
      const eventsResult = await apiRequest(`/fixtures/events?fixture=${tc.ext}`, apiKey);
      console.log('  Events response count:', eventsResult.response ? eventsResult.response.length : 0);
      if (eventsResult.errors && Object.keys(eventsResult.errors).length > 0) {
        console.log('  → ERRO EVENTS:', JSON.stringify(eventsResult.errors));
      }
    } catch(e) {
      console.log('  → EXCEÇÃO:', e.message);
    }
    // Aguardar 1s entre requests
    await new Promise(r => setTimeout(r, 1000));
  }
}
main().catch(console.error);
