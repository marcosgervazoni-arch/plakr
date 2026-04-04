/**
 * Script para limpar notificações de teste que vazaram para usuários reais.
 * Executar com: npx tsx scripts/clean-test-notifications.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import { like, inArray } from "drizzle-orm";
import { notifications, users } from "../drizzle/schema";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL não configurado");
    process.exit(1);
  }

  const db = drizzle(dbUrl);

  // 1. Buscar todas as notificações de teste
  const testNotifs = await db
    .select({ id: notifications.id, userId: notifications.userId, title: notifications.title, createdAt: notifications.createdAt })
    .from(notifications)
    .where(like(notifications.title, "%Integration Test%"));

  console.log(`\n📊 Notificações de teste encontradas: ${testNotifs.length}`);
  
  if (testNotifs.length === 0) {
    console.log("✅ Nenhuma notificação de teste encontrada. Banco limpo!");
    process.exit(0);
  }

  // 2. Mostrar detalhes
  const userIds = [...new Set(testNotifs.map(n => n.userId))];
  const affectedUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));

  console.log(`👥 Usuários afetados: ${affectedUsers.length}`);
  affectedUsers.forEach(u => console.log(`   - ${u.name} (${u.email})`));
  
  testNotifs.forEach(n => console.log(`   notif id=${n.id} userId=${n.userId} title="${n.title}" createdAt=${n.createdAt}`));

  // 3. Remover as notificações de teste
  const ids = testNotifs.map(n => n.id);
  await db.delete(notifications).where(inArray(notifications.id, ids));
  
  console.log(`\n✅ Removidas ${ids.length} notificações de teste com sucesso!`);
  process.exit(0);
}

main().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
