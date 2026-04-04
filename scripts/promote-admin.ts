// Script de promoção de admin via drizzle direto
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const pool = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(pool);

// Verificar usuário
const found = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
  .from(users)
  .where(eq(users.id, 1411418));

console.log("Usuário encontrado:", JSON.stringify(found, null, 2));

if (found.length > 0) {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, 1411418));
  const updated = await db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, 1411418));
  console.log("✅ Promovido a admin:", JSON.stringify(updated, null, 2));
} else {
  // Listar todos os usuários
  const all = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .limit(10);
  console.log("Usuários no banco:", JSON.stringify(all, null, 2));
}

await pool.end();
