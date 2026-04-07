/**
 * Script de migração: redistribui homeWin/draw/awayWin usando comparison.total já salvo.
 *
 * Não consome quota da API — usa apenas os dados já presentes no banco.
 * Aplica a mesma lógica de redistributeWithComparison do ai-analysis.ts.
 */
import mysql from "mysql2/promise";

function redistributeWithComparison(apiPercent, cmpTotal) {
  if (!cmpTotal) {
    return { homeWin: apiPercent.home, draw: apiPercent.draw, awayWin: apiPercent.away };
  }
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
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Buscar todos os jogos agendados com aiPrediction e comparison
  const [rows] = await conn.execute(
    `SELECT id, teamAName, teamBName,
       JSON_EXTRACT(aiPrediction, '$.homeWin') as homeWin,
       JSON_EXTRACT(aiPrediction, '$.draw') as draw,
       JSON_EXTRACT(aiPrediction, '$.awayWin') as awayWin,
       JSON_EXTRACT(aiPrediction, '$.comparison.total.home') as cmpHome,
       JSON_EXTRACT(aiPrediction, '$.comparison.total.away') as cmpAway,
       JSON_EXTRACT(aiPrediction, '$.aiRecommendation') as rec
     FROM games
     WHERE status = 'scheduled'
       AND aiPrediction IS NOT NULL
       AND JSON_EXTRACT(aiPrediction, '$.comparison') IS NOT NULL`
  );

  console.log(`Total de jogos para redistribuir: ${rows.length}`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const oldHomeWin = Number(row.homeWin);
    const oldDraw = Number(row.draw);
    const oldAwayWin = Number(row.awayWin);
    const cmpHome = row.cmpHome ? String(row.cmpHome).replace(/"/g, "") : null;
    const cmpAway = row.cmpAway ? String(row.cmpAway).replace(/"/g, "") : null;

    if (!cmpHome || !cmpAway) {
      skipped++;
      continue;
    }

    const { homeWin, draw, awayWin } = redistributeWithComparison(
      { home: oldHomeWin, draw: oldDraw, away: oldAwayWin },
      { home: cmpHome, away: cmpAway }
    );

    // Só atualiza se os valores mudaram
    if (homeWin === oldHomeWin && awayWin === oldAwayWin) {
      skipped++;
      continue;
    }

    // Atualizar apenas homeWin e awayWin no JSON (draw permanece o mesmo)
    await conn.execute(
      `UPDATE games
       SET aiPrediction = JSON_SET(aiPrediction,
         '$.homeWin', ?,
         '$.awayWin', ?
       )
       WHERE id = ?`,
      [homeWin, awayWin, row.id]
    );
    updated++;

    if (updated % 100 === 0) {
      console.log(`Progresso: ${updated} atualizados, ${skipped} sem mudança...`);
    }
  }

  console.log(`\nConcluído: ${updated} jogos atualizados, ${skipped} sem mudança.`);
  await conn.end();
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
