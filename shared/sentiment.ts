// RJ-4.3: sentimento de base a partir das estrelas (sem custo de IA).
// 4-5 positivo, 3 neutro, 1-2 negativo. Sem estrelas válidas: null.
export type Sentiment = "positive" | "neutral" | "negative";

export function sentimentFromRating(rating: number | null | undefined): Sentiment | null {
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return null;
  if (r >= 4) return "positive";
  if (r >= 3) return "neutral";
  return "negative";
}
