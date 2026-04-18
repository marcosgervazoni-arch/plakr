import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`pool_invites\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`token\` varchar(128) NOT NULL,
    \`poolId\` int NOT NULL,
    \`invitedEmail\` varchar(255) NOT NULL,
    \`invitedBy\` int NOT NULL,
    \`expiresAt\` timestamp NOT NULL,
    \`acceptedAt\` timestamp,
    \`acceptedByUserId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`pool_invites_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`pool_invites_token_unique\` UNIQUE(\`token\`)
  )`,
  `ALTER TABLE \`pool_invites\` ADD CONSTRAINT \`pool_invites_poolId_pools_id_fk\` FOREIGN KEY (\`poolId\`) REFERENCES \`pools\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE \`pool_invites\` ADD CONSTRAINT \`pool_invites_invitedBy_users_id_fk\` FOREIGN KEY (\`invitedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE \`pool_invites\` ADD CONSTRAINT \`pool_invites_acceptedByUserId_users_id_fk\` FOREIGN KEY (\`acceptedByUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `CREATE INDEX IF NOT EXISTS \`idx_pool_invites_token\` ON \`pool_invites\` (\`token\`)`,
  `CREATE INDEX IF NOT EXISTS \`idx_pool_invites_email\` ON \`pool_invites\` (\`invitedEmail\`)`,
  `CREATE INDEX IF NOT EXISTS \`idx_pool_invites_pool\` ON \`pool_invites\` (\`poolId\`)`,
];

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_KEYNAME" || e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_FK_DUP_NAME") {
      console.log("SKIP (already exists):", stmt.slice(0, 60));
    } else {
      console.error("ERROR:", e.message, "\n  SQL:", stmt.slice(0, 80));
    }
  }
}

await conn.end();
console.log("Migration done.");
