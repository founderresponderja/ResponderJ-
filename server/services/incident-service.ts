// RJ-5.6: criar incidentes (app ou email), classificar com o Gemini e avisar o cliente.

import { GoogleGenAI, Type } from "@google/genai";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { incidents, incidentAttachments, incidentEvents, users } from "../../shared/schema.js";
import { sendMail } from "./mailer.js";
import { withTimeout } from "../utils/timeout.js";
import { getGenAI } from "./genai-client.js";
import {
  CATEGORIES, SEVERITIES, CATEGORY_LABEL, SLA_BUSINESS_DAYS, normalizeClassification, dueDateFor,
  ackEmail, resolvedEmail, type Severity,
} from "./incident-logic.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface NewIncidentInput {
  userId: number | null;
  reporterEmail: string;
  source: "app" | "email";
  subject?: string | null;
  description: string;
  pageUrl?: string | null;
  attachments: Array<{ filename?: string | null; contentType: string; sizeBytes: number; dataBase64: string }>;
  inboundEmailId?: string | null;
}

/** Uma chamada ao Gemini: categoria, gravidade, resumo e razão. Falha -> média / outro. */
export async function classifyIncident(subject: string | null | undefined, description: string) {
  const client = getGenAI();
  if (!client) return { ...normalizeClassification({}), classified: false };
  try {
    const categories = CATEGORIES.map((c) => `${c} (${CATEGORY_LABEL[c]})`).join(", ");
    const prompt = `
You triage bug reports for "Responder Já", a SaaS that syncs customer reviews (Google) and writes AI replies.
Classify the report.
- category: one of ${categories}
- severity:
  critical = the customer cannot use the product at all, payments charged wrongly, or data loss/leak;
  high = a main feature (sync, generate, accept, publish) is broken with no workaround;
  medium = a feature misbehaves but there is a workaround;
  low = cosmetic, typo, small inconvenience, or a question/suggestion.
- summary: one short line in European Portuguese.
- reason: one or two sentences in European Portuguese explaining the severity.

Subject: ${subject || "(sem assunto)"}
Report:
${description.slice(0, 4000)}`;
    // RJ-8.3: se a IA demorar, segue com a classificação por omissão (o reporte não se perde).
    const res = await withTimeout(client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: [...CATEGORIES] },
            severity: { type: Type.STRING, enum: [...SEVERITIES] },
            summary: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["category", "severity", "summary", "reason"],
        },
      },
    }), 10000, "classificação do erro");
    return { ...normalizeClassification(JSON.parse(res.text || "{}")), classified: true };
  } catch (error: any) {
    console.warn("[incidents] AI classification failed:", error?.message);
    return { ...normalizeClassification({}), reason: "Classificação automática indisponível; gravidade média por omissão.", classified: false };
  }
}

export async function logIncidentEvent(incidentId: number, actorUserId: number | null, type: string, details?: Record<string, unknown>) {
  await db.insert(incidentEvents).values({ incidentId, actorUserId, type, details: details ?? null })
    .catch((e: any) => console.warn("[incidents] event log failed:", e?.message));
}

export async function createIncident(input: NewIncidentInput) {
  const cls = await classifyIncident(input.subject, input.description);
  const now = new Date();
  const slaDays = SLA_BUSINESS_DAYS[cls.severity as Severity];
  const dueAt = dueDateFor(now, slaDays);

  const [inc] = await db.insert(incidents).values({
    userId: input.userId,
    reporterEmail: input.reporterEmail,
    source: input.source,
    subject: input.subject || null,
    description: input.description,
    pageUrl: input.pageUrl || null,
    category: cls.category,
    severity: cls.severity,
    aiSummary: cls.summary || null,
    aiReason: cls.reason || null,
    aiClassified: cls.classified,
    slaBusinessDays: slaDays,
    dueAt,
    inboundEmailId: input.inboundEmailId || null,
  }).returning();

  if (input.attachments.length) {
    await db.insert(incidentAttachments).values(input.attachments.map((a) => ({
      incidentId: inc.id,
      filename: a.filename || null,
      contentType: a.contentType,
      sizeBytes: a.sizeBytes,
      dataBase64: a.dataBase64,
    })));
  }
  await logIncidentEvent(inc.id, input.userId, "created", { source: input.source, attachments: input.attachments.length });
  await logIncidentEvent(inc.id, null, "classified", { category: cls.category, severity: cls.severity, ai: cls.classified });

  const mail = ackEmail({ id: inc.id, severity: cls.severity as Severity, dueAt, summary: cls.summary });
  const sent = await sendMail({ to: input.reporterEmail, ...mail });
  await logIncidentEvent(inc.id, null, "email", { kind: "ack", ok: sent.ok, error: sent.error || null });
  return inc;
}

export async function sendResolvedEmail(incidentId: number) {
  const [inc] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!inc) return;
  const mail = resolvedEmail({ id: inc.id, resolutionNote: inc.resolutionNote });
  const sent = await sendMail({ to: inc.reporterEmail, ...mail });
  await logIncidentEvent(inc.id, null, "email", { kind: "resolved", ok: sent.ok, error: sent.error || null });
}

/** Utilizador da app com este email (para ligar reportes que chegam por email). */
export async function findUserIdByEmail(email: string): Promise<number | null> {
  const [u] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`).limit(1);
  return u?.id ?? null;
}
