/**
 * Script de re-geração de aiPrediction para todos os jogos
 * Prioridade: scheduled (futuros) → finished (passados)
 * Respeita a cota da API-Football (3 req/jogo: predictions + homeForm + awayForm)
 * Uso: node scripts/regen-predictions.mjs [--all | --scheduled | --finished] [--limit N]
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.VITE_FRONTEND_FORGE_API_KEY; // não é a chave certa, vamos buscar do banco

const DELAY_MS = 300; // pausa entre jogos para não sobrecarregar
const MAX_REQUESTS_RESERVE = 200; // reserva de segurança

const args = process.argv.slice(2);
const onlyScheduled = args.includes("--scheduled");
const onlyFinished = args.includes("--finished");
const limitIdx = args.indexOf("--limit");
const maxGames = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 9999;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function apiRequest(apiKey, endpoint, params) {
  const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchPredictions(apiKey, fixtureId) {
  try {
    const data = await apiRequest(apiKey, "/predictions", { fixture: fixtureId });
    const pred = data.response?.[0]?.predictions;
    if (!pred?.percent) return null;
    return {
      percent: {
        home: parseInt(pred.percent.home) || 0,
        draw: parseInt(pred.percent.draw) || 0,
        away: parseInt(pred.percent.away) || 0,
      },
      advice: pred.advice ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchTeamForm(apiKey, teamId) {
  try {
    const data = await apiRequest(apiKey, "/fixtures", { team: teamId, last: 5, status: "FT" });
    const fixtures = data.response ?? [];
    return fixtures.map(f => {
      const homeId = f.teams?.home?.id;
      const homeGoals = f.goals?.home ?? 0;
      const awayGoals = f.goals?.away ?? 0;
      const isHome = homeId === teamId;
      const teamGoals = isHome ? homeGoals : awayGoals;
      const oppGoals = isHome ? awayGoals : homeGoals;
      if (teamGoals > oppGoals) return "W";
      if (teamGoals < oppGoals) return "L";
      return "D";
    });
  } catch {
    return [];
  }
}

async function buildRecommendation(homeTeam, awayTeam, competition, matchDate, percent, advice) {
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
  if (!FORGE_URL || !FORGE_KEY) return null;

  const { home, draw, away } = percent;
  const dateStr = new Date(matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });
  const prompt = `Escreva uma análise pré-jogo concisa para apostadores de bolão. Máximo 3 linhas. Tom de especialista esportivo brasileiro: direto, informativo, com personalidade — sem clichês. Mencione as probabilidades e dê uma dica de aposta. Sem emojis.

Jogo: ${homeTeam} × ${awayTeam}
Competição: ${competition}
Data: ${dateStr}
Probabilidades (fonte: API-Football): ${homeTeam} vence ${home}% | Empate ${draw}% | ${awayTeam} vence ${away}%
${advice ? `Conselho da API: ${advice}` : ""}

Escreva apenas a análise, sem título.`;

  try {
    const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um analista esportivo brasileiro. Escreve análises pré-jogo concisas com base nos dados fornecidos. Sem emojis." },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Buscar chave da API-Football do banco
  const [settings] = await conn.execute("SELECT apiFootballKey, apiFootballEnabled FROM platform_settings LIMIT 1");
  const apiKey = settings[0]?.apiFootballKey;
  if (!apiKey || !settings[0]?.apiFootballEnabled) {
    console.error("❌ API-Football não configurada ou desabilitada no banco.");
    await conn.end();
    process.exit(1);
  }

  // Verificar cota disponível
  const [quotaRows] = await conn.execute("SELECT requestsUsed, quotaLimit FROM api_quota_tracker WHERE date = CURDATE()");
  const usedToday = quotaRows[0]?.requestsUsed ?? 0;
  const quotaLimit = quotaRows[0]?.quotaLimit ?? 7500;
  const available = quotaLimit - usedToday - MAX_REQUESTS_RESERVE;
  const maxByQuota = Math.floor(available / 3); // 3 req por jogo
  const effectiveMax = Math.min(maxGames, maxByQuota);

  console.log(`\n📊 Cota hoje: ${usedToday}/${quotaLimit} usadas | Disponíveis: ${available} | Máx jogos: ${effectiveMax}\n`);

  if (effectiveMax <= 0) {
    console.error("❌ Cota insuficiente para hoje. Tente amanhã.");
    await conn.end();
    process.exit(0);
  }

  // Buscar jogos — prioridade: scheduled primeiro, depois finished
  let statusFilter = "";
  if (onlyScheduled) statusFilter = "AND status = 'scheduled'";
  else if (onlyFinished) statusFilter = "AND status = 'finished'";

  const [games] = await conn.execute(`
    SELECT id, externalId, teamAName, teamBName, matchDate, status,
           (SELECT name FROM tournaments t WHERE t.id = tournamentId LIMIT 1) as tournamentName
    FROM games
    WHERE externalId IS NOT NULL ${statusFilter}
    ORDER BY FIELD(status, 'scheduled', 'finished'), matchDate ASC
    LIMIT ${effectiveMax}
  `);

  console.log(`🎯 Processando ${games.length} jogos...\n`);

  let success = 0, skipped = 0, failed = 0;
  let requestsUsed = 0;

  for (const game of games) {
    const fixtureId = parseInt(game.externalId);
    process.stdout.write(`[${game.status}] ${game.teamAName} × ${game.teamBName} (fixture ${fixtureId})... `);

    try {
      // 1. Buscar probabilidades (+1 req)
      const pred = await fetchPredictions(apiKey, fixtureId);
      requestsUsed++;

      if (!pred) {
        process.stdout.write("⚠️  sem probabilidades da API\n");
        // Limpar análise antiga se existia (era inventada pelo LLM)
        await conn.execute("UPDATE games SET aiPrediction = NULL WHERE id = ?", [game.id]);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // 2. Buscar forma recente dos dois times em paralelo (+2 req)
      // Precisamos dos IDs dos times da API — buscamos via fixture
      const fixtureData = await apiRequest(apiKey, "/fixtures", { id: fixtureId });
      requestsUsed++;
      const fixture = fixtureData.response?.[0];
      const homeTeamId = fixture?.teams?.home?.id;
      const awayTeamId = fixture?.teams?.away?.id;

      let homeForm = [], awayForm = [];
      if (homeTeamId && awayTeamId) {
        [homeForm, awayForm] = await Promise.all([
          fetchTeamForm(apiKey, homeTeamId),
          fetchTeamForm(apiKey, awayTeamId),
        ]);
        requestsUsed += 2;
      }

      // 3. Gerar texto via LLM
      const { home, draw, away } = pred.percent;
      const favorite = home > away ? game.teamAName : away > home ? game.teamBName : "equilíbrio";
      let aiRecommendation = `${game.teamAName} ${home}% | Empate ${draw}% | ${game.teamBName} ${away}%. Favorito: ${favorite}.`;
      if (pred.advice) aiRecommendation += ` ${pred.advice}.`;

      const llmText = await buildRecommendation(
        game.teamAName, game.teamBName,
        game.tournamentName || "Campeonato",
        game.matchDate,
        pred.percent,
        pred.advice
      );
      if (llmText) aiRecommendation = llmText;

      const aiPrediction = {
        homeWin: home,
        draw,
        awayWin: away,
        homeForm,
        awayForm,
        aiRecommendation,
      };

      await conn.execute(
        "UPDATE games SET aiPrediction = ? WHERE id = ?",
        [JSON.stringify(aiPrediction), game.id]
      );

      process.stdout.write(`✅ ${home}%/${draw}%/${away}% | form: [${homeForm.join("")}]/[${awayForm.join("")}]\n`);
      success++;
    } catch (err) {
      process.stdout.write(`❌ erro: ${err.message}\n`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  // Atualizar contador de quota no banco
  await conn.execute(`
    INSERT INTO api_quota_tracker (date, requestsUsed, quotaLimit, lastUpdated)
    VALUES (CURDATE(), ?, ?, NOW())
    ON DUPLICATE KEY UPDATE requestsUsed = requestsUsed + ?, lastUpdated = NOW()
  `, [requestsUsed, quotaLimit, requestsUsed]);

  console.log(`\n✅ Concluído: ${success} atualizados | ${skipped} sem dados da API | ${failed} erros`);
  console.log(`📡 Requisições usadas neste script: ${requestsUsed}`);

  await conn.end();
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
