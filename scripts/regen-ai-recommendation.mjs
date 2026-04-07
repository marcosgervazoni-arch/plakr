/**
 * Script: regen-ai-recommendation.mjs
 *
 * Regenera o campo aiRecommendation para jogos que têm o texto antigo
 * (com percentuais brutos expostos como "10% | 45% | 45%").
 *
 * Usa os dados de comparison já salvos no banco — não chama a API novamente.
 * Processa em lotes de 3 em paralelo para não sobrecarregar o LLM.
 */

import mysql from 'mysql2/promise';
// Node 22 tem fetch nativo — sem necessidade de node-fetch

const DB_URL = process.env.DATABASE_URL;
const LLM_URL = process.env.BUILT_IN_FORGE_API_URL + '/v1/chat/completions';
const LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DB_URL || !LLM_URL || !LLM_KEY) {
  console.error('Variáveis de ambiente ausentes: DATABASE_URL, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

async function invokeLLM(messages) {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_KEY}`,
    },
    body: JSON.stringify({ messages, max_tokens: 300 }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function formatForm(form, teamName) {
  if (!form || form.length === 0) return '';
  const results = form.slice(0, 5).map(r => r === 'W' ? 'V' : r === 'D' ? 'E' : 'D').join('-');
  const wins = form.filter(r => r === 'W').length;
  const draws = form.filter(r => r === 'D').length;
  const losses = form.filter(r => r === 'L').length;
  return `${teamName}: ${results} (${wins}V ${draws}E ${losses}D nos últimos ${form.length} jogos)`;
}

async function regenerateOne(conn, game) {
  const pred = game.aiPrediction;
  const cmp = pred.comparison;
  const homeTeam = game.teamAName ?? 'Time A';
  const awayTeam = game.teamBName ?? 'Time B';
  const homeWin = pred.homeWin ?? 33;
  const draw = pred.draw ?? 33;
  const awayWin = pred.awayWin ?? 33;

  const dateStr = new Date(game.matchDate).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });

  const homeFormText = formatForm(pred.homeForm, homeTeam);
  const awayFormText = formatForm(pred.awayForm, awayTeam);
  const formSection = (homeFormText || awayFormText)
    ? `Forma recente:\n${homeFormText ? `- ${homeFormText}` : ''}\n${awayFormText ? `- ${awayFormText}` : ''}`
    : '';

  const compLines = cmp ? [
    cmp.total ? `Score combinado: ${homeTeam} ${cmp.total.home} / ${awayTeam} ${cmp.total.away}` : '',
    cmp.poisson ? `Distribuição Poisson: ${homeTeam} ${cmp.poisson.home} / ${awayTeam} ${cmp.poisson.away}` : '',
    cmp.forme ? `Aproveitamento recente: ${homeTeam} ${cmp.forme.home} / ${awayTeam} ${cmp.forme.away}` : '',
    cmp.att ? `Força de ataque: ${homeTeam} ${cmp.att.home} / ${awayTeam} ${cmp.att.away}` : '',
    cmp.def ? `Força de defesa: ${homeTeam} ${cmp.def.home} / ${awayTeam} ${cmp.def.away}` : '',
    cmp.h2h ? `Histórico H2H: ${homeTeam} ${cmp.h2h.home} / ${awayTeam} ${cmp.h2h.away}` : '',
  ].filter(Boolean).join('\n') : '';

  const favoriteLabel = homeWin > awayWin ? homeTeam : awayWin > homeWin ? awayTeam : 'equilíbrio';

  const prompt = `Escreva uma análise pré-jogo animada para um bolão de futebol. Máximo 3 linhas. Tom de narrador empolgado estilo CazéTV — energético, com personalidade, sem clichês. Use os dados abaixo para comentar quem está em melhor momento, o que esperar do confronto, o que pode ser decisivo. NÃO sugira apostas, NÃO mencione odds ou percentuais diretamente, NÃO diga qual time apostar. Deixe o leitor animado para fazer o próprio palpite. Sem emojis.
Jogo: ${homeTeam} × ${awayTeam}
Data: ${dateStr}
${formSection}
${compLines ? `Análise estatística:\n${compLines}` : ''}
Contexto de probabilidade (use para embasar a narrativa, NÃO mencione os números): ${homeTeam} ${homeWin}% de chance de vitória | Empate ${draw}% | ${awayTeam} ${awayWin}%
Escreva apenas a análise, sem título.`;

  let aiRecommendation;
  try {
    const text = await invokeLLM([
      { role: 'system', content: 'Você é um narrador de futebol brasileiro com energia de transmissão ao vivo — estilo CazéTV. Escreve análises pré-jogo animadas e envolventes para bolões de palpites. Foca no contexto esportivo: momento dos times, o que esperar do jogo, o que pode ser decisivo. NUNCA sugere apostas, NUNCA menciona odds ou percentuais, NUNCA diz qual resultado escolher. O objetivo é deixar o usuário animado para fazer o próprio palpite. Escreve em português brasileiro, sem emojis.' },
      { role: 'user', content: prompt },
    ]);
    aiRecommendation = text.trim().slice(0, 400) || null;
  } catch {
    aiRecommendation = favoriteLabel !== 'equilíbrio'
      ? `${favoriteLabel} chega como favorito para esse confronto. Análise baseada em dados estatísticos da temporada.`
      : `Jogo equilibrado entre ${homeTeam} e ${awayTeam}. Qualquer resultado é possível.`;
  }

  if (!aiRecommendation) return false;

  // Atualizar apenas o campo aiRecommendation dentro do JSON
  await conn.execute(
    `UPDATE games
     SET aiPrediction = JSON_SET(aiPrediction, '$.aiRecommendation', ?)
     WHERE id = ?`,
    [aiRecommendation, game.id]
  );
  return true;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  // Buscar jogos com texto antigo
  const [rows] = await conn.execute(`
    SELECT id, teamAName, teamBName, matchDate, aiPrediction
    FROM games
    WHERE status = 'scheduled'
      AND matchDate > NOW()
      AND aiPrediction IS NOT NULL
      AND JSON_EXTRACT(aiPrediction, '$.comparison') IS NOT NULL
      AND (
        JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.aiRecommendation')) LIKE '%|%45%|%'
        OR JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.aiRecommendation')) LIKE '%Favorito:%'
        OR JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.aiRecommendation')) LIKE '%Double chance%'
      )
    ORDER BY matchDate ASC
  `);

  const games = rows.map(r => ({
    ...r,
    aiPrediction: typeof r.aiPrediction === 'string' ? JSON.parse(r.aiPrediction) : r.aiPrediction,
  }));

  console.log(`Regenerando ${games.length} análises pré-jogo...`);

  const BATCH = 3;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < games.length; i += BATCH) {
    const batch = games.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(g => regenerateOne(conn, g)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) processed++;
      else errors++;
    }
    if ((i + BATCH) % 30 === 0 || i + BATCH >= games.length) {
      console.log(`  ${Math.min(i + BATCH, games.length)}/${games.length} — ok: ${processed}, erros: ${errors}`);
    }
    // Pequena pausa para não sobrecarregar o LLM
    if (i + BATCH < games.length) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nConcluído: ${processed} regenerados, ${errors} erros.`);
  await conn.end();
}

main().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
