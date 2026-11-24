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
  inactiveFreeAccounts: 365, // contas gratuitas sem acesso há 12 meses: só sinalizadas, não apagadas
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
