import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB não disponível"); return; }

  // Verificar quantos jogos têm aiPrediction
  const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM games WHERE aiPrediction IS NOT NULL`);
  console.log("Jogos com aiPrediction:", (totalResult[0] as any[])[0]?.total);

  // Ver os valores de homeWin dos primeiros 15 jogos
  const rows = await db.execute(sql`
    SELECT 
      teamAName, teamBName,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.homeWin')) as homeWin,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.draw')) as draw,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.awayWin')) as awayWin,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.comparison.total.home')) as cmpHome,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.comparison.total.away')) as cmpAway
    FROM games 
    WHERE aiPrediction IS NOT NULL 
    LIMIT 15
  `);
  console.log("\nPrimeiros 15 jogos com probabilidades:");
  ((rows[0] as any[]) || []).forEach((r: any) => {
    console.log(`${r.teamAName} vs ${r.teamBName}: ${r.homeWin}% / ${r.draw}% / ${r.awayWin}% (cmp: ${r.cmpHome}/${r.cmpAway})`);
  });

  // Calcular stddev atual
  const stddevResult = await db.execute(sql`
    SELECT
      STDDEV(CAST(
        REPLACE(
          JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home')),
          '%', ''
        ) AS DECIMAL(5,1)
      )) as stddev_cmp,
      COUNT(*) as count
    FROM games g
    JOIN tournaments t ON g.tournamentId = t.id
    WHERE g.status = 'scheduled'
      AND g.aiPrediction IS NOT NULL
      AND JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home') IS NOT NULL
  `);
  console.log("\nStddev atual:", (stddevResult[0] as any[])[0]);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
