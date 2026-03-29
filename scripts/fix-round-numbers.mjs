/**
 * Script de migração: corrige roundNumber dos jogos da Liga Profesional Argentina 2022
 * 
 * Problema: a função extractRoundNumber antiga extraía o primeiro número da string,
 * então "1st Phase - 14" virava roundNumber=1 em vez de 14.
 * 
 * Solução: busca os rounds via API-Football, depois atualiza cada jogo pelo externalId.
 * 
 * Uso: node scripts/fix-round-numbers.mjs
 */

import mysql from "mysql2/promise";

const API_KEY = "08ec7ad27e5760cc8f1f0eca15412038";
const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 128;
const SEASON = 2022;
const TOURNAMENT_ID = 30001;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractRoundNumber(round) {
  // Extrai número após o último hífen: "1st Phase - 14" → 14
  const afterDash = round.match(/-\s*(\d+)\s*$/);
  if (afterDash) return parseInt(afterDash[1]);

  // Extrai número após "Round ": "Round 5" → 5
  const afterRound = round.match(/round\s+(\d+)/i);
  if (afterRound) return parseInt(afterRound[1]);

  // Extrai o último número não-ordinal
  const allNumbers = Array.from(round.matchAll(/(\d+)(?!\s*(?:st|nd|rd|th))/gi));
  if (allNumbers.length > 0) {
    return parseInt(allNumbers[allNumbers.length - 1][1]);
  }

  return null;
}

async function fetchFixturesForRound(round) {
  const url = `${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}&round=${encodeURIComponent(round)}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  const data = await res.json();
  return data.response || [];
}

async function getAllRounds() {
  const url = `${API_BASE}/fixtures/rounds?league=${LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  const data = await res.json();
  return data.response || [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log(`[fix-round-numbers] Conectado ao banco. Buscando rounds da liga ${LEAGUE_ID}/${SEASON}...`);

const rounds = await getAllRounds();
console.log(`[fix-round-numbers] ${rounds.length} rounds encontrados.`);

let totalUpdated = 0;
let requestsUsed = 1; // já usou 1 para buscar os rounds

for (const round of rounds) {
  const roundNumber = extractRoundNumber(round);
  if (roundNumber === null) {
    console.log(`[fix-round-numbers] Pulando round sem número: "${round}"`);
    continue;
  }

  console.log(`[fix-round-numbers] Buscando fixtures para "${round}" (roundNumber=${roundNumber})...`);
  const fixtures = await fetchFixturesForRound(round);
  requestsUsed++;

  for (const fixture of fixtures) {
    const externalId = String(fixture.fixture.id);
    const [rows] = await db.execute(
      "UPDATE games SET roundNumber = ? WHERE externalId = ? AND tournamentId = ?",
      [String(roundNumber), externalId, TOURNAMENT_ID]
    );
    if (rows.affectedRows > 0) totalUpdated++;
  }

  console.log(`  → ${fixtures.length} fixtures, ${totalUpdated} atualizados no total`);

  // Pausa de 200ms entre requisições para não sobrecarregar a API
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n[fix-round-numbers] Concluído!`);
console.log(`  Total atualizado: ${totalUpdated} jogos`);
console.log(`  Requisições usadas: ${requestsUsed}`);

await db.end();
