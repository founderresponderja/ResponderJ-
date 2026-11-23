// RJ-5.6: reporte de erros pelo cliente (na app) e por email (Resend Inbound).
// POST /api/incidents                 -> novo reporte (até 2 imagens)
// GET  /api/incidents/mine            -> os reportes do próprio cliente
// POST /api/incidents/inbound-email   -> webhook do Resend (email.received)

import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { incidents } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { createIncident, findUserIdByEmail } from "../services/incident-service.js";
import {
  ALLOWED_IMAGE_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, base64Bytes, validateAttachments, verifySvixSignature,
} from "../services/incident-logic.js";

const router = Router();

router.post("/", requireAuth, async (req: any, res) => {
  try {
    // O reporte é sempre da pessoa que o faz (um membro de equipa não reporta em nome do dono).
    const reporter = req.member || req.user;
    const description = String(req.body?.description || "").trim();
    const subject = String(req.body?.subject || "").trim().slice(0, 200) || null;
    if (description.length < 10) return res.status(400).json({ message: "Descreva o erro (pelo menos 10 caracteres)." });
    if (description.length > 5000) return res.status(400).json({ message: "A descrição pode ter no máximo 5000 caracteres." });

    const raw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const attachments = raw.map((a: any) => {
      const dataBase64 = String(a?.dataBase64 || "").replace(/^data:[^,]+,/, "");
      return { filename: String(a?.filename || "").slice(0, 120) || null, contentType: String(a?.contentType || ""), sizeBytes: base64Bytes(dataBase64), dataBase64 };
    });
    const invalid = validateAttachments(attachments.map((a: any) => ({ contentType: a.contentType, size: a.sizeBytes })));
    if (invalid) return res.status(400).json({ message: invalid });

    const inc = await createIncident({
      userId: Number(reporter.id),
      reporterEmail: String(reporter.email),
      source: "app",
      subject,
      description,
      pageUrl: String(req.body?.pageUrl || "").slice(0, 500) || null,
      attachments,
    });
    res.json({ id: inc.id, severity: inc.severity, slaBusinessDays: inc.slaBusinessDays, dueAt: inc.dueAt });
  } catch (error: any) {
    console.error("[incidents] create failed:", error?.message);
    res.status(500).json({ message: "Não foi possível registar o reporte. Tente novamente." });
  }
});

router.get("/mine", requireAuth, async (req: any, res) => {
  const reporter = req.member || req.user;
  const rows = await db.select({
    id: incidents.id, subject: incidents.subject, aiSummary: incidents.aiSummary, status: incidents.status,
    severity: incidents.severity, dueAt: incidents.dueAt, createdAt: incidents.createdAt, resolvedAt: incidents.resolvedAt,
  }).from(incidents).where(eq(incidents.userId, Number(reporter.id))).orderBy(desc(incidents.createdAt)).limit(50);
  res.json(rows);
});

// ---------------------------------------------------------------------------
// Email: o Resend recebe o email e avisa este endereço (webhook assinado).
// O corpo e os anexos não vêm no aviso: vão-se buscar à API do Resend.
// ---------------------------------------------------------------------------
// Ler emails recebidos exige uma chave com "Full access". A chave de envio
// (RESEND_API_KEY, "Sending access") não chega; usa-se RESEND_INBOUND_API_KEY.
async function resendGet(path: string) {
  const key = process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY;
  const res = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${key}` } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data?.message || "erro"}`);
  return data;
}

const stripHtml = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

router.post("/inbound-email", async (req: any, res) => {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET || "";
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  const ok = verifySvixSignature(rawBody, {
    id: String(req.headers["svix-id"] || ""),
    timestamp: String(req.headers["svix-timestamp"] || ""),
    signature: String(req.headers["svix-signature"] || ""),
  }, secret);
  if (!ok) return res.status(400).json({ error: "Assinatura inválida." });

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).json({ error: "JSON inválido." }); }
  if (event?.type !== "email.received") return res.json({ ignored: true });

  const emailId = String(event.data?.email_id || "");
  const from = String(event.data?.from || "").trim().toLowerCase();
  if (!emailId || !from) return res.status(400).json({ error: "Email incompleto." });

  // Idempotência: o Resend pode repetir o aviso.
  const [existing] = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.inboundEmailId, emailId));
  if (existing) return res.json({ duplicate: true, id: existing.id });

  try {
    const email = await resendGet(`/emails/receiving/${encodeURIComponent(emailId)}`);
    const text = String(email?.text || "").trim() || stripHtml(String(email?.html || ""));
    const description = (text || "(email sem texto)").slice(0, 5000);

    // Até 2 imagens aceites (tipo e tamanho); as restantes ficam de fora e isso é anotado.
    const list = await resendGet(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`).catch(() => ({ data: [] }));
    const attachments: Array<{ filename: string | null; contentType: string; sizeBytes: number; dataBase64: string }> = [];
    let skipped = 0;
    for (const a of (list?.data || []) as any[]) {
      const type = String(a?.content_type || "");
      if (attachments.length >= MAX_ATTACHMENTS || !ALLOWED_IMAGE_TYPES.includes(type) || Number(a?.size || 0) > MAX_ATTACHMENT_BYTES || !a?.download_url) {
        skipped++;
        continue;
      }
      const file = await fetch(a.download_url);
      if (!file.ok) { skipped++; continue; }
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length > MAX_ATTACHMENT_BYTES) { skipped++; continue; }
      attachments.push({ filename: String(a?.filename || "") || null, contentType: type, sizeBytes: buf.length, dataBase64: buf.toString("base64") });
    }

    const inc = await createIncident({
      userId: await findUserIdByEmail(from),
      reporterEmail: from,
      source: "email",
      subject: String(event.data?.subject || email?.subject || "").slice(0, 200) || null,
      description: skipped ? `${description}\n\n[${skipped} anexo(s) não aceite(s): só até ${MAX_ATTACHMENTS} imagens JPEG/PNG/WebP de 1 MB]` : description,
      attachments,
      inboundEmailId: emailId,
    });
    res.json({ ok: true, id: inc.id });
  } catch (error: any) {
    console.error("[incidents] inbound email failed:", error?.message);
    // 500: o Resend volta a tentar.
    res.status(500).json({ error: "Falha ao processar o email." });
  }
});

export default router;
