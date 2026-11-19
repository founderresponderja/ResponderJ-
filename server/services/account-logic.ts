// RJ-7.1: regras de exportação e apagamento de dados pessoais (RGPD, artigos 15.º, 17.º e 20.º),
// sem base de dados nem rede, testadas em tests/account-logic.test.ts.

/** Campos que nunca saem numa exportação (segredos, não dados pessoais do titular). */
export const SECRET_FIELDS = new Set([
  "password",
  "accessToken",
  "refreshToken",
  "access_token",
  "refresh_token",
  "token",
  "codeHash",
  "code_hash",
  "apiKey",
  "api_key",
  // Campos técnicos internos (não são dados pessoais do titular; antes apareciam a null).
  "emailVerificationToken",
  "email_verification_token",
  "passwordResetToken",
  "password_reset_token",
  "passwordResetExpires",
  "password_reset_expires",
  "clerkUserId",
  "clerk_user_id",
]);

/** Copia um registo sem os campos secretos (só no primeiro nível, que é como as tabelas vêm). */
export function stripSecrets<T extends Record<string, any>>(row: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (SECRET_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Quem pode apagar a própria conta por aqui.
 * - Operadores e o super administrador: não (o super administrador tem de transferir a função
 *   primeiro; a conta de operador é gerida no backoffice).
 * - Contas-sandbox: não (são dados simulados do backoffice).
 */
export function deletionBlockedReason(user: { isAdmin?: boolean | null; isSuperAdmin?: boolean | null; isSandbox?: boolean | null }): string | null {
  if (user.isSuperAdmin) return "O super administrador tem de transferir a função antes de apagar a conta.";
  if (user.isAdmin) return "Contas de operador são removidas no backoffice pelo super administrador.";
  if (user.isSandbox) return "Contas de teste do backoffice não podem ser apagadas por aqui.";
  return null;
}

/** Confirmação: a pessoa tem de escrever o próprio email (sem diferença de maiúsculas/espaços). */
export function confirmationMatches(userEmail: string | null | undefined, typed: unknown): boolean {
  const a = String(userEmail || "").trim().toLowerCase();
  const b = String(typed || "").trim().toLowerCase();
  return a.length > 0 && a === b;
}

/** Erros do Stripe que significam "já não existe" e não devem travar o apagamento. */
export function isStripeMissing(error: any): boolean {
  return error?.code === "resource_missing" || error?.statusCode === 404 || error?.raw?.code === "resource_missing";
}

// ---------------------------------------------------------------------------------------------
// Versão legível da exportação (o JSON abre como texto corrido no iPhone e parece um erro).

const SECTION_LABELS: Record<string, string> = {
  account: "A sua conta",
  establishments: "Negócios",
  platformConnections: "Plataformas ligadas",
  reviews: "Reviews",
  responses: "Respostas",
  learnedStyle: "Estilo aprendido",
  responseTemplates: "Modelos de resposta",
  automationRules: "Regras de automação",
  creditTransactions: "Movimentos de créditos",
  subscriptions: "Subscrições",
  agencies: "Agências",
  agencyMemberships: "Participação em equipas",
  agencyInvitationsSent: "Convites enviados",
  agencyInvitationsReceived: "Convites recebidos",
  qualityFeedback: "Avaliações de qualidade",
  referrals: "Recomendações",
  consents: "Consentimentos",
  errorReports: "Erros reportados",
};

const FIELD_LABELS: Record<string, string> = {
  id: "N.º", email: "Email", firstName: "Nome", lastName: "Apelido", companyName: "Empresa",
  companyAddress: "Morada da empresa", phone: "Telefone", nif: "NIF", role: "Tipo de conta",
  isActive: "Conta ativa", emailVerified: "Email verificado", credits: "Créditos",
  selectedPlan: "Plano escolhido", subscriptionPlan: "Plano", subscriptionStatus: "Estado da subscrição",
  cancelAtPeriodEnd: "Cancelamento no fim do período", currentPeriodStart: "Início do período",
  currentPeriodEnd: "Fim do período", creditsUsedThisPeriod: "Créditos usados no período",
  lastLoginAt: "Último acesso", createdAt: "Criada em", updatedAt: "Atualizada em",
  kind: "Documento", version: "Versão", granted: "Aceite", source: "Origem", created_at: "Data",
  name: "Nome", platform: "Plataforma", rating: "Estrelas", content: "Texto", authorName: "Autor",
  responseText: "Resposta", status: "Estado", amount: "Quantidade", description: "Descrição",
  choices: "Escolhas",
};

// Valores internos traduzidos para português.
const VALUE_LABELS: Record<string, Record<string, string>> = {
  role: { user: "Cliente", operator: "Operador", admin: "Operador", super_admin: "Super administrador" },
  selectedPlan: { trial: "Experiência", starter: "Starter", pro: "Profissional", agency: "Agência" },
  subscriptionPlan: { trial: "Experiência", starter: "Starter", pro: "Profissional", agency: "Agência" },
  source: { app: "Na app", cookies_page: "Página de cookies" },
};

const HIDDEN_IN_HTML = new Set(["emailVerified", "isAdmin", "isSuperAdmin", "isAgencyOwner", "isSandbox", "agencyId",
  "stripeCustomerId", "stripeSubscriptionId", "profileImageUrl", "userId", "user_id"]);

const KIND_LABELS: Record<string, string> = { terms: "Termos e Condições", privacy: "Política de Privacidade", cookies: "Cookies" };

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "kind" && typeof value === "string") return KIND_LABELS[value] || value;
  if (typeof value === "string" && VALUE_LABELS[key]?.[value]) return VALUE_LABELS[key][value];
  if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value))) {
    const d = new Date(value as any);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

function label(key: string): string {
  return FIELD_LABELS[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function visibleKeys(rows: Record<string, any>[]): string[] {
  const keys: string[] = [];
  for (const row of rows) for (const k of Object.keys(row || {})) {
    if (!HIDDEN_IN_HTML.has(k) && !SECRET_FIELDS.has(k) && !keys.includes(k)) keys.push(k);
  }
  return keys.slice(0, 8); // tabelas legíveis no telemóvel; o JSON tem tudo
}

/** Página HTML autónoma, em português, com os mesmos dados da exportação JSON. */
export function renderExportHtml(data: Record<string, any>): string {
  const parts: string[] = [];
  const exportedAt = formatValue("exportedAt", data?.about?.exportedAt);
  for (const [key, value] of Object.entries(data || {})) {
    if (key === "about") continue;
    const title = SECTION_LABELS[key] || label(key);
    if (Array.isArray(value)) {
      if (!value.length) {
        parts.push(`<section><h2>${escapeHtml(title)}</h2><p class="empty">Sem dados.</p></section>`);
        continue;
      }
      const keys = visibleKeys(value);
      const head = keys.map((k) => `<th>${escapeHtml(label(k))}</th>`).join("");
      const body = value.map((row: any) => `<tr>${keys.map((k) => `<td>${escapeHtml(formatValue(k, row?.[k]))}</td>`).join("")}</tr>`).join("");
      parts.push(`<section><h2>${escapeHtml(title)} <span class="count">(${value.length})</span></h2><div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`);
    } else if (value && typeof value === "object") {
      const rows = Object.entries(value)
        .filter(([k]) => !HIDDEN_IN_HTML.has(k) && !SECRET_FIELDS.has(k))
        .map(([k, v]) => `<tr><th>${escapeHtml(label(k))}</th><td>${escapeHtml(formatValue(k, v))}</td></tr>`).join("");
      parts.push(`<section><h2>${escapeHtml(title)}</h2><table class="kv">${rows}</table></section>`);
    }
  }
  return `<!DOCTYPE html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Os seus dados no Responder Já</title>
<style>
body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;max-width:900px;margin:0 auto;padding:24px;line-height:1.45}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px;color:#0369a1}.count{color:#64748b;font-weight:400}
.meta{color:#475569;font-size:14px}.empty{color:#94a3b8;font-size:14px;margin:0}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
thead th,.kv th{background:#f1f5f9;font-weight:600}.kv th{width:40%}.scroll{overflow-x:auto}
.note{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 12px;font-size:13px;color:#075985;margin-top:12px}
</style></head><body>
<h1>Os seus dados no Responder Já</h1>
<p class="meta">Exportado em ${escapeHtml(exportedAt)} · ${escapeHtml(data?.about?.legalBasis || "")}</p>
<div class="note">Por segurança, não incluímos os acessos às plataformas ligadas nem outros dados técnicos internos. Se precisar dos dados num formato para outro serviço, descarregue também a versão JSON na página "Privacidade e dados".</div>
${parts.join("\n")}
</body></html>`;
}
