// RJ-5.6: inbox de erros no backoffice (operadores) e indicadores (super administrador).
// Montado em /api/backoffice/incidents (requireAuth + requireOperator já aplicados).

import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import { incidents, incidentAttachments, incidentEvents, users } from "../../shared/schema.js";
import { recordAdminAction, requireSuperAdmin } from "../middleware/roles.js";
import { logIncidentEvent, sendResolvedEmail } from "../services/incident-service.js";
import { CATEGORIES, SEVERITIES, STATUSES, SLA_BUSINESS_DAYS, dueDateFor, monthlySuccessRate, type Severity } from "../services/incident-logic.js";

const router = Router();

// Indicadores (só super administrador). Antes de "/:id" para não ser apanhado por essa rota.
router.get("/stats", requireSuperAdmin, async (_req, res) => {
  const rows = await db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(1000);
  const ids = rows.map((r) => r.id);
  const involvement = ids.length
    ? await db.select({ incidentId: incidentEvents.incidentId, actorUserId: incidentEvents.actorUserId })
        .from(incidentEvents)
        .where(and(inArray(incidentEvents.incidentId, ids), sql`${incidentEvents.actorUserId} is not null`, sql`${incidentEvents.type} <> 'created'`))
    : [];
  const actorIds = [...new Set(involvement.map((e) => e.actorUserId as number))];
  const people = actorIds.length ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, actorIds)) : [];
  const emailOf = new Map(people.map((p) => [p.id, p.email]));
  const operatorsBy = new Map<number, Set<string>>();
  for (const e of involvement) {
    const set = operatorsBy.get(e.incidentId) || new Set<string>();
    set.add(emailOf.get(e.actorUserId as number) || `#${e.actorUserId}`);
    operatorsBy.set(e.incidentId, set);
  }
  const list = rows.map((r) => ({
    id: r.id, summary: r.aiSummary || r.subject, category: r.category, severity: r.severity, status: r.status,
    createdAt: r.createdAt, dueAt: r.dueAt, resolvedAt: r.resolvedAt,
    onTime: r.resolvedAt ? new Date(r.resolvedAt).getTime() <= new Date(r.dueAt).getTime() : null,
    operators: [...(operatorsBy.get(r.id) || [])],
  }));
  const resolved = rows.filter((r) => r.resolvedAt);
  const onTime = resolved.filter((r) => new Date(r.resolvedAt as any).getTime() <= new Date(r.dueAt).getTime()).length;
  res.json({
    totals: {
      total: rows.length,
      open: rows.filter((r) => r.status !== "resolved").length,
      overdue: rows.filter((r) => r.status !== "resolved" && new Date(r.dueAt).getTime() < Date.now()).length,
      resolved: resolved.length,
      onTime,
      rate: resolved.length ? Math.round((onTime / resolved.length) * 1000) / 10 : null,
    },
    monthly: monthlySuccessRate(rows),
    list,
  });
});

// Inbox: lista com filtros.
router.get("/", async (req: any, res) => {
  const status = String(req.query.status || "");
  const severity = String(req.query.severity || "");
  const category = String(req.query.category || "");
  const conds: any[] = [];
  if (status === "active") conds.push(sql`${incidents.status} <> 'resolved'`);
  else if ((STATUSES as readonly string[]).includes(status)) conds.push(eq(incidents.status, status));
  if ((SEVERITIES as readonly string[]).includes(severity)) conds.push(eq(incidents.severity, severity));
  if ((CATEGORIES as readonly string[]).includes(category)) conds.push(eq(incidents.category, category));
  if (req.query.overdue === "1") conds.push(sql`${incidents.status} <> 'resolved' and ${incidents.dueAt} < now()`);

  const rows = await db.select({
    id: incidents.id, reporterEmail: incidents.reporterEmail, source: incidents.source, subject: incidents.subject,
    aiSummary: incidents.aiSummary, category: incidents.category, severity: incidents.severity, status: incidents.status,
    dueAt: incidents.dueAt, createdAt: incidents.createdAt, resolvedAt: incidents.resolvedAt, assignedTo: incidents.assignedTo,
    assignedEmail: users.email,
    attachments: sql<number>`(select count(*)::int from incident_attachments a where a.incident_id = ${incidents.id})`,
  }).from(incidents)
    .leftJoin(users, eq(users.id, incidents.assignedTo))
    .where(conds.length ? and(...conds) : undefined)
    // Primeiro os que vencem mais cedo.
    .orderBy(sql`case when ${incidents.status} = 'resolved' then 1 else 0 end`, asc(incidents.dueAt))
    .limit(200);
  res.json(rows);
});

router.get("/:id", async (req: any, res) => {
  const id = Number(req.params.id);
  const [inc] = await db.select().from(incidents).where(eq(incidents.id, id));
  if (!inc) return res.status(404).json({ message: "Incidente não encontrado." });
  const attachments = await db.select({
    id: incidentAttachments.id, filename: incidentAttachments.filename, contentType: incidentAttachments.contentType, sizeBytes: incidentAttachments.sizeBytes,
  }).from(incidentAttachments).where(eq(incidentAttachments.incidentId, id));
  const events = await db.select({
    id: incidentEvents.id, type: incidentEvents.type, details: incidentEvents.details, createdAt: incidentEvents.createdAt, actorEmail: users.email,
  }).from(incidentEvents).leftJoin(users, eq(users.id, incidentEvents.actorUserId))
    .where(eq(incidentEvents.incidentId, id)).orderBy(asc(incidentEvents.createdAt));
  res.json({ ...inc, attachments, events });
});

// Imagem anexada (só operadores; nunca pública).
router.get("/:id/attachments/:attId", async (req: any, res) => {
  const [att] = await db.select().from(incidentAttachments).where(and(
    eq(incidentAttachments.id, Number(req.params.attId)), eq(incidentAttachments.incidentId, Number(req.params.id)),
  ));
  if (!att) return res.status(404).end();
  res.setHeader("Content-Type", att.contentType);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(Buffer.from(att.dataBase64, "base64"));
});

async function loadOpen(id: number, res: any) {
  const [inc] = await db.select().from(incidents).where(eq(incidents.id, id));
  if (!inc) { res.status(404).json({ message: "Incidente não encontrado." }); return null; }
  return inc;
}

router.post("/:id/assign", async (req: any, res) => {
  const inc = await loadOpen(Number(req.params.id), res); if (!inc) return;
  await db.update(incidents).set({
    assignedTo: req.user.id,
    status: inc.status === "open" ? "in_progress" : inc.status,
    updatedAt: new Date(),
  }).where(eq(incidents.id, inc.id));
  await logIncidentEvent(inc.id, req.user.id, "assigned", { to: req.user.email });
  res.json({ ok: true });
});

router.post("/:id/note", async (req: any, res) => {
  const inc = await loadOpen(Number(req.params.id), res); if (!inc) return;
  const note = String(req.body?.note || "").trim().slice(0, 2000);
  if (!note) return res.status(400).json({ message: "Nota vazia." });
  await logIncidentEvent(inc.id, req.user.id, "note", { note });
  res.json({ ok: true });
});

router.post("/:id/status", async (req: any, res) => {
  const inc = await loadOpen(Number(req.params.id), res); if (!inc) return;
  const status = String(req.body?.status || "");
  if (status !== "open" && status !== "in_progress") return res.status(400).json({ message: "Para resolver, use 'Dar como resolvido'." });
  await db.update(incidents).set({ status, resolvedAt: null, resolvedBy: null, updatedAt: new Date() }).where(eq(incidents.id, inc.id));
  await logIncidentEvent(inc.id, req.user.id, "status", { from: inc.status, to: status });
  res.json({ ok: true });
});

// Corrigir a classificação da IA: o prazo é recalculado a partir da data de criação.
router.post("/:id/reclassify", async (req: any, res) => {
  const inc = await loadOpen(Number(req.params.id), res); if (!inc) return;
  const severity = String(req.body?.severity || inc.severity) as Severity;
  const category = String(req.body?.category || inc.category);
  if (!(SEVERITIES as readonly string[]).includes(severity) || !(CATEGORIES as readonly string[]).includes(category)) {
    return res.status(400).json({ message: "Classificação inválida." });
  }
  const slaDays = SLA_BUSINESS_DAYS[severity];
  const dueAt = dueDateFor(new Date(inc.createdAt), slaDays);
  await db.update(incidents).set({ severity, category, slaBusinessDays: slaDays, dueAt, updatedAt: new Date() }).where(eq(incidents.id, inc.id));
  await logIncidentEvent(inc.id, req.user.id, "reclassified", {
    from: { severity: inc.severity, category: inc.category }, to: { severity, category }, reason: String(req.body?.reason || "").slice(0, 500) || null,
  });
  res.json({ ok: true, dueAt });
});

router.post("/:id/resolve", async (req: any, res) => {
  const inc = await loadOpen(Number(req.params.id), res); if (!inc) return;
  if (inc.status === "resolved") return res.status(409).json({ message: "Já está resolvido." });
  const note = String(req.body?.resolutionNote || "").trim().slice(0, 2000) || null;
  await db.update(incidents).set({
    status: "resolved", resolvedAt: new Date(), resolvedBy: req.user.id, resolutionNote: note,
    assignedTo: inc.assignedTo ?? req.user.id, updatedAt: new Date(),
  }).where(eq(incidents.id, inc.id));
  await logIncidentEvent(inc.id, req.user.id, "resolved", { note });
  await recordAdminAction(req, "incident_resolved", { targetUserId: inc.userId, details: { incidentId: inc.id } });
  await sendResolvedEmail(inc.id);
  res.json({ ok: true });
});

export default router;
