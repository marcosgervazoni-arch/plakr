import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL não definida'); process.exit(1); }

const conn = await mysql.createConnection(url);

// Verificar usuário atual
const [rows] = await conn.execute(
  "SELECT id, name, email, role FROM users WHERE id = 1411418"
);
console.log('Usuário encontrado:', JSON.stringify(rows, null, 2));

if (rows.length === 0) {
  // Tentar buscar por nome
  const [all] = await conn.execute(
    "SELECT id, name, email, role FROM users ORDER BY id LIMIT 10"
  );
  console.log('Primeiros 10 usuários:', JSON.stringify(all, null, 2));
} else {
  // Promover a admin
  await conn.execute(
    "UPDATE users SET role = 'admin' WHERE id = 1411418"
  );
  const [updated] = await conn.execute(
    "SELECT id, name, email, role FROM users WHERE id = 1411418"
  );
  console.log('Usuário atualizado:', JSON.stringify(updated, null, 2));
}

await conn.end();
