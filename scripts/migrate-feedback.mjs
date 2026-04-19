import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sqls = [
  `CREATE TABLE IF NOT EXISTS \`feedback_responses\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`type\` varchar(10) NOT NULL,
    \`context\` varchar(64) NOT NULL,
    \`score\` int NOT NULL,
    \`comment\` text,
    \`poolId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`feedback_responses_id\` PRIMARY KEY(\`id\`)
  )`,
  `ALTER TABLE \`feedback_responses\` ADD CONSTRAINT \`feedback_responses_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE \`feedback_responses\` ADD CONSTRAINT \`feedback_responses_poolId_pools_id_fk\` FOREIGN KEY (\`poolId\`) REFERENCES \`pools\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `CREATE INDEX \`idx_feedback_user\` ON \`feedback_responses\` (\`userId\`)`,
  `CREATE INDEX \`idx_feedback_type\` ON \`feedback_responses\` (\`type\`)`,
  `CREATE INDEX \`idx_feedback_context\` ON \`feedback_responses\` (\`context\`)`,
  `CREATE INDEX \`idx_feedback_created_at\` ON \`feedback_responses\` (\`createdAt\`)`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.slice(0, 60).replace(/\n/g, " "));
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_KEYNAME" || e.code === "ER_FK_DUP_NAME") {
      console.log("⚠ já existe, pulando:", e.code);
    } else {
      console.error("✗", e.message);
    }
  }
}

await conn.end();
console.log("Migration concluída.");
