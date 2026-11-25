// RJ-7.3: prazos de conservação (dias). Sem acesso à base de dados, para testar.
// Política completa e fundamentos: docs/RETENCAO-DE-DADOS.md.

export const RETENTION_DAYS = {
  appErrors: 90,            // erros técnicos (Saúde técnica): resolvidos ou sem repetição há 90 dias
  stripeEvents: 90,         // registo de avisos do Stripe (só serve para não processar duas vezes)
  invitations: 90,          // convites usados ou expirados
  oauthStates: 1,           // estados temporários do login com Google/Facebook
  incidents: 365,           // reportes de erros resolvidos (com anexos e histórico)
  emailLog: 365,            // registo de emails enviados
  auditLog: 730,            // registo de ações de administração e do agendamento diário
  inactiveFreeAccounts: 365, // contas gratuitas sem acesso há 12 meses: apagadas, com aviso 30 dias antes
} as const;

export type RetentionKey = keyof typeof RETENTION_DAYS;

/** Data limite: o que for anterior a ela já passou do prazo. */
export function cutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Todas as datas limite de uma vez. */
export function cutoffs(now: Date): Record<RetentionKey, Date> {
  const out = {} as Record<RetentionKey, Date>;
  for (const k of Object.keys(RETENTION_DAYS) as RetentionKey[]) out[k] = cutoff(now, RETENTION_DAYS[k]);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Contas gratuitas inativas (decisão do Luís, 24/11/2026): aviso por email 30 dias antes e,
// se a pessoa não voltar a entrar, apagamento da conta e dos dados.

export const INACTIVE_WARNING_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Identifica o período de inatividade (o dia do último acesso). Se a pessoa voltar a entrar,
 * o último acesso muda e o aviso antigo deixa de valer: é preciso avisar de novo.
 */
export function inactivityRef(lastActivity: Date | string): string {
  return new Date(lastActivity).toISOString().slice(0, 10);
}

/** Dia em que a conta pode ser apagada (12 meses depois do último acesso). */
export function inactiveDeletionDate(lastActivity: Date | string): Date {
  return new Date(new Date(lastActivity).getTime() + RETENTION_DAYS.inactiveFreeAccounts * DAY);
}

/**
 * O que fazer hoje com uma conta gratuita:
 * - "warn": faltam 30 dias ou menos para os 12 meses e ainda não foi avisada neste período;
 * - "delete": passaram 12 meses E o aviso saiu há pelo menos 30 dias (nunca se apaga sem aviso);
 * - null: nada.
 */
export function inactiveAccountAction(
  account: { lastActivity: Date | string | null | undefined; warnedAt?: Date | string | null },
  now: Date = new Date(),
): "warn" | "delete" | null {
  if (!account.lastActivity) return null;
  const last = new Date(account.lastActivity);
  if (!Number.isFinite(last.getTime())) return null;
  const deleteAt = inactiveDeletionDate(last).getTime();
  const warnFrom = deleteAt - INACTIVE_WARNING_DAYS * DAY;
  if (now.getTime() < warnFrom) return null;
  if (!account.warnedAt) return "warn";
  const warned = new Date(account.warnedAt).getTime();
  if (!Number.isFinite(warned)) return "warn";
  if (now.getTime() >= deleteAt && now.getTime() - warned >= INACTIVE_WARNING_DAYS * DAY) return "delete";
  return null;
}

const fmtDay = (d: Date) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric" }).format(d);

/** Email de aviso (texto simples, como os restantes emails de ciclo de vida). */
export function inactiveWarningContent(user: { firstName?: string | null }, deleteOn: Date, baseUrl: string) {
  const hi = `Olá${user.firstName ? ` ${user.firstName}` : ""},`;
  return {
    subject: "A sua conta Responder Já vai ser apagada por inatividade",
    text: `${hi}\n\nA sua conta gratuita da Responder Já não é usada há quase um ano. Para proteger os seus dados, as contas gratuitas sem acesso durante 12 meses são apagadas.\n\nSe não voltar a entrar, a conta e todos os dados (negócios, avaliações e respostas) serão apagados a partir de ${fmtDay(deleteOn)}.\n\nPara manter a conta, basta entrar em ${baseUrl}. Se preferir guardar uma cópia dos dados antes, vá a "Privacidade e dados" → "Descarregar os meus dados".\n\nEquipa Responder Já`,
  };
}
