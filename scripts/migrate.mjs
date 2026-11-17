// Responder Já — database migration runner (RJ-1.5)
//
// One source of truth: every schema change is a .sql file in migrations/, applied once,
// in filename order, and recorded in the schema_migrations table.
//
// Usage:
//   node scripts/migrate.mjs            apply pending migrations (needs DATABASE_URL)
//   node scripts/migrate.mjs --status   list applied / pending, change nothing
//   node scripts/migrate.mjs --auto     used by `npm run build`: runs only on Vercel
//                                       production builds (VERCEL_ENV=production) and
//                                       skips everywhere else, so previews and local
//                                       builds never touch the production database.
//
// Rules (see docs/MIGRATIONS.md):
//   - Name files YYYYMMDD_NN_description.sql (NN orders files of the same day).
//   - Never edit a migration after it has been applied: the runner stores a checksum
//     and stops the build if an applied file changes. Write a new migration instead.
//   - Each file runs inside a transaction. Put "-- migrate:no-transaction" on the first
//     line for statements that cannot run in one (e.g. CREATE INDEX CONCURRENTLY).
//   - Migrations run BEFORE the new code goes live, while the old code is still serving.
//     Make them backward compatible (add first, remove in a later deploy).

import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const args = new Set(process.argv.slice(2));
const STATUS_ONLY = args.has("--status");
const AUTO = args.has("--auto");

// Files that were applied by hand before this runner existed. On the very first run
// they are recorded as applied WITHOUT being executed again.
const BASELINE = new Set([
  "20260409_agency_mode_multi_business.sql",
  "20260409_ai_engine_approval_learning.sql",
  "20261116_rj11_identity.sql",
]);

const MIGRATIONS_DIR = resolve(process.cwd(), "migrations");
// Arbitrary constant: serialises concurrent runs (two deploys at once).
const LOCK_KEY = 704112026;

if (AUTO) {
  if (process.env.VERCEL_ENV !== "production") {
    console.log(`[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV || "unset"}; runs only on production builds)`);
    process.exit(0);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[migrate] DATABASE_URL is missing on a production build; refusing to deploy without migrations.");
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
}

const checksum = (text) => createHash("sha256").update(text).digest("hex");

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

  const { rows: existing } = await client.query(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present`,
  );
  const firstRun = !existing[0].present;

  if (firstRun && !STATUS_ONLY) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now(),
        baseline boolean NOT NULL DEFAULT false
      )
    `);
    for (const name of files.filter((f) => BASELINE.has(f))) {
      const sql = await readFile(resolve(MIGRATIONS_DIR, name), "utf8");
      await client.query(
        `INSERT INTO schema_migrations (name, checksum, baseline) VALUES ($1, $2, true)
         ON CONFLICT (name) DO NOTHING`,
        [name, checksum(sql)],
      );
      console.log(`[migrate] baseline (already applied by hand): ${name}`);
    }
  }

  const applied = new Map();
  if (!firstRun || !STATUS_ONLY) {
    const { rows } = await client.query(`SELECT name, checksum FROM schema_migrations`);
    for (const r of rows) applied.set(r.name, r.checksum);
  } else {
    for (const f of files) if (BASELINE.has(f)) applied.set(f, null);
  }

  // Applied files must not have changed.
  for (const name of files) {
    if (!applied.has(name) || applied.get(name) === null) continue;
    const sql = await readFile(resolve(MIGRATIONS_DIR, name), "utf8");
    if (checksum(sql) !== applied.get(name)) {
      throw new Error(
        `${name} was changed after being applied. Revert the edit and put the change in a new migration file.`,
      );
    }
  }

  const pending = files.filter((f) => !applied.has(f));

  if (STATUS_ONLY) {
    for (const f of files) console.log(`  ${applied.has(f) ? "applied" : "PENDING"}  ${f}`);
    console.log(`\n[migrate] ${pending.length} pending${firstRun ? " (schema_migrations not created yet)" : ""}`);
  } else if (pending.length === 0) {
    console.log("[migrate] database is up to date");
  } else {
    for (const name of pending) {
      const sql = await readFile(resolve(MIGRATIONS_DIR, name), "utf8");
      const transactional = !sql.trimStart().startsWith("-- migrate:no-transaction");
      console.log(`[migrate] applying ${name}${transactional ? "" : " (no transaction)"}`);
      try {
        if (transactional) await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)`, [name, checksum(sql)]);
        if (transactional) await client.query("COMMIT");
      } catch (err) {
        if (transactional) await client.query("ROLLBACK").catch(() => {});
        throw new Error(`${name} failed: ${err?.message || err}`);
      }
    }
    console.log(`[migrate] applied ${pending.length} migration(s)`);
  }
} catch (err) {
  console.error(`[migrate] FAILED: ${err?.message || err}`);
  process.exitCode = 1;
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
  client.release();
  await pool.end();
}
