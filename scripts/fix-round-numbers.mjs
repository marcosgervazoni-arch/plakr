/**
 * Script de migração: corrige phase e roundNumber dos jogos da Liga Profesional Argentina 2022
 *
 * Problema: roundToPhaseKey colapsava "1st Phase" e "2nd Phase" em "group_stage",
 * causando sobreposição de rodadas com mesmo número em fases diferentes.
 *
 * Solução: busca cada round via API-Football, extrai phase e roundNumber corretos,
 * e atualiza cada jogo pelo externalId.
 *
 * Uso: node scripts/fix-round-numbers.mjs
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

console.log(`[fix-phases] Conectado ao banco. Buscando rounds da liga ${LEAGUE_ID}/${SEASON}...`);

const rounds = await getAllRounds();
console.log(`[fix-phases] ${rounds.length} rounds encontrados.`);

let totalUpdated = 0;
let requestsUsed = 1;

for (const round of rounds) {
  const phaseKey = roundToPhaseKey(round);
  const roundNumber = extractRoundNumber(round);
  const roundNumberStr = roundNumber !== null ? String(roundNumber) : null;

  console.log(`[fix-phases] "${round}" → phase="${phaseKey}" roundNumber=${roundNumberStr}`);

  const fixtures = await fetchFixturesForRound(round);
  requestsUsed++;

  for (const fixture of fixtures) {
    const externalId = String(fixture.fixture.id);
    const [rows] = await db.execute(
      "UPDATE games SET phase = ?, roundNumber = ? WHERE externalId = ? AND tournamentId = ?",
      [phaseKey, roundNumberStr, externalId, TOURNAMENT_ID]
    );
    if (rows.affectedRows > 0) totalUpdated++;
  }

  console.log(`  → ${fixtures.length} fixtures, ${totalUpdated} atualizados no total`);

  // Pausa de 150ms entre requisições
  await new Promise(r => setTimeout(r, 150));
}

console.log(`\n[fix-phases] Concluído!`);
console.log(`  Total atualizado: ${totalUpdated} jogos`);
console.log(`  Requisições usadas: ${requestsUsed}`);

await db.end();
