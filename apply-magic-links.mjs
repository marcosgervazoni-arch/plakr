import { createConnection } from "mysql2/promise";
const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute(`CREATE TABLE IF NOT EXISTS \`magic_links\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`token\` varchar(128) NOT NULL,
  \`returnPath\` varchar(500) NOT NULL DEFAULT '/dashboard',
  \`expiresAt\` timestamp NOT NULL,
  \`usedAt\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`magic_links_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`magic_links_token_unique\` UNIQUE(\`token\`)
)`);
await conn.execute(`CREATE INDEX IF NOT EXISTS \`idx_magic_links_email\` ON \`magic_links\` (\`email\`)`).catch(() => {});
await conn.execute(`CREATE INDEX IF NOT EXISTS \`idx_magic_links_token\` ON \`magic_links\` (\`token\`)`).catch(() => {});
console.log("✅ Tabela magic_links criada com sucesso");
await conn.end();
