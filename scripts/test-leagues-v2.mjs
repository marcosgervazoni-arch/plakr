import { apiFootballRequest } from '../server/api-football/client.ts';

const season = 2026;
const INTERNATIONAL_IDS = [1, 2, 3, 11, 13, 15, 16, 39, 61, 78, 135, 140, 253, 262];

console.log('Buscando ligas em paralelo (Brasil + todas)...');
const [brazilData, allLeaguesData] = await Promise.all([
  apiFootballRequest('/leagues', { country: 'Brazil', season }),
  apiFootballRequest('/leagues', { season }),
]);

const brazilLeagues = brazilData?.response ?? [];
const allLeagues = allLeaguesData?.response ?? [];

const intlLeagues = allLeagues.filter(item => INTERNATIONAL_IDS.includes(item.league.id));
intlLeagues.sort((a, b) => INTERNATIONAL_IDS.indexOf(a.league.id) - INTERNATIONAL_IDS.indexOf(b.league.id));

const seen = new Set(intlLeagues.map(l => l.league.id));
const combined = [...intlLeagues];
for (const item of brazilLeagues) {
  if (!seen.has(item.league.id)) {
    seen.add(item.league.id);
    combined.push(item);
  }
}

console.log(`\nTotal combinado: ${combined.length} ligas`);
console.log(`  Internacionais: ${intlLeagues.length}`);
console.log(`  Brasil: ${brazilLeagues.length}`);

console.log('\n--- INTERNACIONAIS ---');
intlLeagues.forEach(l => console.log(`  ${l.league.id} | ${l.league.name} | ${l.country.name}`));

console.log('\n--- BRASIL (primeiras 10) ---');
brazilLeagues.slice(0, 10).forEach(l => console.log(`  ${l.league.id} | ${l.league.name}`));

// Verificar se Brasileirão está
const brasileirao = combined.find(l => l.league.id === 71);
console.log('\nBrasileirao (id=71):', brasileirao ? `ENCONTRADO - ${brasileirao.league.name}` : 'NÃO ENCONTRADO');
