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
