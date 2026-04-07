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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } 
        catch(e) { reject(e); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [settings] = await conn.execute('SELECT apiFootballKey FROM platform_settings WHERE id = 1');
  const apiKey = settings[0].apiFootballKey;
  
  // Testar 3 jogos da Copa do Brasil
  const testFixtures = [1532922, 1532914, 1532916];
  
  for (const ext of testFixtures) {
    console.log(`\nTestando fixture ${ext}:`);
    try {
      const result = await apiRequest(`/fixtures/statistics?fixture=${ext}`, apiKey);
      console.log('  HTTP status:', result.status);
      console.log('  Response count:', result.body.response ? result.body.response.length : 0);
      console.log('  Errors:', JSON.stringify(result.body.errors));
      if (result.body.errors && Object.keys(result.body.errors).length > 0) {
        console.log('  → ERRO DA API:', JSON.stringify(result.body.errors));
      } else if (!result.body.response || result.body.response.length === 0) {
        console.log('  → SEM DADOS (API não tem stats para este jogo)');
      } else {
        console.log('  → OK, tem dados!');
      }
    } catch(e) {
      console.log('  → EXCEÇÃO:', e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  await conn.end();
}
main().catch(console.error);
