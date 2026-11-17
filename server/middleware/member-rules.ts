// RJ-5.5: regras para membros da equipa de uma agência (sem dependências, testadas em
// tests/member-rules.test.ts).

/** Caminhos onde o membro continua a ser ele próprio (não passa a correr como o dono). */
export function memberKeepsOwnIdentity(path: string): boolean {
  // /api/account (RJ-7.1): exportar ou apagar os dados é sempre da própria pessoa.
  // /api/consents (RJ-7.2): quem aceita os termos é a pessoa, não a agência.
  return path.startsWith("/api/backoffice") || path.startsWith("/api/invitations") || path.startsWith("/api/account")
    || path.startsWith("/api/consents");
}

const MEMBER_BLOCKED: { method?: string; pattern: RegExp; what: string }[] = [
  {
    pattern: /^\/api\/billing\/(create-checkout-session|create-subscription|subscription|portal|cancel|reactivate)/,
    what: "pagamentos (só o dono da agência)",
  },
];

/** Devolve a razão do bloqueio, ou null se o membro pode fazer o pedido. */
export function memberBlockedReason(method: string, path: string): string | null {
  const m = String(method || "GET").toUpperCase();
  const hit = MEMBER_BLOCKED.find((rule) => (!rule.method || rule.method === m) && rule.pattern.test(path));
  return hit ? hit.what : null;
}

/** Quem pode gerir a equipa: o dono, ou um membro com papel de administrador. */
export function canManageTeam(input: { isOwner: boolean; memberRole?: string | null }): boolean {
  return input.isOwner || input.memberRole === "admin";
}
