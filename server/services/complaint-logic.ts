// RJ-13.1 / RJ-13.2: regras puras da caixa de reclamações (sem base de dados, para testar).
// O conteúdo dos emails vem de fora e é tratado sempre como dados, nunca como instruções.

import { addBusinessDays, businessDaysLeft } from "../../shared/business-days.js";

export const COMPLAINTS_DOMAIN = "suporte.responderja.pt";
export const COMPLAINT_DEADLINE_BUSINESS_DAYS = 15;

export type ComplaintSource = "livro_reclamacoes" | "portal_queixa" | "outro" | "confirmacao_reencaminhamento";
export type ComplaintStatus = "nova" | "em_resposta" | "respondida" | "arquivada";
export const COMPLAINT_STATUSES: ComplaintStatus[] = ["nova", "em_resposta", "respondida", "arquivada"];

/** Endereço único de cada negócio para onde se reencaminham as reclamações. */
export function complaintsAddress(token: string): string {
  return `reclamacoes-${token}@${COMPLAINTS_DOMAIN}`;
}

/** Devolve o código do negócio se algum destinatário for um endereço de reclamações. */
export function complaintsTokenFromRecipients(recipients: unknown): string | null {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  for (const r of list) {
    const m = String(r || "").toLowerCase().match(/reclamacoes-([a-z0-9]{8,40})@suporte\.responderja\.pt/);
    if (m) return m[1];
  }
  return null;
}

/** Código aleatório, só letras minúsculas e algarismos (difícil de adivinhar). */
export function newComplaintsToken(randomBytes: (n: number) => Uint8Array): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
}

/** De onde vem a reclamação, pelo remetente, assunto e texto (inclui emails reencaminhados). */
export function detectComplaintSource(input: { from?: string; subject?: string; text?: string }): ComplaintSource {
  const from = String(input.from || "").toLowerCase();
  const all = `${from}\n${input.subject || ""}\n${input.text || ""}`.toLowerCase();
  if (from.includes("forwarding-noreply@google.com") || /gmail forwarding confirmation|confirmação de encaminhamento do gmail/.test(all)) {
    return "confirmacao_reencaminhamento";
  }
  if (all.includes("livroreclamacoes.pt") || all.includes("livro de reclamações") || all.includes("livro de reclamacoes")) {
    return "livro_reclamacoes";
  }
  if (all.includes("portaldaqueixa") || all.includes("portal da queixa")) return "portal_queixa";
  return "outro";
}

/** Número da reclamação, se o texto o tiver (ex.: "Reclamação n.º 12345/2026"). */
export function extractComplaintReference(text: string): string | null {
  const m = String(text || "").match(/reclama[çc][ãa]o\s*(?:n\.?\s*[ºo°]|n[ºo°]|n\.º|número|numero|nr\.?|#)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/\-.]{3,30})/i);
  return m ? m[1].replace(/[.\-\/]+$/, "") : null;
}

/** Código de confirmação que o Gmail envia ao ativar o reencaminhamento. */
export function extractForwardingCode(text: string): string | null {
  const m = String(text || "").match(/(?:confirmation code|código de confirmação)\s*[:：]?\s*(\d{6,12})/i);
  return m ? m[1] : null;
}

/** O prazo legal de 15 dias úteis aplica-se ao Livro de Reclamações; nos outros é uma meta recomendada. */
export function isLegalDeadline(source: ComplaintSource): boolean {
  return source === "livro_reclamacoes";
}

export function complaintDueDate(receivedAt: Date): Date {
  return addBusinessDays(receivedAt, COMPLAINT_DEADLINE_BUSINESS_DAYS);
}

export type DeadlineAlert = "faltam_5" | "faltam_2" | "ultimo_dia" | "ultrapassado";

/**
 * Que aviso enviar hoje (o mais urgente que se aplique). Cada aviso só sai uma vez
 * (o registo em email_log impede repetições), por isso uma reclamação aberta recebe no máximo 4.
 */
export function deadlineAlertFor(input: { status: ComplaintStatus; source: ComplaintSource; dueAt: Date | null }, today: Date): DeadlineAlert | null {
  if (!input.dueAt || input.status === "respondida" || input.status === "arquivada" || input.source === "confirmacao_reencaminhamento") return null;
  const left = businessDaysLeft(today, input.dueAt);
  if (left <= 0) return "ultrapassado";
  if (left === 1) return "ultimo_dia";
  if (left <= 2) return "faltam_2";
  if (left <= 5) return "faltam_5";
  return null;
}

export function deadlineAlertContent(input: {
  alert: DeadlineAlert; businessName: string; source: ComplaintSource; reference: string | null; dueAt: Date; baseUrl: string;
}): { subject: string; text: string } {
  const origem = input.source === "livro_reclamacoes" ? "Livro de Reclamações" : input.source === "portal_queixa" ? "Portal da Queixa" : "reclamação";
  const ref = input.reference ? ` n.º ${input.reference}` : "";
  const data = input.dueAt.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const quando = {
    faltam_5: "faltam 5 dias úteis ou menos",
    faltam_2: "faltam 2 dias úteis",
    ultimo_dia: "hoje é o último dia",
    ultrapassado: "o prazo já passou",
  }[input.alert];
  const legal = isLegalDeadline(input.source)
    ? "No Livro de Reclamações, a resposta ao cliente tem de ser dada no prazo de 15 dias úteis."
    : "Recomendamos responder no prazo de 15 dias úteis.";
  return {
    subject: `${input.alert === "ultrapassado" ? "Prazo ultrapassado" : "Prazo a terminar"}: ${origem}${ref} (${input.businessName})`,
    text: `Olá,\n\nTem uma ${origem}${ref} por responder em ${input.businessName}: ${quando} (último dia: ${data}).\n\n${legal}\n\nAbra a caixa de reclamações para preparar a resposta:\n${input.baseUrl}/reclamacoes\n\nResponder Já`,
  };
}
