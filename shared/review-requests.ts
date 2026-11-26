// RJ-16.3: pedidos de avaliação (regras partilhadas pelo site, servidor e testes).
// Regras do Google para pedir avaliações: pedir a todos os clientes por igual (sem filtrar os
// satisfeitos, o chamado "review gating") e sem oferecer nada em troca.

export const REVIEW_PLATFORMS = ["google", "tripadvisor", "facebook", "thefork"] as const;
export type ReviewPlatform = (typeof REVIEW_PLATFORMS)[number];

export const REVIEW_PLATFORM_LABEL: Record<ReviewPlatform, string> = {
  google: "Google",
  tripadvisor: "Tripadvisor",
  facebook: "Facebook",
  thefork: "TheFork",
};

/** Domínios aceites para cada plataforma (evita ligações para sítios estranhos na página pública). */
// Domínio de topo: ".com", ".pt", ".co.uk", ".com.br"… (nunca "google.com.outro-sitio.io").
const TLD = String.raw`(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})`;
const ALLOWED_HOSTS: Record<ReviewPlatform, RegExp> = {
  google: new RegExp(String.raw`(^|\.)(google\.${TLD}|g\.page|goo\.gl)$`, "i"),
  tripadvisor: new RegExp(String.raw`(^|\.)tripadvisor\.${TLD}$`, "i"),
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  thefork: new RegExp(String.raw`(^|\.)(thefork\.${TLD}|lafourchette\.com)$`, "i"),
};

/** Valida e limpa uma ligação; devolve null se estiver vazia, ou um erro em português. */
export function cleanReviewLink(platform: ReviewPlatform, raw: unknown): { url: string | null; error?: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { url: null };
  if (value.length > 500) return { url: null, error: `A ligação do ${REVIEW_PLATFORM_LABEL[platform]} é demasiado longa.` };
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { url: null, error: `A ligação do ${REVIEW_PLATFORM_LABEL[platform]} não é válida.` };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { url: null, error: `A ligação do ${REVIEW_PLATFORM_LABEL[platform]} não é válida.` };
  if (!ALLOWED_HOSTS[platform].test(parsed.hostname)) {
    return { url: null, error: `A ligação do ${REVIEW_PLATFORM_LABEL[platform]} tem de ser de ${REVIEW_PLATFORM_LABEL[platform]}.` };
  }
  parsed.protocol = "https:";
  return { url: parsed.toString() };
}

export function defaultReviewMessage(businessName: string): string {
  return `Olá! Obrigado por ter escolhido ${businessName}. A sua opinião ajuda-nos muito: pode deixar uma avaliação aqui? {link}`;
}

/** Mensagem final: troca {link} pela página pública (ou acrescenta-a no fim). */
export function buildReviewMessage(template: string, pageUrl: string): string {
  const t = String(template || "").trim();
  return t.includes("{link}") ? t.split("{link}").join(pageUrl) : `${t} ${pageUrl}`.trim();
}

/** Ligação de WhatsApp com a mensagem já escrita; com número, abre a conversa com esse cliente. */
export function whatsappUrl(message: string, phone?: string | null): string {
  let digits = String(phone || "").replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (digits && !digits.startsWith("+") && digits.length === 9 && /^[29]/.test(digits)) digits = `+351${digits}`; // número português sem indicativo
  const n = digits.replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Avisa se a mensagem promete algo em troca (proibido pelo Google e pela Tripadvisor). */
export function incentiveWarning(message: string): string | null {
  return /\b(desconto|oferta|grátis|gratis|brinde|sorteio|prémio|premio|voucher|cupão|cupao|em troca)\b/i.test(message)
    ? "Não ofereça nada em troca de avaliações: o Google e a Tripadvisor proíbem e podem apagar as avaliações."
    : null;
}
