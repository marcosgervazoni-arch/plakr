import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);

// Criar tabela
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`ai_daily_usage\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`date\` varchar(10) NOT NULL,
    \`count\` int NOT NULL DEFAULT 0,
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`ai_daily_usage_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`uq_ai_daily_usage\` UNIQUE(\`userId\`,\`date\`)
  )
`);

// Verificar se FK já existe antes de adicionar (TiDB não suporta IF NOT EXISTS em ALTER TABLE)
const [fks] = await conn.execute(`
  SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ai_daily_usage'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND CONSTRAINT_NAME = 'ai_daily_usage_userId_users_id_fk'
`);

if (fks.length === 0) {
  await conn.execute(`
    ALTER TABLE \`ai_daily_usage\` 
    ADD CONSTRAINT \`ai_daily_usage_userId_users_id_fk\` 
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  `);
  console.log("\u2705 FK adicionada");
} else {
  console.log("\u2139\ufe0f  FK já existe, pulando");
}

// Verificar se índice já existe
const [idxs] = await conn.execute(`
  SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ai_daily_usage'
  AND INDEX_NAME = 'idx_ai_daily_usage_user'
`);

if (idxs.length === 0) {
  await conn.execute(`
    CREATE INDEX \`idx_ai_daily_usage_user\` ON \`ai_daily_usage\` (\`userId\`)
  `);
  console.log("\u2705 Índice criado");
} else {
  console.log("\u2139\ufe0f  Índice já existe, pulando");
}

console.log("\u2705 Tabela ai_daily_usage pronta!");
await conn.end();
