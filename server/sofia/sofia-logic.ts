// RJ-5.7: regras da Sofia dentro da app (sem base de dados; testado em tests/sofia-logic.test.ts).
//
// Princípios:
//  - A Sofia sabe quem é a pessoa (perfil) e só tem as ferramentas desse perfil.
//  - Ler dados: a Sofia usa ferramentas que correm no servidor, com as permissões da pessoa.
//  - Alterar dados: a Sofia NUNCA executa. Cria uma "proposta" (ação + botão "Confirmar"); é o clique
//    da pessoa que chama o mesmo endereço da app que já existe, com as mesmas permissões e auditoria.
//  - Texto de reviews, reportes e clientes é escrito por terceiros: é tratado como dados, nunca como ordens.
import { CATEGORIES, SEVERITIES, CATEGORY_LABEL, SEVERITY_LABEL, type Category, type Severity } from "../services/incident-logic.js";

export type SofiaAudience = "super_admin" | "operator" | "agency_owner" | "agency_member" | "customer";

export function audienceFor(input: {
  platformRole: "super_admin" | "operator" | "customer";
  isMember: boolean;
  hasClientManagement: boolean;
}): SofiaAudience {
  if (input.platformRole === "super_admin") return "super_admin";
  if (input.platformRole === "operator") return "operator";
  if (input.isMember) return "agency_member";
  if (input.hasClientManagement) return "agency_owner";
  return "customer";
}

export const AUDIENCE_LABEL: Record<SofiaAudience, string> = {
  super_admin: "super administrador da plataforma",
  operator: "operador do backoffice",
  agency_owner: "dono de uma agência (gere vários clientes)",
  agency_member: "membro da equipa de uma agência",
  customer: "cliente (dono de um negócio)",
};

export const isBackofficeAudience = (a: SofiaAudience) => a === "operator" || a === "super_admin";

const CUSTOMER_TOOLS = ["account_summary", "unanswered_reviews", "navigate"];
const BACKOFFICE_TOOLS = [
  "list_incidents", "get_incident", "find_customer", "list_technical_errors", "navigate",
  "propose_reclassify_incident", "propose_assign_incident_to_me", "propose_add_incident_note", "propose_resolve_incident",
];

/** Ferramentas disponíveis para cada perfil (o servidor só declara e só aceita estas). */
export function toolNamesFor(audience: SofiaAudience): string[] {
  return isBackofficeAudience(audience) ? BACKOFFICE_TOOLS : CUSTOMER_TOOLS;
}

// Destinos de navegação permitidos por perfil (o ecrã muda de separador; nada é alterado).
export const APP_DESTINATIONS: Record<string, string> = {
  inbox: "Caixa de entrada (reviews e respostas)",
  platforms: "Plataformas (ligar o Google)",
  "business-profile": "Perfil do negócio",
  pricing: "Planos e faturação",
  team: "Equipa",
  agency: "Clientes da agência",
  privacy: "Privacidade e dados",
  analytics: "Análises",
};
export const BACKOFFICE_DESTINATIONS: Record<string, string> = {
  incidents: "Erros reportados",
  health: "Saúde técnica",
  customers: "Clientes",
  sandbox: "Ver como cliente",
  "incident-stats": "Indicadores de erros",
  audit: "Registo de ações",
};

export function destinationsFor(audience: SofiaAudience): Record<string, string> {
  if (isBackofficeAudience(audience)) return BACKOFFICE_DESTINATIONS;
  const d = { ...APP_DESTINATIONS };
  if (audience !== "agency_owner") { delete d.agency; delete d.team; }
  if (audience === "agency_member") delete d.pricing;
  return d;
}

export interface SofiaProposal {
  kind: "api" | "navigate";
  label: string;           // o que aparece no botão / descrição
  detail?: string;         // aviso extra (ex.: "envia email ao cliente")
  method?: "POST";
  path?: string;
  body?: Record<string, unknown>;
  view?: "app" | "backoffice";
  tab?: string;
}

const toId = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/**
 * Transforma o pedido de uma ferramenta "propose_*" ou "navigate" numa proposta validada.
 * Devolve { error } se os dados não forem válidos ou a ferramenta não for permitida ao perfil.
 */
export function buildProposal(audience: SofiaAudience, name: string, args: any): { proposal?: SofiaProposal; error?: string } {
  if (!toolNamesFor(audience).includes(name)) return { error: "Ação não permitida para este perfil." };
  const a = args || {};
  switch (name) {
    case "navigate": {
      const dest = String(a.destination || "");
      const allowed = destinationsFor(audience);
      if (!allowed[dest]) return { error: `Destino desconhecido. Opções: ${Object.keys(allowed).join(", ")}.` };
      return { proposal: { kind: "navigate", label: `Abrir: ${allowed[dest]}`, view: isBackofficeAudience(audience) ? "backoffice" : "app", tab: dest } };
    }
    case "propose_reclassify_incident": {
      const id = toId(a.incident_id);
      const severity = String(a.severity || "") as Severity;
      const category = String(a.category || "") as Category;
      if (!id) return { error: "Número do erro inválido." };
      if (!(SEVERITIES as readonly string[]).includes(severity)) return { error: `Gravidade inválida. Opções: ${SEVERITIES.join(", ")}.` };
      if (!(CATEGORIES as readonly string[]).includes(category)) return { error: `Categoria inválida. Opções: ${CATEGORIES.join(", ")}.` };
      return { proposal: {
        kind: "api", method: "POST", path: `/api/backoffice/incidents/${id}/reclassify`,
        body: { severity, category, reason: clip(a.reason, 500) || "Reclassificado com a Sofia" },
        label: `Reclassificar o erro n.º ${id}: ${SEVERITY_LABEL[severity]} · ${CATEGORY_LABEL[category]}`,
        detail: "O prazo é recalculado a partir da data em que o erro foi reportado.",
      } };
    }
    case "propose_assign_incident_to_me": {
      const id = toId(a.incident_id);
      if (!id) return { error: "Número do erro inválido." };
      return { proposal: { kind: "api", method: "POST", path: `/api/backoffice/incidents/${id}/assign`, body: {}, label: `Atribuir-me o erro n.º ${id}` } };
    }
    case "propose_add_incident_note": {
      const id = toId(a.incident_id);
      const note = clip(a.note, 2000);
      if (!id) return { error: "Número do erro inválido." };
      if (!note) return { error: "A nota está vazia." };
      return { proposal: { kind: "api", method: "POST", path: `/api/backoffice/incidents/${id}/note`, body: { note }, label: `Acrescentar nota ao erro n.º ${id}`, detail: note } };
    }
    case "propose_resolve_incident": {
      const id = toId(a.incident_id);
      const msg = clip(a.message_to_customer, 2000);
      if (!id) return { error: "Número do erro inválido." };
      if (!msg) return { error: "Falta a mensagem para o cliente (vai no email de resolução)." };
      return { proposal: {
        kind: "api", method: "POST", path: `/api/backoffice/incidents/${id}/resolve`, body: { resolutionNote: msg },
        label: `Dar o erro n.º ${id} como resolvido`,
        detail: `Envia um email ao cliente com esta mensagem: "${msg}"`,
      } };
    }
    default:
      return { error: "Ferramenta desconhecida." };
  }
}

/** Só a forma "api" com caminhos conhecidos chega ao navegador (defesa extra contra propostas forjadas). */
export function isAllowedProposalPath(path: string): boolean {
  return /^\/api\/backoffice\/incidents\/\d+\/(reclassify|assign|note|resolve)$/.test(path);
}

// ------------------------------------------------------------------------------------------------
// Avisos proativos (fase 3): calculados pela app, sem IA.

export interface NudgeFacts {
  unansweredNegativeOld?: number;   // reviews 1-2 estrelas sem resposta há mais de 3 dias
  unansweredTotal?: number;
  expiredConnections?: string[];    // plataformas com ligação expirada/desligada
  creditsRemaining?: number;
  creditsTotal?: number;            // -1 = sem limite
  trialDaysLeft?: number | null;
  incidentsOverdue?: number;
  incidentsDueSoon?: number;        // vencem nas próximas 24 h
  criticalOpen?: number;
  technicalErrorsNew?: number;      // erros técnicos por ver
}

export interface Nudge { id: string; level: "info" | "warning" | "critical"; text: string; destination: string }

export function computeNudges(audience: SofiaAudience, f: NudgeFacts): Nudge[] {
  const out: Nudge[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (isBackofficeAudience(audience)) {
    if (f.incidentsOverdue) out.push({ id: "incidents-overdue", level: "critical", destination: "incidents",
      text: `${plural(f.incidentsOverdue, "erro reportado já passou", "erros reportados já passaram")} do prazo.` });
    if (f.criticalOpen) out.push({ id: "incidents-critical", level: "critical", destination: "incidents",
      text: `${plural(f.criticalOpen, "erro crítico está", "erros críticos estão")} por resolver.` });
    if (f.incidentsDueSoon) out.push({ id: "incidents-due", level: "warning", destination: "incidents",
      text: `${plural(f.incidentsDueSoon, "erro vence", "erros vencem")} nas próximas 24 horas.` });
    if (f.technicalErrorsNew) out.push({ id: "tech-errors", level: "info", destination: "health",
      text: `${plural(f.technicalErrorsNew, "erro técnico novo", "erros técnicos novos")} na Saúde técnica.` });
    return out;
  }
  for (const p of f.expiredConnections || []) {
    out.push({ id: `conn-${p}`, level: "critical", destination: "platforms",
      text: `A ligação ao ${p === "google" ? "Google" : p} expirou: as reviews novas deixaram de chegar. Volte a ligar em Plataformas.` });
  }
  if (f.unansweredNegativeOld) out.push({ id: "negative-old", level: "warning", destination: "inbox",
    text: `${plural(f.unansweredNegativeOld, "review negativa espera", "reviews negativas esperam")} resposta há mais de 3 dias.` });
  else if (f.unansweredTotal && f.unansweredTotal >= 5) out.push({ id: "unanswered", level: "info", destination: "inbox",
    text: `Tem ${f.unansweredTotal} reviews por responder.` });
  if (audience !== "agency_member" && f.creditsTotal !== undefined && f.creditsTotal > 0 && f.creditsRemaining !== undefined
    && f.creditsRemaining <= Math.max(1, Math.floor(f.creditsTotal * 0.2))) {
    out.push({ id: "credits-low", level: "warning", destination: "pricing",
      text: f.creditsRemaining <= 0 ? "Os créditos de respostas acabaram." : `Restam ${plural(f.creditsRemaining, "crédito", "créditos")} de respostas.` });
  }
  if (audience !== "agency_member" && f.trialDaysLeft !== null && f.trialDaysLeft !== undefined && f.trialDaysLeft >= 0 && f.trialDaysLeft <= 2) {
    out.push({ id: "trial-ending", level: "warning", destination: "pricing",
      text: f.trialDaysLeft === 0 ? "O período experimental termina hoje." : `O período experimental termina daqui a ${plural(f.trialDaysLeft, "dia", "dias")}.` });
  }
  return out;
}

/** Primeiro nome (para a Sofia tratar a pessoa pelo nome). */
export function firstNameOf(name?: string | null, email?: string | null): string {
  const n = String(name || "").trim().split(/\s+/)[0];
  if (n) return n;
  return String(email || "").split("@")[0].split(/[.+_-]/)[0] || "";
}
