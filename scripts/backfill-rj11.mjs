// RJ-1.1 backfill: link Clerk ids to users and give every platform connection a
// numeric owner (user_id) and an establishment.
//
// Usage:
//   DATABASE_URL=... CLERK_SECRET_KEY=... node scripts/backfill-rj11.mjs          (dry run, default)
//   DATABASE_URL=... CLERK_SECRET_KEY=... node scripts/backfill-rj11.mjs --apply  (writes)
//
// Run migrations/20261116_rj11_identity.sql first (npm run migrate:rj11).
// Create a Neon branch (backup) before running with --apply.

import { Pool, neonConfig } from "@neondatabase/serverless";
import { createClerkClient } from "@clerk/backend";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes("--apply");
const { DATABASE_URL, CLERK_SECRET_KEY } = process.env;
if (!DATABASE_URL || !CLERK_SECRET_KEY) {
  console.error("DATABASE_URL and CLERK_SECRET_KEY are required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const stats = {
  clerkIds: 0,
  usersLinked: 0,
  usersAlreadyLinked: 0,
  conflicts: 0,
  noVerifiedEmail: 0,
  noMatchingUser: 0,
  clerkErrors: 0,
  connectionsOwned: 0,
  oauthStatesOwned: 0,
  establishmentsCreated: 0,
  connectionsGivenEstablishment: 0,
  duplicatesDisabled: 0,
};

const mode = APPLY ? "APPLY" : "DRY RUN";
console.log(`\n=== RJ-1.1 backfill (${mode}) ===\n`);

// Clerk id -> users.id resolved in step 1 (used so the dry run can preview step 2 accurately).
const ownerByClerkId = new Map();

async function write(sql, params) {
  if (APPLY) await pool.query(sql, params);
}

try {
  // ---------------------------------------------------------------------------
  // 1. Clerk id -> users.clerk_user_id, and user_id on connections / oauth states
  // ---------------------------------------------------------------------------
  const { rows: externalIds } = await pool.query(`
    SELECT user_external_id AS id FROM social_platform_connections
    UNION
    SELECT user_external_id AS id FROM oauth_states
  `);
  stats.clerkIds = externalIds.length;

  for (const { id: clerkUserId } of externalIds) {
    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (err) {
      stats.clerkErrors++;
      console.warn(`  ! Clerk lookup failed for ${clerkUserId}: ${err?.message || err}`);
      continue;
    }

    const primary = clerkUser.primaryEmailAddress;
    const email = primary?.emailAddress?.toLowerCase();
    if (!email || primary?.verification?.status !== "verified") {
      stats.noVerifiedEmail++;
      console.warn(`  ! ${clerkUserId}: no verified primary email, skipped`);
      continue;
    }

    const { rows: matches } = await pool.query(
      `SELECT id, clerk_user_id FROM users WHERE lower(email) = $1 ORDER BY id`,
      [email],
    );
    if (matches.length === 0) {
      stats.noMatchingUser++;
      console.warn(`  ! ${clerkUserId}: no users row for ${email}`);
      continue;
    }
    if (matches.length > 1) {
      stats.conflicts++;
      console.warn(`  ! ${clerkUserId}: ${matches.length} users rows share ${email}; resolve manually`);
      continue;
    }

    const user = matches[0];
    if (user.clerk_user_id && user.clerk_user_id !== clerkUserId) {
      stats.conflicts++;
      console.warn(`  ! user ${user.id} (${email}) already linked to ${user.clerk_user_id}, not ${clerkUserId}`);
      continue;
    }
    ownerByClerkId.set(clerkUserId, user.id);
    if (user.clerk_user_id === clerkUserId) {
      stats.usersAlreadyLinked++;
    } else {
      stats.usersLinked++;
      console.log(`  + link user ${user.id} (${email}) -> ${clerkUserId}`);
      await write(`UPDATE users SET clerk_user_id = $1, updated_at = now() WHERE id = $2`, [clerkUserId, user.id]);
    }

    const conn = await pool.query(
      `SELECT count(*)::int AS n FROM social_platform_connections WHERE user_external_id = $1 AND user_id IS NULL`,
      [clerkUserId],
    );
    stats.connectionsOwned += conn.rows[0].n;
    await write(
      `UPDATE social_platform_connections SET user_id = $1 WHERE user_external_id = $2 AND user_id IS NULL`,
      [user.id, clerkUserId],
    );

    const states = await pool.query(
      `SELECT count(*)::int AS n FROM oauth_states WHERE user_external_id = $1 AND user_id IS NULL`,
      [clerkUserId],
    );
    stats.oauthStatesOwned += states.rows[0].n;
    await write(`UPDATE oauth_states SET user_id = $1 WHERE user_external_id = $2 AND user_id IS NULL`, [
      user.id,
      clerkUserId,
    ]);
  }

  // ---------------------------------------------------------------------------
  // 2 + 3. Establishments and duplicates
  // ---------------------------------------------------------------------------
  // The unique index social_platform_user_unique is (user_external_id, platform,
  // establishment_id). Giving a NULL-establishment row the owner's establishment
  // collides when another row already holds that slot, so duplicates are resolved
  // FIRST: per (user_external_id, platform, target establishment) keep the connected,
  // most recently updated row; the others are disconnected and their
  // establishment_id is set to NULL (rows are kept, never deleted).
  if (!APPLY) {
    console.log("  (steps 2-3 only run with --apply; they need user_id written by step 1)");
  } else {
    const created = await pool.query(`
      INSERT INTO establishments (user_id, name, brand_tone)
      SELECT DISTINCT u.id, COALESCE(NULLIF(trim(u.company_name), ''), 'O meu negócio'), 'profissional'
      FROM social_platform_connections c
      JOIN users u ON u.id = c.user_id
      WHERE c.establishment_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM establishments e WHERE e.user_id = u.id)
    `);
    stats.establishmentsCreated = created.rowCount ?? 0;

    const dupes = await pool.query(`
      UPDATE social_platform_connections s
      SET status = 'disconnected', establishment_id = NULL, updated_at = now()
      FROM (
        SELECT id, row_number() OVER (
          PARTITION BY user_external_id, platform, target
          ORDER BY (status = 'connected') DESC, updated_at DESC, id DESC
        ) AS rn
        FROM (
          SELECT c.id, c.user_external_id, c.platform, c.status, c.updated_at,
                 COALESCE(c.establishment_id,
                          (SELECT min(e.id) FROM establishments e WHERE e.user_id = c.user_id)) AS target
          FROM social_platform_connections c
          WHERE c.user_id IS NOT NULL
        ) x
      ) r
      WHERE s.id = r.id AND r.rn > 1
    `);
    stats.duplicatesDisabled = dupes.rowCount ?? 0;

    const assigned = await pool.query(`
      UPDATE social_platform_connections c
      SET establishment_id = (SELECT min(e.id) FROM establishments e WHERE e.user_id = c.user_id)
      WHERE c.establishment_id IS NULL
        AND c.user_id IS NOT NULL
        AND c.status <> 'disconnected'
    `);
    stats.connectionsGivenEstablishment = assigned.rowCount ?? 0;
  }

  console.log("\n=== Summary ===");
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(32)} ${v}`);
  console.log(APPLY ? "\nChanges written.\n" : "\nDry run only. Re-run with --apply to write.\n");
} finally {
  await pool.end();
}
