// Reimportar todos os fixtures da Copa do Mundo 2026 (tournament id=90001, league=1)
import { syncFixturesForTournament } from '../server/api-football/sync.ts';

console.log('Reimportando fixtures da Copa do Mundo 2026...');

const result = await syncFixturesForTournament({
  tournamentId: 90001,
  leagueId: 1,
  season: 2026,
  triggeredBy: 'manual',
});

console.log('Resultado:', JSON.stringify(result, null, 2));
