// RJ-5.6: regras do reporte de erros (sem base de dados nem rede), testadas em
// tests/incident-logic.test.ts.
//
// Decisões do Luís (17/11/2026):
// - prazos por gravidade em dias úteis: crítica 1, alta 2, média 5, baixa 10;
// - dias úteis excluem fins de semana e feriados nacionais portugueses;
// - no máximo 2 imagens por reporte.

import crypto from "node:crypto";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORIES = ["billing", "sync", "ai_generation", "account_access", "publishing", "interface", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLA_BUSINESS_DAYS: Record<Severity, number> = { critical: 1, high: 2, medium: 5, low: 10 };

export const SEVERITY_LABEL: Record<Severity, string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };
export const CATEGORY_LABEL: Record<Category, string> = {
  billing: "Pagamentos e créditos",
  sync: "Sincronização de reviews",
  ai_generation: "Geração de respostas",
  account_access: "Conta e acesso",
  publishing: "Publicação de respostas",
  interface: "Ecrãs e navegação",
  other: "Outro",
};

export const STATUSES = ["open", "in_progress", "resolved"] as const;
export type IncidentStatus = (typeof STATUSES)[number];

export const MAX_ATTACHMENTS = 2;
export const MAX_ATTACHMENT_BYTES = 1024 * 1024; // 1 MB por imagem (a app reduz antes de enviar)
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ---------------------------------------------------------------------------
// Dias úteis em Portugal (hora de Lisboa)
// ---------------------------------------------------------------------------

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function shiftDays(y: number, m: number, d: number, delta: number): string {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Feriados nacionais obrigatórios (Código do Trabalho, art. 234.º). Carnaval não é obrigatório. */
export function portugueseHolidays(year: number): Set<string> {
  const fixed = [
    [1, 1], [4, 25], [5, 1], [6, 10], [8, 15], [10, 5], [11, 1], [12, 1], [12, 8], [12, 25],
  ].map(([m, d]) => ymd(year, m, d));
  const e = easterSunday(year);
  const movable = [
    shiftDays(year, e.month, e.day, -2), // Sexta-feira Santa
    ymd(year, e.month, e.day), // Páscoa
    shiftDays(year, e.month, e.day, 60), // Corpo de Deus
  ];
  return new Set([...fixed, ...movable]);
}

/** Data (AAAA-MM-DD) em Lisboa para um instante. */
export function lisbonDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  return parts; // en-CA dá AAAA-MM-DD
}

export function isBusinessDay(dateYmd: string): boolean {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !portugueseHolidays(y).has(dateYmd);
}

/** Fim do dia (23:59:59) em Lisboa, como instante UTC. */
export function endOfLisbonDay(dateYmd: string): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  // Lisboa está em UTC+0 (inverno) ou UTC+1 (verão). Testa as duas e escolhe a que cai no dia certo.
  for (const offsetHours of [0, 1]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, 23 - offsetHours, 59, 59));
    if (lisbonDate(candidate) === dateYmd && lisbonDate(new Date(candidate.getTime() + 1000)) !== dateYmd) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
}

/**
 * Prazo: fim do N.º dia útil depois do dia de criação (em Lisboa).
 * Ex.: crítica (1 dia útil) criada numa sexta à tarde -> termina na segunda às 23:59.
 */
export function dueDateFor(createdAt: Date, businessDays: number): Date {
  let [y, m, d] = lisbonDate(createdAt).split("-").map(Number);
  let counted = 0;
  let current = ymd(y, m, d);
  while (counted < businessDays) {
    current = shiftDays(y, m, d, 1);
    [y, m, d] = current.split("-").map(Number);
    if (isBusinessDay(current)) counted++;
  }
  return endOfLisbonDay(current);
}

// ---------------------------------------------------------------------------
// Classificação pela IA
// ---------------------------------------------------------------------------

/** Valida a resposta da IA. Valores fora da lista caem para "outro" / "média". */
export function normalizeClassification(json: any): { category: Category; severity: Severity; summary: string; reason: string } {
  const category = (CATEGORIES as readonly string[]).includes(json?.category) ? json.category : "other";
  const severity = (SEVERITIES as readonly string[]).includes(json?.severity) ? json.severity : "medium";
  const clip = (v: unknown, n: number) => String(v || "").trim().slice(0, n);
  return { category, severity, summary: clip(json?.summary, 140), reason: clip(json?.reason, 400) };
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

export function validateAttachments(list: Array<{ contentType?: string; size?: number }>): string | null {
  if (!Array.isArray(list)) return null;
  if (list.length > MAX_ATTACHMENTS) return `No máximo ${MAX_ATTACHMENTS} imagens.`;
  for (const a of list) {
    if (!ALLOWED_IMAGE_TYPES.includes(String(a.contentType))) return "Só são aceites imagens JPEG, PNG ou WebP.";
    if (!a.size || a.size > MAX_ATTACHMENT_BYTES) return "Cada imagem pode ter no máximo 1 MB.";
  }
  return null;
}

/** Bytes reais de um texto base64 (sem cabeçalho data:). */
export function base64Bytes(b64: string): number {
  const clean = String(b64 || "").replace(/^data:[^,]+,/, "").replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

// ---------------------------------------------------------------------------
// Indicadores (super administrador)
// ---------------------------------------------------------------------------

export interface IncidentForStats { createdAt: Date | string; resolvedAt?: Date | string | null; dueAt: Date | string }

/** Taxa de sucesso por mês de criação: resolvidos dentro do prazo / resolvidos. */
export function monthlySuccessRate(incidents: IncidentForStats[]) {
  const byMonth = new Map<string, { resolved: number; onTime: number; total: number }>();
  for (const inc of incidents) {
    const month = lisbonDate(new Date(inc.createdAt)).slice(0, 7);
    const row = byMonth.get(month) || { resolved: 0, onTime: 0, total: 0 };
    row.total++;
    if (inc.resolvedAt) {
      row.resolved++;
      if (new Date(inc.resolvedAt).getTime() <= new Date(inc.dueAt).getTime()) row.onTime++;
    }
    byMonth.set(month, row);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, r]) => ({ month, ...r, rate: r.resolved ? Math.round((r.onTime / r.resolved) * 1000) / 10 : null }));
}

// ---------------------------------------------------------------------------
// Emails ao cliente
// ---------------------------------------------------------------------------

const fmtPt = (d: Date) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric" }).format(d);

export function ackEmail(inc: { id: number; severity: Severity; dueAt: Date; summary?: string | null }) {
  const days = SLA_BUSINESS_DAYS[inc.severity];
  return {
    subject: `Recebemos o seu reporte #${inc.id}`,
    text:
      `Olá,\n\nRecebemos o seu reporte de erro (#${inc.id})${inc.summary ? `: ${inc.summary}` : ""}.\n\n` +
      `Gravidade: ${SEVERITY_LABEL[inc.severity]}.\n` +
      `Prazo estimado de resolução: ${days} ${days === 1 ? "dia útil" : "dias úteis"}, até ${fmtPt(inc.dueAt)}.\n\n` +
      `Avisamos por email quando estiver resolvido.\n\nEquipa Responder Já`,
  };
}

export function resolvedEmail(inc: { id: number; resolutionNote?: string | null }) {
  return {
    subject: `O seu reporte #${inc.id} foi resolvido`,
    text:
      `Olá,\n\nO erro que reportou (#${inc.id}) foi dado como resolvido.\n\n` +
      (inc.resolutionNote ? `${inc.resolutionNote}\n\n` : "") +
      `Se o problema continuar, responda a este email ou faça um novo reporte na app.\n\nEquipa Responder Já`,
  };
}

// ---------------------------------------------------------------------------
// Webhook de entrada do Resend (Svix): HMAC-SHA256 em base64 sobre "id.timestamp.corpo"
// ---------------------------------------------------------------------------

export function verifySvixSignature(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!rawBody || !headers.id || !headers.timestamp || !headers.signature || !secret) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest("base64");
  return headers.signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const a = Buffer.from(sig || "");
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
