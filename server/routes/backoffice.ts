/**
 * Backoffice do operador (/api/backoffice). Dados reais da base de dados.
 * Substitui, aos poucos, os painéis antigos com dados inventados (RJ-5.2).
 */
import { Router } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db.js";
import { adminAuditLog, creditTransactions, establishments, responses, socialPlatformConnections, users } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { isOperator, platformRole, recordAdminAction, recordBackofficeSession, requireOperator } from "../middleware/roles.js";

const router = Router();
router.use(requireAuth, requireOperator);

// Quadro de operadores e transferência de super administrador (ver backoffice-operators.ts).
import operatorsRouter from "./backoffice-operators.js";
router.use("/operators", operatorsRouter);

// RJ-8.2: erros técnicos agrupados (servidor e navegador).
router.get("/app-errors", async (req: any, res) => {
  const showResolved = req.query.resolved === "1";
  const { rows } = await db.execute(sql`
    SELECT e.id, e.source, e.kind, e.message, e.path, e.count, e.first_seen, e.last_seen, e.resolved_at, e.sample,
           u.email AS last_user_email
    FROM app_errors e LEFT JOIN users u ON u.id = e.last_user_id
    WHERE ${showResolved ? sql`true` : sql`e.resolved_at IS NULL`}
    ORDER BY e.last_seen DESC
    LIMIT 200`);
  res.json(rows);
});

router.post("/app-errors/:id/resolve", async (req: any, res) => {
  const id = Number(req.params.id);
  try {
    const { rows } = await db.execute(sql`UPDATE app_errors SET resolved_at = now() WHERE id = ${id} RETURNING id`);
    console.log(`[saude-tecnica] erro ${id} marcado como visto por ${req.user?.email}: ${rows.length} linha(s)`);
    if (!rows.length) return res.status(404).json({ message: "Erro técnico não encontrado." });
    // O registo de auditoria não pode impedir a marcação.
    await recordAdminAction(req, "app_error_resolved", { details: { id } }).catch((e: any) =>
      console.warn("[saude-tecnica] auditoria falhou:", e?.message));
    res.json({ ok: true });
  } catch (error: any) {
    console.error("[saude-tecnica] marcar como visto falhou:", error?.cause?.message || error?.message);
    res.status(500).json({ message: "Não foi possível marcar como visto." });
  }
});

// Inbox de erros e indicadores (RJ-5.6, ver backoffice-incidents.ts).
import incidentsRouter from "./backoffice-incidents.js";
router.use("/incidents", incidentsRouter);

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
  const customer = sql`coalesce(${users.isAdmin}, false) = false and coalesce(${users.isSuperAdmin}, false) = false and ${users.isSandbox} = false`;
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

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
const PLANS = ["trial", "starter", "pro", "agency"] as const;
const isCustomerSql = sql`coalesce(${users.isAdmin}, false) = false and coalesce(${users.isSuperAdmin}, false) = false and ${users.isSandbox} = false`;

router.get("/customers", async (req: any, res) => {
  const q = String(req.query.q || "").trim();
  const plan = String(req.query.plan || "").trim();
  const conditions = [isCustomerSql];
  if (q) conditions.push(or(ilike(users.email, `%${q}%`), ilike(users.firstName, `%${q}%`), ilike(users.lastName, `%${q}%`), ilike(users.companyName, `%${q}%`))!);
  if (plan && (PLANS as readonly string[]).includes(plan)) conditions.push(sql`coalesce(${users.subscriptionPlan}, 'trial') = ${plan}`);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      companyName: users.companyName,
      plan: sql<string>`coalesce(${users.subscriptionPlan}, 'trial')`,
      credits: users.credits,
      creditsUsedThisPeriod: users.creditsUsedThisPeriod,
      isActive: users.isActive,
      hasStripe: sql<boolean>`${users.stripeSubscriptionId} is not null`,
      currentPeriodEnd: users.currentPeriodEnd,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      establishments: sql<number>`(select count(*)::int from ${establishments} e where e.user_id = ${users.id})`,
      connections: sql<number>`(select count(*)::int from ${socialPlatformConnections} c where c.user_id = ${users.id} and c.status = 'connected')`,
      generations30d: sql<number>`(select count(*)::int from ${responses} r where r.user_id = ${users.id} and r.created_at > now() - interval '30 days')`,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(200);
  res.json(rows);
});

async function loadCustomer(req: any, res: any) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Cliente inválido." });
    return null;
  }
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) {
    res.status(404).json({ message: "Cliente não encontrado." });
    return null;
  }
  if (isOperator(user) || user.isSandbox) {
    // Operadores geridos só no quadro de operadores (super administrador).
    res.status(403).json({ message: "Esta conta é de um operador." });
    return null;
  }
  return user;
}

router.get("/customers/:id", async (req: any, res) => {
  const user = await loadCustomer(req, res);
  if (!user) return;
  const [ests, conns, txs] = await Promise.all([
    db.select({ id: establishments.id, name: establishments.name, createdAt: establishments.createdAt })
      .from(establishments).where(eq(establishments.userId, user.id)),
    db.select({
      id: socialPlatformConnections.id,
      platform: socialPlatformConnections.platform,
      status: socialPlatformConnections.status,
      establishmentId: socialPlatformConnections.establishmentId,
      lastSyncAt: socialPlatformConnections.lastSyncAt,
      meta: socialPlatformConnections.meta,
    }).from(socialPlatformConnections).where(eq(socialPlatformConnections.userId, user.id)),
    db.select().from(creditTransactions).where(eq(creditTransactions.userId, user.id))
      .orderBy(desc(creditTransactions.createdAt)).limit(20),
  ]);
  await recordAdminAction(req, "customer_view", { targetUserId: user.id });
  res.json({
    id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    companyName: user.companyName,
    plan: user.subscriptionPlan || "trial",
    credits: user.credits,
    creditsUsedThisPeriod: user.creditsUsedThisPeriod,
    isActive: user.isActive,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    currentPeriodStart: user.currentPeriodStart,
    currentPeriodEnd: user.currentPeriodEnd,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    establishments: ests,
    connections: conns.map((c) => ({ ...c, lastSync: (c.meta as any)?.lastSync ?? null, meta: undefined })),
    creditTransactions: txs,
  });
});

function requireReason(req: any, res: any): string | null {
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 3) {
    res.status(400).json({ message: "Indica o motivo (mínimo 3 caracteres)." });
    return null;
  }
  return reason.slice(0, 500);
}

// Ajustar créditos (+ ou -). Fica no histórico de créditos do cliente e no registo de ações.
router.post("/customers/:id/credits", async (req: any, res) => {
  const user = await loadCustomer(req, res);
  if (!user) return;
  const reason = requireReason(req, res);
  if (!reason) return;
  const delta = Number(req.body?.delta);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
    return res.status(400).json({ message: "Valor de créditos inválido." });
  }
  const before = Number(user.credits ?? 0);
  const after = Math.max(0, before + delta);
  await db.update(users).set({ credits: after, updatedAt: new Date() }).where(eq(users.id, user.id));
  await db.insert(creditTransactions).values({
    userId: user.id,
    type: delta > 0 ? "bonus" : "adjustment",
    amount: after - before,
    description: `Backoffice (${req.user.email}): ${reason}`,
  });
  await recordAdminAction(req, "customer_credits", { targetUserId: user.id, details: { before, after, delta, reason } });
  res.json({ ok: true, credits: after });
});

// Mudar o plano. Sem subscrição Stripe, o plano vale até à data indicada (por omissão, 30 dias).
router.post("/customers/:id/plan", async (req: any, res) => {
  const user = await loadCustomer(req, res);
  if (!user) return;
  const reason = requireReason(req, res);
  if (!reason) return;
  const plan = String(req.body?.plan || "");
  if (!(PLANS as readonly string[]).includes(plan)) return res.status(400).json({ message: "Plano inválido." });
  const until = req.body?.until ? new Date(req.body.until) : new Date(Date.now() + 30 * 86400000);
  if (Number.isNaN(until.getTime()) || until.getTime() < Date.now()) {
    return res.status(400).json({ message: "Data de fim inválida." });
  }
  const before = { plan: user.subscriptionPlan, currentPeriodEnd: user.currentPeriodEnd };
  await db.update(users).set({
    subscriptionPlan: plan,
    selectedPlan: plan,
    currentPeriodStart: new Date(),
    currentPeriodEnd: until,
    creditsUsedThisPeriod: 0,
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));
  await recordAdminAction(req, "customer_plan", { targetUserId: user.id, details: { before, plan, until: until.toISOString(), reason, hasStripe: !!user.stripeSubscriptionId } });
  res.json({ ok: true });
});

// Suspender ou reativar o acesso.
router.post("/customers/:id/active", async (req: any, res) => {
  const user = await loadCustomer(req, res);
  if (!user) return;
  const reason = requireReason(req, res);
  if (!reason) return;
  const active = req.body?.active === true;
  await db.update(users).set({ isActive: active, updatedAt: new Date() }).where(eq(users.id, user.id));
  await recordAdminAction(req, active ? "customer_reactivate" : "customer_suspend", { targetUserId: user.id, details: { reason } });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Uso da IA (gerações = linhas em responses)
// ---------------------------------------------------------------------------
router.get("/ai-usage", async (_req, res) => {
  const daily = await db.execute(sql`
    select to_char(d, 'YYYY-MM-DD') as day, coalesce(count(r.id), 0)::int as generations
    from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
    left join ${responses} r on r.created_at >= d and r.created_at < d + interval '1 day'
      and r.user_id not in (select id from ${users} where is_sandbox)
    group by d order by d`);
  const top = await db.execute(sql`
    select u.id, u.email, count(r.id)::int as generations, coalesce(sum(r.credits_used), 0)::int as credits
    from ${responses} r join ${users} u on u.id = r.user_id
    where r.created_at > now() - interval '30 days' and not u.is_sandbox
    group by u.id, u.email order by generations desc limit 10`);
  const byModel = await db.execute(sql`
    select coalesce(ai_model, 'desconhecido') as model, count(*)::int as generations
    from ${responses} where created_at > now() - interval '30 days' group by 1 order by 2 desc`);
  const costPerGeneration = Number(process.env.AI_COST_PER_GENERATION_EUR || "");
  res.json({
    daily: (daily as any).rows ?? daily,
    top: (top as any).rows ?? top,
    byModel: (byModel as any).rows ?? byModel,
    costPerGenerationEur: Number.isFinite(costPerGeneration) && costPerGeneration > 0 ? costPerGeneration : null,
  });
});

// ---------------------------------------------------------------------------
// Sincronizações
// ---------------------------------------------------------------------------
router.get("/cron-runs", async (_req, res) => {
  const rows = await db.select({ createdAt: adminAuditLog.createdAt, details: adminAuditLog.details })
    .from(adminAuditLog).where(eq(adminAuditLog.action, "cron_sync"))
    .orderBy(desc(adminAuditLog.createdAt)).limit(14);
  res.json(rows);
});

router.get("/sync", async (_req, res) => {
  const rows = await db
    .select({
      id: socialPlatformConnections.id,
      platform: socialPlatformConnections.platform,
      status: socialPlatformConnections.status,
      lastSyncAt: socialPlatformConnections.lastSyncAt,
      tokenExpiresAt: socialPlatformConnections.tokenExpiresAt,
      meta: socialPlatformConnections.meta,
      userId: users.id,
      email: users.email,
      establishmentId: socialPlatformConnections.establishmentId,
    })
    .from(socialPlatformConnections)
    .leftJoin(users, eq(users.id, socialPlatformConnections.userId))
    .where(sql`${socialPlatformConnections.status} <> 'disconnected' and coalesce(${socialPlatformConnections.meta}->>'mode', '') <> 'sandbox'`)
    .orderBy(desc(socialPlatformConnections.lastSyncAt))
    .limit(300);
  res.json(rows.map((r) => {
    const m: any = r.meta || {};
    const last = m.lastSync ?? (typeof m.ok === "boolean" ? m : null);
    return { ...r, meta: undefined, lastOk: last ? !!last.ok : null, lastError: last?.error ?? null, lastImported: last?.imported ?? null };
  }));
});

// ---------------------------------------------------------------------------
// Sandboxes ("Ver como cliente")
// ---------------------------------------------------------------------------
router.get("/sandboxes", async (_req, res) => {
  const { SANDBOXES, getSandboxUser, sandboxGenerationsToday, SANDBOX_DAILY_AI_LIMIT } = await import("../services/sandbox.js");
  const list = await Promise.all(SANDBOXES.map(async (s) => {
    const u = await getSandboxUser(s.key);
    let counts = { establishments: 0, reviews: 0 };
    if (u) {
      const [row] = await db.select({
        establishments: sql<number>`count(distinct ${establishments.id})::int`,
        reviews: sql<number>`(select count(*)::int from reviews r join establishments e2 on e2.id = r.establishment_id where e2.user_id = ${u.id})`,
      }).from(establishments).where(eq(establishments.userId, u.id));
      counts = row ?? counts;
    }
    return { key: s.key, label: s.label, description: s.description, plan: s.plan, userId: u?.id ?? null, ...counts };
  }));
  res.json({ sandboxes: list, aiToday: await sandboxGenerationsToday(), aiLimit: SANDBOX_DAILY_AI_LIMIT });
});

router.post("/sandboxes/:key/enter", async (req: any, res) => {
  const { SANDBOXES, ensureSandboxSeeded } = await import("../services/sandbox.js");
  const def = SANDBOXES.find((s) => s.key === req.params.key);
  if (!def) return res.status(404).json({ message: "Sandbox desconhecida." });
  const user = await ensureSandboxSeeded(def.key);
  if (!user) return res.status(500).json({ message: "Conta-sandbox em falta." });
  await recordAdminAction(req, "view_as_start", { targetUserId: user.id, details: { sandbox: def.key } });
  res.json({ userId: user.id, label: def.label });
});

router.post("/sandboxes/:key/reset", async (req: any, res) => {
  const { SANDBOXES, resetSandbox, getSandboxUser } = await import("../services/sandbox.js");
  const def = SANDBOXES.find((s) => s.key === req.params.key);
  if (!def) return res.status(404).json({ message: "Sandbox desconhecida." });
  try {
    // O membro depende da agência: repor um repõe os dois.
    await resetSandbox(def.key === "membro" ? "agencia" : def.key);
    const user = await getSandboxUser(def.key);
    await recordAdminAction(req, "sandbox_reset", { targetUserId: user?.id ?? null, details: { sandbox: def.key } });
    res.json({ ok: true });
  } catch (error: any) {
    console.error("[backoffice] sandbox reset failed:", def.key, error?.message);
    res.status(500).json({ message: `Não foi possível repor a sandbox: ${error?.message}` });
  }
});

export default router;
