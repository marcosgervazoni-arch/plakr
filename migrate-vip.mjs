import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

const statements = [
  "ALTER TABLE `user_plans` MODIFY COLUMN `plan` enum('free','pro','unlimited','vip') NOT NULL DEFAULT 'free'",
  "ALTER TABLE `platform_settings` ADD COLUMN `stripePriceIdVip` varchar(128)",
  "ALTER TABLE `platform_settings` ADD COLUMN `stripeVipMonthlyPrice` int DEFAULT 490",
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 70));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('SKIP (already exists):', sql.substring(0, 70));
    } else {
      console.error('ERROR:', e.message);
    }
  }
}

await conn.end();
console.log('Migration complete.');
