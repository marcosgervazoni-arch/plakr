import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB não disponível"); return; }

  // Jogos com cmpHome=0 mas homeWin=34 (o bug)
  const result = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM games
    WHERE aiPrediction IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.comparison.total.home')) = '0%'
      AND JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.homeWin')) = '34'
      AND status = 'scheduled'
  `);
  console.log("Jogos afetados pelo bug (cmpHome=0, homeWin=34):", (result[0] as any[])[0]?.total);

  // Ver o que o apiPercent original tem nesses casos
  const sample = await db.execute(sql`
    SELECT 
      teamAName, teamBName,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.homeWin')) as homeWin,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.draw')) as draw,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.awayWin')) as awayWin,
      JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.comparison.total.home')) as cmpHome
    FROM games
    WHERE aiPrediction IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(aiPrediction, '$.comparison.total.home')) = '0%'
      AND status = 'scheduled'
    LIMIT 5
  `);
  console.log("\nAmostra de jogos afetados:");
  ((sample[0] as any[]) || []).forEach((r: any) => {
    console.log(`  ${r.teamAName} vs ${r.teamBName}: ${r.homeWin}%/${r.draw}%/${r.awayWin}% (cmpHome=${r.cmpHome})`);
  });

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
