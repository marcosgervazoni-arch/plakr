import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB não disponível"); return; }

  const result = await db.execute(sql`
    SELECT
      t.apiFootballLeagueId,
      t.name as tournamentName,
      COUNT(*) as gameCount,
      STDDEV(CAST(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home')),'%','') AS DECIMAL(5,1))) as stddev_cmp,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home')) = '0%' THEN 1 ELSE 0 END) as zero_count
    FROM games g
    JOIN tournaments t ON g.tournamentId = t.id
    WHERE g.status = 'scheduled'
      AND g.aiPrediction IS NOT NULL
      AND JSON_EXTRACT(g.aiPrediction, '$.comparison.total.home') IS NOT NULL
    GROUP BY t.apiFootballLeagueId, t.name
    ORDER BY stddev_cmp DESC
  `);
  ((result[0] as any[]) || []).forEach((r: any) => {
    const stddev = parseFloat(r.stddev_cmp||0).toFixed(1);
    console.log(`Liga ${r.apiFootballLeagueId} (${r.tournamentName}): stddev=${stddev}, jogos=${r.gameCount}, zeros=${r.zero_count}`);
  });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
