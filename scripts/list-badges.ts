import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { badges } from "../drizzle/schema";
import { asc } from "drizzle-orm";

const pool = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(pool);

const all = await db.select({
  id: badges.id,
  name: badges.name,
  category: badges.category,
  criterionType: badges.criterionType,
  criterionValue: badges.criterionValue,
  isActive: badges.isActive,
  isManual: badges.isManual,
}).from(badges).orderBy(asc(badges.category), asc(badges.id));

console.log(JSON.stringify(all, null, 2));
await pool.end();
