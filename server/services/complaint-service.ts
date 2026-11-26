// RJ-13.1 / RJ-13.2: caixa de reclamações (base de dados, email e avisos de prazo).

import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import { complaints, establishments, users } from "../../shared/schema.js";
import { sendMail } from "./mailer.js";
import {
  complaintDueDate, complaintsAddress, deadlineAlertContent, deadlineAlertFor, detectComplaintSource,
  extractComplaintReference, newComplaintsToken, type ComplaintSource, type ComplaintStatus,
} from "./complaint-logic.js";

const MAX_BODY = 20000;

/** Endereço de reclamações do negócio; cria o código na primeira vez. */
export async function getOrCreateComplaintsAddress(establishmentId: number): Promise<string> {
  const [row] = await db.select({ token: establishments.complaintsToken }).from(establishments).where(eq(establishments.id, establishmentId));
  if (row?.token) return complaintsAddress(row.token);
  for (let i = 0; i < 3; i++) {
    const token = newComplaintsToken((n) => randomBytes(n));
    try {
      const [updated] = await db.update(establishments)
        .set({ complaintsToken: token })
        .where(and(eq(establishments.id, establishmentId), sql`${establishments.complaintsToken} IS NULL`))
        .returning({ token: establishments.complaintsToken });
      if (updated?.token) return complaintsAddress(updated.token);
      // Outro pedido criou o código ao mesmo tempo: usar esse.
      const [again] = await db.select({ token: establishments.complaintsToken }).from(establishments).where(eq(establishments.id, establishmentId));
      if (again?.token) return complaintsAddress(again.token);
    } catch {
      // código repetido (muito improvável): tenta outro
    }
  }
  throw new Error("Não foi possível criar o endereço de reclamações.");
}

/**
 * Guarda um email recebido no endereço de reclamações de um negócio.
 * `fetchEmail` vai buscar o corpo à API do Resend (o aviso só traz os metadados).
 */
export async function storeInboundComplaint(input: {
  token: string;
  emailId: string;
  from: string;
  subject: string;
  fetchEmail: (emailId: string) => Promise<{ text?: string; html?: string; created_at?: string }>;
}): Promise<{ stored: boolean; id?: number; reason?: string }> {
  const [est] = await db.select({ id: establishments.id, userId: establishments.userId })
    .from(establishments).where(eq(establishments.complaintsToken, input.token));
  if (!est) return { stored: false, reason: "endereço desconhecido" };

  const [dup] = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.inboundEmailId, input.emailId));
  if (dup) return { stored: false, id: dup.id, reason: "repetido" };

  const email = await input.fetchEmail(input.emailId);
  const html = String(email?.html || "");
  const text = (String(email?.text || "").trim()
    || html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").trim()
  ).slice(0, MAX_BODY);

  const source: ComplaintSource = detectComplaintSource({ from: input.from, subject: input.subject, text });
  const receivedAt = email?.created_at ? new Date(email.created_at) : new Date();
  const dueAt = source === "confirmacao_reencaminhamento" ? null : complaintDueDate(receivedAt);

  const [row] = await db.insert(complaints).values({
    establishmentId: est.id,
    userId: est.userId,
    source,
    inboundEmailId: input.emailId,
    fromEmail: input.from.slice(0, 320),
    subject: input.subject.slice(0, 500) || null,
    body: text || "(email sem texto)",
    reference: extractComplaintReference(`${input.subject}\n${text}`),
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
    dueAt,
    status: source === "confirmacao_reencaminhamento" ? "arquivada" : "nova",
  }).onConflictDoNothing({ target: complaints.inboundEmailId }).returning({ id: complaints.id });

  return row ? { stored: true, id: row.id } : { stored: false, reason: "repetido" };
}

/** RJ-13.2: avisos de prazo (corre no agendamento diário). Cada aviso sai uma única vez. */
export async function sendComplaintDeadlineAlerts(opts: { now?: Date; deadline: number }) {
  const now = opts.now ?? new Date();
  const baseUrl = process.env.APP_BASE_URL || "https://www.responderja.pt";
  const stats = { checked: 0, sent: 0, failed: 0 };
  const open = await db.select({
    id: complaints.id, source: complaints.source, status: complaints.status, dueAt: complaints.dueAt,
    reference: complaints.reference, userId: complaints.userId, businessName: establishments.name, email: users.email,
  })
    .from(complaints)
    .innerJoin(establishments, eq(complaints.establishmentId, establishments.id))
    .innerJoin(users, eq(complaints.userId, users.id))
    .where(and(inArray(complaints.status, ["nova", "em_resposta"]), sql`${complaints.dueAt} IS NOT NULL`))
    .limit(500);

  for (const c of open) {
    if (Date.now() > opts.deadline) break;
    stats.checked++;
    const alert = deadlineAlertFor({ status: c.status as ComplaintStatus, source: c.source as ComplaintSource, dueAt: c.dueAt }, now);
    if (!alert || !c.email) continue;
    const ref = `${c.id}:${alert}`;
    const { rows: claimed } = await db.execute(sql`
      INSERT INTO email_log (user_id, kind, ref, ok) VALUES (${c.userId}, 'complaint_deadline', ${ref}, false)
      ON CONFLICT (user_id, kind, ref) DO NOTHING RETURNING id`);
    if (!(claimed as any[]).length) continue;
    const content = deadlineAlertContent({
      alert, businessName: c.businessName, source: c.source as ComplaintSource, reference: c.reference, dueAt: c.dueAt!, baseUrl,
    });
    const result = await sendMail({ to: c.email, ...content });
    if (result.ok) {
      await db.execute(sql`UPDATE email_log SET ok = true, sent_at = now() WHERE id = ${(claimed as any[])[0].id}`);
      stats.sent++;
    } else {
      // Falhou: apaga a reserva para voltar a tentar amanhã.
      await db.execute(sql`DELETE FROM email_log WHERE id = ${(claimed as any[])[0].id}`);
      stats.failed++;
    }
  }
  return stats;
}
