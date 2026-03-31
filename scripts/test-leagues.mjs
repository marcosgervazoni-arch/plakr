import { apiFootballRequest } from '../server/api-football/client.ts';

// Buscar ligas gerais sem filtro de país (como faz o fetchLeaguesFromApi)
const data = await apiFootballRequest('/leagues', { season: 2025, type: 'league' });
const leagues = data?.response ?? [];
console.log('Total ligas 2025 (type=league):', leagues.length);

// Verificar se Brasileirão está
const brasil = leagues.filter(l => l.league.id === 71 || (l.league.name.includes('Serie A') && l.country.name === 'Brazil'));
console.log('Brasileirão:', JSON.stringify(brasil.map(l => ({ id: l.league.id, name: l.league.name, country: l.country.name }))));

// Mostrar primeiros 15
console.log('\nPrimeiros 15:');
leagues.slice(0, 15).forEach(l => console.log(l.league.id, '|', l.league.name, '|', l.country.name));

// Mostrar posição do Brasileirão
const idx = leagues.findIndex(l => l.league.id === 71);
console.log('\nPosição do Brasileirão (id=71):', idx, idx >= 0 ? '(encontrado)' : '(NÃO ENCONTRADO)');

// Verificar temporada configurada no banco
import { getDb } from '../server/db.ts';
import { platformSettings } from '../drizzle/schema.ts';
const db = await getDb();
const rows = await db.select().from(platformSettings).limit(1);
const r = rows[0];
console.log('\nTemporada configurada no banco:', r?.apiFootballSeason);
