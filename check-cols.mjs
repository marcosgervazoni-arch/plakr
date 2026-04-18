import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute("SHOW COLUMNS FROM platform_settings LIKE 'stripePriceIdVip'");
console.log('stripePriceIdVip found:', JSON.stringify(rows));
const [rows2] = await conn.execute("SHOW COLUMNS FROM platform_settings LIKE 'stripeVipMonthlyPrice'");
console.log('stripeVipMonthlyPrice found:', JSON.stringify(rows2));
await conn.end();
