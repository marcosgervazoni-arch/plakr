const mysql = require('mysql2/promise');
const https = require('https');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [settings] = await conn.execute('SELECT apiFootballKey FROM platform_settings WHERE id = 1');
  const apiKey = settings[0].apiFootballKey;
  await conn.end();
  
  // Testar com o jogo Atletico Paranaense x Botafogo (ID 1492150) - Série A sem stats
  const fixtureId = 1492150;
  
  const options = {
    hostname: 'v3.football.api-sports.io',
    path: '/fixtures/statistics?fixture=' + fixtureId,
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
      const parsed = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Response count:', parsed.response ? parsed.response.length : 0);
      console.log('Errors:', JSON.stringify(parsed.errors));
      if (parsed.response && parsed.response.length > 0) {
        console.log('First team stats count:', parsed.response[0].statistics ? parsed.response[0].statistics.length : 0);
        console.log('Sample:', JSON.stringify(parsed.response[0].statistics ? parsed.response[0].statistics.slice(0, 2) : []));
      } else {
        console.log('NO STATS RETURNED - API has no data for this fixture');
      }
    });
  });
  req.on('error', (e) => console.log('Error:', e.message));
  req.end();
}
main().catch(console.error);
