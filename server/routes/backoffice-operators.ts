/**
 * Quadro de operadores (/api/backoffice/operators).
 *  - Super administrador: listar operadores com estatísticas, criar, remover e transferir a função.
 *  - Operador: ver e aceitar uma transferência dirigida a si.
 *
 * Transferência em duas camadas:
 *  1. O super administrador escolhe o operador e confirma o email dele;
 *     recebe um código de 6 dígitos no seu email (válido 15 minutos).
 *  2. Depois de o confirmar, o operador escolhido recebe outro código no seu email
 *     (válido 24 horas) e tem de o introduzir no backoffice para aceitar.
 *  Só então as funções trocam, numa transação. Máximo 5 tentativas por código.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import { adminAuditLog, adminRoleTransfers, users } from "../../shared/schema.js";
import { platformRole, recordAdminAction, requireSuperAdmin } from "../middleware/roles.js";
import { isMailerConfigured, sendMail } from "../services/mailer.js";

const router = Router();
const OPEN = ["awaiting_from", "awaiting_to"];
const MAX_ATTEMPTS = 5;
const APP_URL = process.env.APP_BASE_URL || "https://www.responderja.pt";

const hashCode = (transferId: number, code: string) =>
  crypto.createHash("sha256").update(`${transferId}:${code}`).digest("hex");
const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
const sameHash = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function expireOld() {
  await db.update(adminRoleTransfers)
    .set({ status: "expired", completedAt: new Date() })
    .where(and(inArray(adminRoleTransfers.status, OPEN), sql`${adminRoleTransfers.expiresAt} < now()`));
}

async function openTransfer() {
  await expireOld();
  const [t] = await db.select().from(adminRoleTransfers).where(inArray(adminRoleTransfers.status, OPEN)).limit(1);
  return t ?? null;
}

// ---------------------------------------------------------------------------
// Lista de operadores com estatísticas (super administrador)
// ---------------------------------------------------------------------------
router.get("/", requireSuperAdmin, async (_req, res) => {
  const ops = await db.select().from(users)
    .where(sql`coalesce(${users.isAdmin}, false) = true or coalesce(${users.isSuperAdmin}, false) = true`)
    .orderBy(desc(users.isSuperAdmin), users.email);
  const since = new Date(Date.now() - 30 * 86400000);
  const stats = ops.length === 0 ? [] : await db
    .select({
      actorUserId: adminAuditLog.actorUserId,
      action: adminAuditLog.action,
      count: sql<number>`count(*)::int`,
      last: sql<string>`max(${adminAuditLog.createdAt})`,
    })
    .from(adminAuditLog)
    .where(and(inArray(adminAuditLog.actorUserId, ops.map((o) => o.id)), gte(adminAuditLog.createdAt, since)))
    .groupBy(adminAuditLog.actorUserId, adminAuditLog.action);

  res.json({
    mailer: isMailerConfigured(),
    transfer: await openTransfer(),
    operators: ops.map((o) => {
      const mine = stats.filter((s) => s.actorUserId === o.id);
      const by = (action: string) => mine.find((s) => s.action === action)?.count ?? 0;
      const lastAction = mine.reduce<string | null>((acc, s) => (!acc || s.last > acc ? s.last : acc), null);
      return {
        id: o.id,
        email: o.email,
        name: [o.firstName, o.lastName].filter(Boolean).join(" "),
        role: platformRole(o),
        isActive: o.isActive,
        linked: Boolean(o.clerkUserId),
        createdAt: o.createdAt,
        lastLoginAt: o.lastLoginAt,
        lastActionAt: lastAction,
        stats30d: {
          sessions: by("backoffice_open"),
          customerViews: by("customer_view"),
          supportActions: by("customer_credits") + by("customer_plan") + by("customer_suspend") + by("customer_reactivate"),
          viewAs: by("view_as_start"),
          sandboxResets: by("sandbox_reset"),
          total: mine.reduce((acc, s) => acc + s.count, 0),
        },
      };
    }),
  });
});

// ---------------------------------------------------------------------------
// Criar operador (super administrador)
// ---------------------------------------------------------------------------
router.post("/", requireSuperAdmin, async (req: any, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Email inválido." });

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing?.isSandbox) return res.status(400).json({ message: "Esse email é de uma conta-sandbox." });
  if (existing && (existing.isAdmin || existing.isSuperAdmin)) {
    if (existing.isActive) return res.status(409).json({ message: "Essa conta já é operador." });
  }
  if (existing && !existing.isAdmin && !existing.isSuperAdmin && existing.stripeSubscriptionId) {
    return res.status(409).json({ message: "Essa conta é de um cliente com subscrição paga. Usa outro email para o operador." });
  }

  let id: number;
  if (existing) {
    await db.update(users).set({ isAdmin: true, isActive: true, role: "operator", updatedAt: new Date() }).where(eq(users.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db.insert(users).values({
      email,
      password: "clerk_oauth_user",
      firstName: "Operador",
      lastName: "",
      role: "operator",
      isActive: true,
      isAdmin: true,
      isSuperAdmin: false,
      credits: 0,
      selectedPlan: "trial",
      subscriptionPlan: "trial",
    }).returning({ id: users.id });
    id = row.id;
  }
  await recordAdminAction(req, "operator_add", { targetUserId: id, details: { email, reusedAccount: Boolean(existing) } });
  const mail = await sendMail({
    to: email,
    subject: "Foste adicionado como operador do Responder Já",
    text: `Olá,\n\n${req.user.email} adicionou-te como operador do backoffice do Responder Já.\n\nEntra em ${APP_URL} com este email (${email}). Se ainda não tens conta, cria-a com este mesmo email e confirma o código que vais receber.\n\nSe não estavas à espera deste email, ignora-o.`,
  });
  res.json({ ok: true, id, emailSent: mail.ok });
});

// ---------------------------------------------------------------------------
// Remover operador (super administrador). A conta fica sem acesso.
// ---------------------------------------------------------------------------
router.post("/:id/remove", requireSuperAdmin, async (req: any, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: "Não podes remover a tua própria conta." });
  const [op] = await db.select().from(users).where(eq(users.id, id));
  if (!op || !(op.isAdmin || op.isSuperAdmin)) return res.status(404).json({ message: "Operador não encontrado." });
  if (op.isSuperAdmin) return res.status(400).json({ message: "O super administrador não pode ser removido." });
  const open = await openTransfer();
  if (open && (open.toUserId === id || open.fromUserId === id)) {
    return res.status(409).json({ message: "Há uma transferência em curso com este operador. Cancela-a primeiro." });
  }
  await db.update(users).set({ isAdmin: false, isActive: false, role: "user", updatedAt: new Date() }).where(eq(users.id, id));
  await recordAdminAction(req, "operator_remove", { targetUserId: id, details: { email: op.email } });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Transferência da função de super administrador
// ---------------------------------------------------------------------------

// 1. Super administrador inicia: escolhe o operador, confirma o email, recebe o 1.º código.
router.post("/transfer", requireSuperAdmin, async (req: any, res) => {
  if (!isMailerConfigured()) return res.status(503).json({ message: "O envio de email não está configurado." });
  if (await openTransfer()) return res.status(409).json({ message: "Já existe uma transferência em curso." });
  const toId = Number(req.body?.toUserId);
  const confirmEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();
  const [to] = await db.select().from(users).where(eq(users.id, toId));
  if (!to || !to.isAdmin || to.isSuperAdmin || !to.isActive) {
    return res.status(400).json({ message: "Escolhe um operador ativo." });
  }
  if (!to.clerkUserId) return res.status(400).json({ message: "Esse operador ainda não entrou na aplicação." });
  if (confirmEmail !== to.email.toLowerCase()) {
    return res.status(400).json({ message: "O email de confirmação não corresponde ao operador escolhido." });
  }

  const [t] = await db.insert(adminRoleTransfers).values({
    fromUserId: req.user.id,
    toUserId: to.id,
    status: "awaiting_from",
    expiresAt: new Date(Date.now() + 15 * 60000),
  }).returning();
  const code = newCode();
  await db.update(adminRoleTransfers).set({ codeHash: hashCode(t.id, code) }).where(eq(adminRoleTransfers.id, t.id));
  const mail = await sendMail({
    to: req.user.email,
    subject: `Código ${code} — confirmar transferência de super administrador`,
    text: `Pediste para transferir a função de super administrador do Responder Já para ${to.email}.\n\nCódigo de confirmação: ${code}\n\nÉ válido durante 15 minutos. Se não foste tu, não introduzas o código e cancela a transferência no backoffice.`,
  });
  if (!mail.ok) {
    await db.update(adminRoleTransfers).set({ status: "cancelled", completedAt: new Date() }).where(eq(adminRoleTransfers.id, t.id));
    return res.status(502).json({ message: `Não foi possível enviar o email: ${mail.error}` });
  }
  await recordAdminAction(req, "transfer_start", { targetUserId: to.id, details: { transferId: t.id } });
  res.json({ ok: true, transferId: t.id });
});

// 2. Super administrador confirma o seu código; o operador recebe o 2.º código.
router.post("/transfer/:id/confirm", requireSuperAdmin, async (req: any, res) => {
  const t = await openTransfer();
  if (!t || t.id !== Number(req.params.id) || t.status !== "awaiting_from" || t.fromUserId !== req.user.id) {
    return res.status(404).json({ message: "Transferência não encontrada ou expirada." });
  }
  const code = String(req.body?.code || "").trim();
  if (!t.codeHash || !sameHash(hashCode(t.id, code), t.codeHash)) {
    const attempts = t.attempts + 1;
    await db.update(adminRoleTransfers).set(
      attempts >= MAX_ATTEMPTS ? { attempts, status: "cancelled", completedAt: new Date() } : { attempts },
    ).where(eq(adminRoleTransfers.id, t.id));
    await recordAdminAction(req, "transfer_code_wrong", { targetUserId: t.toUserId, details: { transferId: t.id, step: "from", attempts } });
    return res.status(400).json({ message: attempts >= MAX_ATTEMPTS ? "Código errado 5 vezes. Transferência cancelada." : "Código errado." });
  }
  const [to] = await db.select().from(users).where(eq(users.id, t.toUserId));
  const code2 = newCode();
  await db.update(adminRoleTransfers).set({
    status: "awaiting_to",
    codeHash: hashCode(t.id, code2),
    attempts: 0,
    expiresAt: new Date(Date.now() + 24 * 3600000),
  }).where(eq(adminRoleTransfers.id, t.id));
  const mail = await sendMail({
    to: to.email,
    subject: `Código ${code2} — vais passar a super administrador do Responder Já`,
    text: `${req.user.email} quer transferir para ti a função de super administrador do Responder Já.\n\nPara aceitar, entra no backoffice (${APP_URL}/admin) e introduz o código: ${code2}\n\nÉ válido durante 24 horas. Ao aceitar, ${req.user.email} passa a operador.`,
  });
  if (!mail.ok) {
    await db.update(adminRoleTransfers).set({ status: "cancelled", completedAt: new Date() }).where(eq(adminRoleTransfers.id, t.id));
    return res.status(502).json({ message: `Não foi possível enviar o email ao operador: ${mail.error}` });
  }
  await recordAdminAction(req, "transfer_confirm_from", { targetUserId: t.toUserId, details: { transferId: t.id } });
  res.json({ ok: true });
});

// Transferência dirigida a mim (operador) — para mostrar o formulário de aceitação.
router.get("/transfer/incoming", async (req: any, res) => {
  const t = await openTransfer();
  if (!t || t.toUserId !== req.user.id || t.status !== "awaiting_to") return res.json({ transfer: null });
  const [from] = await db.select({ email: users.email }).from(users).where(eq(users.id, t.fromUserId));
  res.json({ transfer: { id: t.id, fromEmail: from?.email ?? null, expiresAt: t.expiresAt } });
});

// 3. O operador aceita com o seu código: as funções trocam numa transação.
router.post("/transfer/:id/accept", async (req: any, res) => {
  const t = await openTransfer();
  if (!t || t.id !== Number(req.params.id) || t.status !== "awaiting_to" || t.toUserId !== req.user.id) {
    return res.status(404).json({ message: "Transferência não encontrada ou expirada." });
  }
  const code = String(req.body?.code || "").trim();
  if (!t.codeHash || !sameHash(hashCode(t.id, code), t.codeHash)) {
    const attempts = t.attempts + 1;
    await db.update(adminRoleTransfers).set(
      attempts >= MAX_ATTEMPTS ? { attempts, status: "cancelled", completedAt: new Date() } : { attempts },
    ).where(eq(adminRoleTransfers.id, t.id));
    await recordAdminAction(req, "transfer_code_wrong", { targetUserId: t.fromUserId, details: { transferId: t.id, step: "to", attempts } });
    return res.status(400).json({ message: attempts >= MAX_ATTEMPTS ? "Código errado 5 vezes. Transferência cancelada." : "Código errado." });
  }

  await db.transaction(async (tx) => {
    // Primeiro tirar ao atual (o índice único só permite um super administrador).
    await tx.update(users).set({ isSuperAdmin: false, isAdmin: true, role: "operator", updatedAt: new Date() }).where(eq(users.id, t.fromUserId));
    await tx.update(users).set({ isSuperAdmin: true, isAdmin: true, role: "super_admin", updatedAt: new Date() }).where(eq(users.id, t.toUserId));
    await tx.update(adminRoleTransfers).set({ status: "done", codeHash: null, completedAt: new Date() }).where(eq(adminRoleTransfers.id, t.id));
  });
  await recordAdminAction(req, "transfer_done", { targetUserId: t.fromUserId, details: { transferId: t.id } });

  const [from] = await db.select({ email: users.email }).from(users).where(eq(users.id, t.fromUserId));
  const notice = `A função de super administrador do Responder Já passou de ${from?.email} para ${req.user.email} em ${new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}.\n\n${from?.email} continua como operador.`;
  if (from?.email) await sendMail({ to: from.email, subject: "Transferência de super administrador concluída", text: notice });
  await sendMail({ to: req.user.email, subject: "És agora super administrador do Responder Já", text: notice });
  res.json({ ok: true });
});

// Cancelar (qualquer uma das duas pessoas envolvidas).
router.post("/transfer/:id/cancel", async (req: any, res) => {
  const t = await openTransfer();
  if (!t || t.id !== Number(req.params.id) || (t.fromUserId !== req.user.id && t.toUserId !== req.user.id)) {
    return res.status(404).json({ message: "Transferência não encontrada." });
  }
  await db.update(adminRoleTransfers).set({ status: "cancelled", codeHash: null, completedAt: new Date() }).where(eq(adminRoleTransfers.id, t.id));
  await recordAdminAction(req, "transfer_cancel", { targetUserId: t.fromUserId === req.user.id ? t.toUserId : t.fromUserId, details: { transferId: t.id } });
  res.json({ ok: true });
});

export default router;
