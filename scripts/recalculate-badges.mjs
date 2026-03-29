/**
 * Script de reprocessamento retroativo de badges
 * Executa calculateAndAssignBadges para todos os usuários reais do banco
 * Uso: node scripts/recalculate-badges.mjs
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrado no .env");
  process.exit(1);
}

async function main() {
  const conn = await createConnection(DATABASE_URL);

  // Buscar apenas usuários reais (excluindo usuários de teste dos testes automatizados)
  const [users] = await conn.execute(
    `SELECT id, name FROM users WHERE name NOT LIKE 'Integration User%' AND name NOT LIKE 'Test Admin%' ORDER BY id`
  );

  console.log(`\n[Badges] Reprocessando ${users.length} usuário(s) real(is)...\n`);

  await conn.end();

  // Importar e executar calculateAndAssignBadges para cada usuário
  const { calculateAndAssignBadges } = await import("../server/badges.ts").catch(async () => {
    // Fallback: usar via tRPC admin endpoint
    return null;
  });

  if (!calculateAndAssignBadges) {
    console.log("[Badges] Não foi possível importar badges.ts diretamente.");
    console.log("[Badges] Use o botão 'Recalcular todos os badges' no painel Admin → Conquistas.");
    process.exit(0);
  }

  for (const user of users) {
    try {
      await calculateAndAssignBadges(user.id);
      console.log(`  ✓ Usuário ${user.id} (${user.name}) — badges recalculados`);
    } catch (err) {
      console.error(`  ✗ Usuário ${user.id} (${user.name}) — erro: ${err.message}`);
    }
  }

  console.log("\n[Badges] Reprocessamento concluído!");
}

main().catch(console.error);
