/**
 * Script de sync completo para a Liga Profesional Argentina 2022.
 * Importa times e fixtures round a round com phase e roundNumber corretos.
 *
 * Uso: node scripts/full-sync-argentina.mjs
 */

import mysql from "mysql2/promise";

const API_KEY = "08ec7ad27e5760cc8f1f0eca15412038";
const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 128;
const SEASON = 2022;
const TOURNAMENT_ID = 30001;

// ─── Helpers (espelho do sync.ts) ─────────────────────────────────────────────

function roundToPhaseKey(round) {
  const r = round.toLowerCase().trim();
  if (r.includes("round of 16") || r.includes("last 16")) return "round_of_16";
  if (r.includes("quarter")) return "quarter_finals";
  if (r.includes("semi")) return "semi_finals";
  if (r.includes("3rd place") || r.includes("third place")) return "third_place";
  if (/^final$/.test(r) || r === "1st phase - final" || r === "2nd phase - final") return "final";
  if (r.startsWith("1st phase")) return "1st_phase";
  if (r.startsWith("2nd phase")) return "2nd_phase";
  if (r.startsWith("3rd phase")) return "3rd_phase";
  if (r.startsWith("apertura")) return "apertura";
  if (r.startsWith("clausura")) return "clausura";
  if (r.startsWith("regular season")) return "regular_season";
  if (r.startsWith("group")) return "group_stage";
  return "group_stage";
}

function extractRoundNumber(round) {
  const afterDash = round.match(/-\s*(\d+)\s*$/);
  if (afterDash) return parseInt(afterDash[1]);
  const afterRound = round.match(/round\s+(\d+)/i);
  if (afterRound) return parseInt(afterRound[1]);
  const allNumbers = Array.from(round.matchAll(/(\d+)(?!\s*(?:st|nd|rd|th))/gi));
  if (allNumbers.length > 0) return parseInt(allNumbers[allNumbers.length - 1][1]);
  return null;
}

const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_KEY }
  });
  const data = await res.json();
  return data.response || [];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const db = await mysql.createConnection(process.env.DATABASE_URL);
console.log(`[sync] Conectado. Liga ${LEAGUE_ID}/${SEASON} → tournamentId ${TOURNAMENT_ID}`);

// ── 1. Importar times ──────────────────────────────────────────────────────────
console.log("\n[sync] Importando times...");
const teamsData = await apiFetch(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);
let teamsCreated = 0;

for (const item of teamsData) {
  const { team } = item;
  const externalId = String(team.id);
  const [existing] = await db.execute(
    "SELECT id FROM teams WHERE tournamentId = ? AND apiFootballTeamId = ?",
    [TOURNAMENT_ID, externalId]
  );
  if (existing.length === 0) {
    await db.execute(
      "INSERT INTO teams (tournamentId, name, code, flagUrl, apiFootballTeamId, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",
      [TOURNAMENT_ID, team.name, team.code ?? null, team.logo ?? null, externalId]
    );
    teamsCreated++;
  }
}
console.log(`[sync] Times: ${teamsCreated} criados de ${teamsData.length} encontrados`);
await sleep(300);

// ── 2. Buscar todos os rounds ──────────────────────────────────────────────────
console.log("\n[sync] Buscando rounds...");
const rounds = await apiFetch(`/fixtures/rounds?league=${LEAGUE_ID}&season=${SEASON}`);
console.log(`[sync] ${rounds.length} rounds encontrados`);
await sleep(300);

// ── 3. Importar fixtures round a round ────────────────────────────────────────
let gamesCreated = 0;
let gamesUpdated = 0;
let requestsUsed = 2; // teams + rounds

for (const round of rounds) {
  const phaseKey = roundToPhaseKey(round);
  const roundNumber = extractRoundNumber(round);
  const roundNumberStr = roundNumber !== null ? String(roundNumber) : null;

  const fixtures = await apiFetch(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}&round=${encodeURIComponent(round)}`
  );
  requestsUsed++;

  for (const fixture of fixtures) {
    const externalId = String(fixture.fixture.id);
    const matchDate = new Date(fixture.fixture.date);
    const fixtureStatus = fixture.fixture.status.short;
    const isFinished = FINISHED_STATUSES.includes(fixtureStatus);
    const gameStatus = isFinished ? "finished" : "scheduled";
    const scoreA = isFinished ? (fixture.score.fulltime.home ?? null) : null;
    const scoreB = isFinished ? (fixture.score.fulltime.away ?? null) : null;

    const [existing] = await db.execute(
      "SELECT id FROM games WHERE externalId = ? AND tournamentId = ?",
      [externalId, TOURNAMENT_ID]
    );

    if (existing.length > 0) {
      await db.execute(
        `UPDATE games SET matchDate=?, venue=?, phase=?, roundNumber=?,
         teamAName=?, teamBName=?, teamAFlag=?, teamBFlag=?,
         status=?, scoreA=?, scoreB=?, updatedAt=NOW()
         WHERE id=?`,
        [
          matchDate, fixture.fixture.venue?.name ?? null,
          phaseKey, roundNumberStr,
          fixture.teams.home.name, fixture.teams.away.name,
          fixture.teams.home.logo, fixture.teams.away.logo,
          gameStatus, scoreA, scoreB,
          existing[0].id
        ]
      );
      gamesUpdated++;
    } else {
      await db.execute(
        `INSERT INTO games (tournamentId, externalId, teamAName, teamBName, teamAFlag, teamBFlag,
         matchDate, venue, phase, roundNumber, status, scoreA, scoreB, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          TOURNAMENT_ID, externalId,
          fixture.teams.home.name, fixture.teams.away.name,
          fixture.teams.home.logo, fixture.teams.away.logo,
          matchDate, fixture.fixture.venue?.name ?? null,
          phaseKey, roundNumberStr,
          gameStatus, scoreA, scoreB
        ]
      );
      gamesCreated++;
    }
  }

  console.log(`  [${round}] phase="${phaseKey}" round=${roundNumberStr} → ${fixtures.length} fixtures (criados: ${gamesCreated}, atualizados: ${gamesUpdated})`);
  await sleep(150);
}

// ── 4. Resumo ──────────────────────────────────────────────────────────────────
console.log(`\n[sync] ✓ Concluído!`);
console.log(`  Times: ${teamsCreated}`);
console.log(`  Jogos criados: ${gamesCreated}`);
console.log(`  Jogos atualizados: ${gamesUpdated}`);
console.log(`  Requisições usadas: ${requestsUsed}`);

// Verificar distribuição final
const [dist] = await db.execute(
  `SELECT phase, roundNumber, COUNT(*) as total FROM games WHERE tournamentId = ?
   GROUP BY phase, roundNumber ORDER BY phase, CAST(roundNumber AS UNSIGNED)`,
  [TOURNAMENT_ID]
);
console.log("\n[sync] Distribuição final:");
for (const row of dist) {
  console.log(`  phase="${row.phase}" round=${row.roundNumber} → ${row.total} jogos`);
}

await db.end();
