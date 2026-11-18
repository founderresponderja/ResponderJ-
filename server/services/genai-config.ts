// Escolha do serviço do Gemini (sem dependências; testado em tests/genai-config.test.ts).
//
// Dois modos, escolhidos por variáveis na Vercel:
//  - "ai-studio" (Gemini Developer API): GEMINI_API_KEY (ou API_KEY). Na conta atual é PRÉ-PAGO:
//    quando o saldo acaba, todos os pedidos falham. Fica só como alternativa.
//  - "agent-platform" (Gemini Enterprise Agent Platform, ex-Vertex AI): faturação pós-paga da
//    conta Google Cloud. Ativa-se com GEMINI_PROVIDER=agent-platform e uma de duas credenciais:
//      a) AGENT_PLATFORM_API_KEY — chave da Agent Platform (ligada a uma conta de serviço); ou
//      b) GOOGLE_CLOUD_PROJECT + GOOGLE_SERVICE_ACCOUNT_JSON (o JSON da conta de serviço, em texto
//         ou em base64) e, opcionalmente, GOOGLE_CLOUD_LOCATION (por omissão europe-west1).
export type GenAIProvider = "ai-studio" | "agent-platform";

export interface GenAIConfig {
  provider: GenAIProvider;
  configured: boolean;
  /** Opções para new GoogleGenAI(...). Vazio quando não está configurado. */
  options: Record<string, any>;
  /** Descrição curta para registos e para o backoffice (nunca inclui segredos). */
  description: string;
}

function parseServiceAccount(raw: string | undefined): Record<string, any> | null {
  const text = String(raw || "").trim();
  if (!text) return null;
  const candidates = [text];
  if (!text.startsWith("{")) {
    try { candidates.push(Buffer.from(text, "base64").toString("utf8")); } catch { /* ignora */ }
  }
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && parsed.client_email && parsed.private_key) return parsed;
    } catch { /* tenta o seguinte */ }
  }
  return null;
}

export function resolveGenAIConfig(env: Record<string, string | undefined> = process.env): GenAIConfig {
  const wanted = String(env.GEMINI_PROVIDER || "").toLowerCase().trim();
  const useAgentPlatform = ["agent-platform", "vertex", "vertexai", "enterprise"].includes(wanted)
    || ["true", "1"].includes(String(env.GOOGLE_GENAI_USE_VERTEXAI || "").toLowerCase());

  if (useAgentPlatform) {
    const apiKey = String(env.AGENT_PLATFORM_API_KEY || "").trim();
    if (apiKey) {
      return { provider: "agent-platform", configured: true, options: { vertexai: true, apiKey }, description: "Agent Platform (chave)" };
    }
    const project = String(env.GOOGLE_CLOUD_PROJECT || "").trim();
    const location = String(env.GOOGLE_CLOUD_LOCATION || "europe-west1").trim();
    const credentials = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (project && credentials) {
      return {
        provider: "agent-platform",
        configured: true,
        options: {
          vertexai: true,
          project,
          location,
          googleAuthOptions: { credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] },
        },
        description: `Agent Platform (conta de serviço, ${project}, ${location})`,
      };
    }
    return { provider: "agent-platform", configured: false, options: {}, description: "Agent Platform sem credenciais" };
  }

  const key = String(env.GEMINI_API_KEY || env.API_KEY || "").trim();
  return key
    ? { provider: "ai-studio", configured: true, options: { apiKey: key }, description: "AI Studio (chave)" }
    : { provider: "ai-studio", configured: false, options: {}, description: "IA não configurada" };
}
