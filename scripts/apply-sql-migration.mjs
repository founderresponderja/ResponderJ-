import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error("Usage: node scripts/apply-sql-migration.mjs <migration-file>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationPath = resolve(process.cwd(), migrationArg);
const sql = await readFile(migrationPath, "utf8");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

try {
  await pool.query(sql);
  console.log(`Migration applied: ${migrationArg}`);
} finally {
  await pool.end();
}
