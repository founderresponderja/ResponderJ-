// RJ-5.7: base de conhecimento da Sofia, por perfil.
//
// Regra: tudo o que muda com o produto (preços, limites) é GERADO a partir da fonte única
// (shared/plans.ts, incident-logic.ts). Nunca escrever aqui números à mão: foi assim que a Sofia
// chegou a dar preços que não existiam (auditoria de 08/2026).
// Para acrescentar conhecimento: editar as secções abaixo (texto curto, factual, em português de Portugal).
import { PLANS, PLAN_KEYS, formatPriceEur, isUnlimited } from "../../shared/plans.js";
import { CATEGORIES, CATEGORY_LABEL, SEVERITIES, SEVERITY_LABEL, SLA_BUSINESS_DAYS } from "../services/incident-logic.js";
import { isBackofficeAudience, type SofiaAudience } from "./sofia-logic.js";

const n = (v: number, word: string) => (isUnlimited(v) ? `${word} sem limite` : `${v} ${word}`);

export function plansKnowledge(): string {
  const lines = PLAN_KEYS.map((k) => {
    const p = PLANS[k];
    const extras = [
      p.features.hasAutoResponse ? "respostas automáticas" : null,
      p.features.hasClientManagement ? "gestão de clientes e equipa" : null,
      p.features.hasAdvancedAnalytics ? "análises avançadas" : p.features.hasAnalytics ? "análises" : null,
    ].filter(Boolean).join(", ");
    const trial = p.trialDays ? `, dura ${p.trialDays} dias, sem cartão` : "";
    return `- ${p.label}: ${formatPriceEur(p.priceEur)}; ${p.monthlyResponses} respostas de IA por mês; ${n(p.maxEstablishments, "estabelecimento(s)")}; ${n(p.users, "utilizador(es)")}${trial}${extras ? `; inclui ${extras}` : ""}.`;
  });
  return `PLANOS (valores oficiais; não há outros):\n${lines.join("\n")}`;
}

const CORE = `
O QUE É O RESPONDER JÁ
- Ajuda negócios a responder às reviews online com IA. A IA propõe respostas; a pessoa revê, aceita e publica.
- Plataformas: hoje só o Google (perfil do negócio) está ligado. As outras (Facebook, Booking, TripAdvisor, etc.) aparecem como "Em breve" e ainda não funcionam. Não prometer datas.

RESPOSTAS E CRÉDITOS
- Na Caixa de entrada escolhe-se uma review e gera-se uma resposta (a IA escreve no idioma da review e trata a pessoa pelo primeiro nome).
- "Refazer" pede outra versão (até 3 tentativas por review); "Editar" permite mudar o texto; "Descartar" apaga a proposta.
- Gerar e refazer não gastam créditos. Só "Aceitar" gasta 1 crédito. Depois de aceite, a resposta pode ser publicada no Google.
- Os créditos são mensais, de acordo com o plano, e renovam no início de cada período.
- Respostas automáticas (planos com essa funcionalidade): todas as noites, a app prepara respostas para as reviews novas. Ficam pendentes para revisão e só gastam crédito quando são aceites.

LIGAÇÃO AO GOOGLE
- Liga-se em Plataformas → Ligar Google, com a conta Google que gere o perfil do negócio.
- As reviews são sincronizadas quando se liga a conta e todas as noites.
- Se a ligação expirar, as reviews novas deixam de chegar: é preciso voltar a ligar em Plataformas.

PAGAMENTOS
- Pagamentos com cartão através do Stripe. Faturas, cartão e cancelamento geridos no portal do cliente (Planos e faturação).
- Cancelar não corta o acesso de imediato: o plano mantém-se até ao fim do período pago.
- Se um pagamento falhar, a pessoa recebe um email e tem alguns dias para atualizar o cartão.

REPORTAR UM ERRO
- Menu "Reportar um erro": descrição e até 2 imagens (1 MB cada).
- A pessoa recebe um email com o prazo estimado (em dias úteis; fins de semana e feriados nacionais não contam) e outro quando o problema fica resolvido.

PRIVACIDADE
- Em "Privacidade e dados": descarregar todos os dados (versão fácil de ler ou JSON) e apagar a conta (definitivo; pede para escrever o email da conta).
`;

const AGENCY = `
AGÊNCIAS
- O plano Agência permite gerir vários clientes (estabelecimentos) e uma equipa.
- Convites de equipa (menu Equipa): são sempre para "membro". O dono pode depois tornar um membro administrador da agência.
- Os membros trabalham na conta da agência, com os créditos da agência. Pagamentos e plano são só do dono.
- Administradores da agência podem gerir a equipa; membros não.
`;

const BACKOFFICE = (() => {
  const sev = SEVERITIES.map((s) => `${s} = ${SEVERITY_LABEL[s]} (${SLA_BUSINESS_DAYS[s]} dia(s) útil(eis))`).join("; ");
  const cat = CATEGORIES.map((c) => `${c} = ${CATEGORY_LABEL[c]}`).join("; ");
  return `
BACKOFFICE (operadores e super administrador)
- Separadores: Visão geral, Clientes, Ver como cliente (sandboxes), Uso da IA, Sincronizações, Erros, Saúde técnica, Registo de ações; o super administrador tem ainda Indicadores de erros e Operadores.
- ERROS REPORTADOS: estados open (aberto), in_progress (em curso), resolved (resolvido).
  Gravidades e prazos: ${sev}.
  Categorias: ${cat}.
  A IA classifica cada reporte; o operador pode reclassificar (o prazo é recalculado a partir da data do reporte),
  atribuir-se o caso, acrescentar notas e dar como resolvido (envia um email ao cliente com a mensagem escrita).
- SAÚDE TÉCNICA: erros técnicos agrupados (servidor e navegador), com contagem e "Marcar como visto" (reaparece se voltar a acontecer).
- VER COMO CLIENTE: sandboxes com dados simulados; em sandbox não se enviam convites nem emails reais.
- CLIENTES: o operador pode ver a conta, ajustar créditos e mudar o plano com data de fim e motivo (fica no Registo de ações).
`;
})();

export function knowledgeFor(audience: SofiaAudience): string {
  const parts = [plansKnowledge(), CORE];
  if (audience === "agency_owner" || audience === "agency_member" || isBackofficeAudience(audience)) parts.push(AGENCY);
  if (isBackofficeAudience(audience)) parts.push(BACKOFFICE);
  return parts.join("\n").trim();
}
