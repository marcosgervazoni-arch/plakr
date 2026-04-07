/**
 * Script: regen-temporal-fix.mjs
 * Regenera o aiRecommendation apenas dos jogos que contêm expressões
 * temporais incorretas ("hoje", "amanhã", "agora") no texto da IA.
 * Usa os dados de comparison já salvos no banco — sem chamar a API novamente.
 */

import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
const LLM_URL = process.env.BUILT_IN_FORGE_API_URL + '/v1/chat/completions';
const LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages) {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function redistributeWithComparison(apiPercent, cmpTotal) {
  if (!cmpTotal) return apiPercent;
  const cmpHome = parseFloat(cmpTotal.home) || 50;
  const cmpAway = parseFloat(cmpTotal.away) || 50;
  const cmpSum = cmpHome + cmpAway;
  const drawPct = apiPercent.draw;
  const pool = 100 - drawPct;
  const homeWin = Math.round((pool * cmpHome) / cmpSum);
  const awayWin = 100 - drawPct - homeWin;
  return { homeWin, draw: drawPct, awayWin };
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log('[regen-temporal-fix] Buscando jogos com expressões temporais incorretas...');

  const [games] = await conn.execute(`
    SELECT g.id, g.teamAName, g.teamBName, g.matchDate, g.aiPrediction,
           t.name as tournamentName
    FROM games g
    JOIN tournaments t ON g.tournamentId = t.id
    WHERE g.status = 'scheduled'
      AND g.aiPrediction IS NOT NULL
      AND (
        JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.aiRecommendation')) LIKE '%hoje%'
        OR JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.aiRecommendation')) LIKE '%amanhã%'
        OR JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.aiRecommendation')) LIKE '%agora%'
        OR JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.aiRecommendation')) LIKE '%É HOJE%'
        OR JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.aiRecommendation')) LIKE '%é hoje%'
      )
    ORDER BY g.matchDate ASC
  `);

  console.log(`[regen-temporal-fix] ${games.length} jogos para regenerar.`);

  let updated = 0;
  let errors = 0;
  const BATCH = 3;

  for (let i = 0; i < games.length; i += BATCH) {
    const batch = games.slice(i, i + BATCH);
    await Promise.all(batch.map(async (game) => {
      try {
        const pred = typeof game.aiPrediction === 'string'
          ? JSON.parse(game.aiPrediction)
          : game.aiPrediction;

        const apiPercent = {
          home: pred.homeWin ?? 33,
          draw: pred.draw ?? 33,
          away: pred.awayWin ?? 34,
        };
        const cmp = pred.comparison ?? null;
        const { homeWin, draw, awayWin } = redistributeWithComparison(apiPercent, cmp?.total);

        const dateStr = new Date(game.matchDate).toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
        });

        const homeForm = pred.homeForm ?? [];
        const awayForm = pred.awayForm ?? [];
        const formatForm = (form, name) => {
          if (!form || form.length === 0) return '';
          const results = form.slice(0, 5).map(r => r === 'W' ? 'V' : r === 'D' ? 'E' : 'D').join('-');
          const wins = form.filter(r => r === 'W').length;
          const draws = form.filter(r => r === 'D').length;
          const losses = form.filter(r => r === 'L').length;
          return `${name}: ${results} (${wins}V ${draws}E ${losses}D nos últimos ${form.length} jogos)`;
        };
        const homeFormText = formatForm(homeForm, game.teamAName);
        const awayFormText = formatForm(awayForm, game.teamBName);
        const formSection = (homeFormText || awayFormText)
          ? `Forma recente:\n${homeFormText ? `- ${homeFormText}` : ''}\n${awayFormText ? `- ${awayFormText}` : ''}`
          : '';

        const comparisonSection = cmp ? [
          cmp.total ? `Score combinado: ${game.teamAName} ${cmp.total.home} / ${game.teamBName} ${cmp.total.away}` : '',
          cmp.poisson ? `Distribuição Poisson: ${game.teamAName} ${cmp.poisson.home} / ${game.teamBName} ${cmp.poisson.away}` : '',
          cmp.forme ? `Aproveitamento recente: ${game.teamAName} ${cmp.forme.home} / ${game.teamBName} ${cmp.forme.away}` : '',
          cmp.att ? `Força de ataque: ${game.teamAName} ${cmp.att.home} / ${game.teamBName} ${cmp.att.away}` : '',
          cmp.def ? `Força de defesa: ${game.teamAName} ${cmp.def.home} / ${game.teamBName} ${cmp.def.away}` : '',
          cmp.h2h ? `Histórico H2H: ${game.teamAName} ${cmp.h2h.home} / ${game.teamBName} ${cmp.h2h.away}` : '',
        ].filter(Boolean).join('\n') : '';

        const favoriteLabel = homeWin > awayWin ? game.teamAName : awayWin > homeWin ? game.teamBName : 'equilíbrio';

        const prompt = `Escreva uma análise pré-jogo animada para um bolão de futebol. Máximo 3 linhas. Tom de narrador empolgado estilo CazéTV — energético, com personalidade, sem clichês. Use os dados abaixo para comentar quem está em melhor momento, o que esperar do confronto, o que pode ser decisivo. NÃO sugira apostas, NÃO mencione odds ou percentuais diretamente, NÃO diga qual time apostar. NUNCA use expressões temporais relativas como "hoje", "amanhã", "agora", "neste momento" — o jogo pode ser em dias ou semanas. Deixe o leitor animado para fazer o próprio palpite. Sem emojis.
Jogo: ${game.teamAName} × ${game.teamBName}
Competição: ${game.tournamentName}
Data: ${dateStr}
${formSection}
${comparisonSection ? `Análise estatística:\n${comparisonSection}` : ''}
Contexto de probabilidade (use para embasar a narrativa, NÃO mencione os números): ${game.teamAName} ${homeWin}% de chance de vitória | Empate ${draw}% | ${game.teamBName} ${awayWin}%
Escreva apenas a análise, sem título.`;

        const text = await invokeLLM([
          { role: 'system', content: "Você é um narrador de futebol brasileiro com energia de transmissão ao vivo — estilo CazéTV. Escreve análises pré-jogo animadas e envolventes para bolões de palpites. Foca no contexto esportivo: momento dos times, o que esperar do jogo, o que pode ser decisivo. NUNCA sugere apostas, NUNCA menciona odds ou percentuais, NUNCA diz qual resultado escolher. NUNCA usa expressões temporais relativas como 'hoje', 'amanhã', 'agora', 'neste momento' — o texto será lido em datas diferentes da geração. O objetivo é deixar o usuário animado para fazer o próprio palpite. Escreve em português brasileiro, sem emojis." },
          { role: 'user', content: prompt },
        ]);

        if (text.trim()) {
          const newPred = { ...pred, aiRecommendation: text.trim().slice(0, 400) };
          await conn.execute(
            'UPDATE games SET aiPrediction = ? WHERE id = ?',
            [JSON.stringify(newPred), game.id]
          );
          updated++;
          if (updated % 10 === 0) {
            console.log(`[regen-temporal-fix] ${updated}/${games.length} regenerados...`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[regen-temporal-fix] Erro no jogo ${game.id}:`, e.message);
      }
    }));
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[regen-temporal-fix] Concluído. ${updated} atualizados, ${errors} erros.`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
