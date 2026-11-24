// RJ-5.8: regras dos clientes (negócios) de uma agência. Sem acesso à base de dados, para testar.
import { BUSINESS_TYPES, BRAND_TONES } from "../../shared/business-options.js";

export interface ClientInput { name?: string; type?: string | null; brandTone?: string | null; responseGuidelines?: string | null; logoUrl?: string | null }
export interface ClientValues { name?: string; type?: string | null; brandTone?: string; responseGuidelines?: string | null; logoUrl?: string | null }
export type ClientCheck = { ok: boolean; message?: string; values?: ClientValues };

const TYPES = new Set(BUSINESS_TYPES.map((t) => t.value));
const TONES = new Set(BRAND_TONES.map((t) => t.value));
// Valores antigos gravados em português passam para os do perfil do negócio.
const TONE_ALIASES: Record<string, string> = { profissional: "professional", amigavel: "friendly", "amigável": "friendly", informal: "casual" };

/** Valida e limpa os dados de um cliente. `partial`: numa edição, os campos em falta ficam como estão. */
export function validateClientInput(input: ClientInput, partial = false): ClientCheck {
  const values: ClientValues = {};
  if (input.name !== undefined || !partial) {
    const name = String(input.name ?? "").trim();
    if (!name) return { ok: false, message: "O nome do negócio é obrigatório." };
    if (name.length > 120) return { ok: false, message: "O nome do negócio tem no máximo 120 caracteres." };
    values.name = name;
  }
  if (input.type !== undefined) {
    const type = input.type ? String(input.type) : null;
    if (type && !TYPES.has(type)) return { ok: false, message: "Tipo de negócio inválido." };
    values.type = type;
  }
  if (input.brandTone !== undefined || !partial) {
    const raw = String(input.brandTone ?? "professional").trim().toLowerCase();
    const tone = TONE_ALIASES[raw] || raw || "professional";
    if (!TONES.has(tone)) return { ok: false, message: "Tom de voz inválido." };
    values.brandTone = tone;
  }
  if (input.responseGuidelines !== undefined) {
    const g = input.responseGuidelines ? String(input.responseGuidelines).trim() : "";
    if (g.length > 2000) return { ok: false, message: "As orientações têm no máximo 2000 caracteres." };
    values.responseGuidelines = g || null;
  }
  if (input.logoUrl !== undefined) {
    const url = input.logoUrl ? String(input.logoUrl).trim() : "";
    if (url && !/^https:\/\/\S+$/i.test(url)) return { ok: false, message: "O logótipo tem de ser um endereço https." };
    values.logoUrl = url || null;
  }
  return { ok: true, values };
}

/** Pode-se criar mais um cliente? `limit` -1 = sem limite. */
export function canAddClient(current: number, limit: number): ClientCheck {
  if (limit !== -1 && current >= limit) return { ok: false, message: `Limite de ${limit} negócios atingido.` };
  return { ok: true };
}

/** Pode-se apagar? Fica sempre pelo menos um negócio. */
export function canRemoveClient(current: number): ClientCheck {
  if (current <= 1) return { ok: false, message: "Não é possível remover o único negócio da conta." };
  return { ok: true };
}
