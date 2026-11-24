// RJ-7.3: limpeza diária dos dados que já passaram do prazo (chamada pelo agendamento diário).
// Não apaga contas: as contas gratuitas inativas são só contadas e aparecem no registo do agendamento.
import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { cutoffs } from "./retention-logic.js";

const count = (r: any) => Number(r?.rowCount ?? r?.rows?.length ?? 0);

export async function runRetention(now = new Date()) {
  const c = cutoffs(now);
  const deleted: Record<string, number> = {};
  const run = async (key: string, query: any) => {
    try { deleted[key] = count(await db.execute(query)); }
    catch (err: any) { deleted[key] = -1; console.error(`[retention] ${key} failed:`, err?.message); }
  };

  await run("appErrors", sql`DELETE FROM app_errors WHERE COALESCE(resolved_at, last_seen) < ${c.appErrors}`);
  await run("stripeEvents", sql`DELETE FROM stripe_events WHERE received_at < ${c.stripeEvents}`);
  await run("invitations", sql`DELETE FROM agency_invitations
    WHERE (status <> 'pending' AND COALESCE(accepted_at, created_at) < ${c.invitations})
       OR (expires_at < ${c.invitations})`);
  await run("oauthStates", sql`DELETE FROM oauth_states WHERE expires_at < ${c.oauthStates}`);
  await run("incidents", sql`DELETE FROM incidents WHERE resolved_at IS NOT NULL AND resolved_at < ${c.incidents}`);
  await run("emailLog", sql`DELETE FROM email_log WHERE sent_at < ${c.emailLog}`);
  await run("auditLog", sql`DELETE FROM admin_audit_log WHERE created_at < ${c.auditLog}`);

  let inactiveFreeAccounts = 0;
  try {
    const r: any = await db.execute(sql`SELECT count(*)::int AS n FROM users
      WHERE COALESCE(subscription_plan, 'trial') IN ('trial', 'free')
        AND COALESCE(last_login_at, created_at) < ${c.inactiveFreeAccounts}
        AND email NOT LIKE '%@sandbox.responderja.invalid'`);
    inactiveFreeAccounts = Number(r?.rows?.[0]?.n ?? 0);
  } catch (err: any) {
    inactiveFreeAccounts = -1;
    console.error("[retention] inactive accounts count failed:", err?.message);
  }

  console.log("[retention]", JSON.stringify({ deleted, inactiveFreeAccounts }));
  return { deleted, inactiveFreeAccounts };
}
