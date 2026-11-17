/**
 * Backoffice do operador (/api/backoffice). Dados reais da base de dados.
 * Substitui, aos poucos, os painéis antigos com dados inventados (RJ-5.2).
 */
import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { adminAuditLog, users } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { platformRole, recordBackofficeSession, requireOperator } from "../middleware/roles.js";

const router = Router();
router.use(requireAuth, requireOperator);

// Quem sou eu no backoffice.
router.get("/me", async (req: any, res) => {
  await recordBackofficeSession(req).catch(() => {});
  const u = req.user;
  res.json({
    id: u.id,
    email: u.email,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    role: platformRole(u),
  });
});

// Visão geral: números reais de clientes (exclui operadores).
router.get("/overview", async (_req, res) => {
  const customer = sql`coalesce(${users.isAdmin}, false) = false and coalesce(${users.isSuperAdmin}, false) = false`;
  const [totals] = await db
    .select({
      customers: sql<number>`count(*)::int`,
      active7d: sql<number>`count(*) filter (where ${users.lastLoginAt} > now() - interval '7 days')::int`,
      new30d: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '30 days')::int`,
      withStripe: sql<number>`count(*) filter (where ${users.stripeSubscriptionId} is not null)::int`,
    })
    .from(users)
    .where(customer);
  const byPlan = await db
    .select({ plan: sql<string>`coalesce(${users.subscriptionPlan}, 'trial')`, count: sql<number>`count(*)::int` })
    .from(users)
    .where(customer)
    .groupBy(sql`1`)
    .orderBy(sql`2 desc`);
  const [operators] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`coalesce(${users.isAdmin}, false) = true`);
  res.json({ ...totals, byPlan, operators: operators?.count ?? 0 });
});

// Últimas 100 ações registadas.
router.get("/audit", async (_req, res) => {
  const rows = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      createdAt: adminAuditLog.createdAt,
      details: adminAuditLog.details,
      actorEmail: users.email,
      targetUserId: adminAuditLog.targetUserId,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(users.id, adminAuditLog.actorUserId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(100);
  res.json(rows);
});

export default router;
