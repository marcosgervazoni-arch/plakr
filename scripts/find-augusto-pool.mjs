import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar usuário Augusto
const [users] = await conn.execute(
  "SELECT id, name, email FROM users WHERE name LIKE '%augusto%' OR name LIKE '%Augusto%' OR email LIKE '%augusto%' OR email LIKE '%dalmas%'"
);
console.log('Usuário Augusto:', JSON.stringify(users, null, 2));

// Buscar bolão Wild Beer
const [pools] = await conn.execute(
  "SELECT id, name, slug FROM pools WHERE name LIKE '%wild%beer%' OR name LIKE '%Wild%Beer%' OR slug LIKE '%wild%' OR slug LIKE '%beer%'"
);
console.log('Bolão Wild Beer:', JSON.stringify(pools, null, 2));

await conn.end();
