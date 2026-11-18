// Nome de quem escreveu a review, para o prompt da IA (sem dependências; testado).
/**
 * Nome de quem escreveu a review. Sem nome, a IA não pode inventar nem usar marcadores
 * como "Customer" (aparecia "Olá, Customer!" nas respostas).
 */
export function customerNameInstruction(name?: string | null): string {
  const clean = String(name || "").trim();
  const generic = /^(customer|cliente|anónimo|anonimo|anonymous|utilizador do google|a google user)$/i;
  if (!clean || generic.test(clean)) {
    return "Customer Name: unknown. Do NOT invent a name and do NOT use placeholders such as \"Customer\" or \"Cliente\"; use a natural greeting without a name (e.g. \"Olá!\").";
  }
  return `Customer Name: ${clean}. Address them by first name only (e.g. "Olá, Ana!"), never by surname alone.`;
}
