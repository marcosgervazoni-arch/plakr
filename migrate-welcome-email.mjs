import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE users ADD COLUMN welcomeEmailSent boolean DEFAULT false NOT NULL");
  console.log("✅ Migration applied: welcomeEmailSent added to users table");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Column welcomeEmailSent already exists — skipping");
  } else {
    console.error("❌ Migration failed:", e.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
