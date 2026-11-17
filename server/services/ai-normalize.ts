// RJ-4.6: validação da resposta JSON do Gemini (sem dependências, para poder ser testada).
// Valores fora da lista caem para um valor seguro.

export function normalizeGeneration(
  json: { sentiment?: string; language?: string; keywords?: unknown; variations?: Array<{ text?: string; type?: string }> },
  knownLanguage: string | null,
) {
  const sentiment = (["positive", "neutral", "negative"].includes(String(json?.sentiment))
    ? json.sentiment
    : "neutral") as "positive" | "neutral" | "negative";
  const language = knownLanguage || (["pt", "en", "es"].includes(String(json?.language)) ? String(json.language) : "pt");
  const keywords = Array.isArray(json?.keywords)
    ? Array.from(new Set((json.keywords as unknown[]).map((k) => String(k || "").trim().toLowerCase()).filter((k) => k && k.length <= 60))).slice(0, 5)
    : [];
  const variations = (Array.isArray(json?.variations) ? json.variations : [])
    .filter((v) => typeof v?.text === "string" && v.text.trim())
    .map((v) => ({ text: String(v.text).trim(), type: String(v.type || "balanced") }));
  return { sentiment, language, keywords, variations };
}
