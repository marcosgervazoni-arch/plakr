import { apiFootballRequest } from '../server/api-football/client.ts';

const LEAGUE_ID = 1; // Copa do Mundo
const SEASON = 2026;

console.log(`Buscando rounds da Copa do Mundo ${SEASON} (id=${LEAGUE_ID})...`);
const data = await apiFootballRequest('/fixtures/rounds', { league: LEAGUE_ID, season: SEASON });
const rounds = data?.response ?? [];

console.log(`\nTotal de rounds disponíveis: ${rounds.length}`);
rounds.forEach(r => console.log(' -', r));

// Verificar fixtures disponíveis
console.log('\nBuscando fixtures...');
const fixtures = await apiFootballRequest('/fixtures', { league: LEAGUE_ID, season: SEASON });
const games = fixtures?.response ?? [];
console.log(`Total de jogos: ${games.length}`);

// Agrupar por round
const byRound = {};
for (const g of games) {
  const round = g.league.round;
  byRound[round] = (byRound[round] || 0) + 1;
}
console.log('\nJogos por round:');
Object.entries(byRound).forEach(([round, count]) => console.log(`  ${round}: ${count} jogos`));
