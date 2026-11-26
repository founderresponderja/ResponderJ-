// RJ-13.5: relatório semanal — o que os clientes repetem e o que mudar.
// Regras puras (sem base de dados nem IA), para poderem ser testadas.

export interface WeekReview {
  rating: number | null;
  sentiment: string | null;
  keywords: string[] | null;
  text: string | null;
  answered: boolean;
}

export interface WeekSummary {
  total: number;
  averageRating: number | null;
  positive: number;
  neutral: number;
  negative: number;
  unanswered: number;
  /** Temas mais repetidos nas avaliações positivas e negativas (com contagem). */
  praise: Array<{ topic: string; count: number }>;
  complaints: Array<{ topic: string; count: number }>;
}

/** Semana ISO (ex.: "2026-W48"), para o relatório sair uma só vez por semana. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** O relatório sai à segunda; terça serve de repescagem se a segunda não chegou a todos. */
export function isReportDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 1 || day === 2;
}

/** Semana anterior completa (segunda a domingo), em UTC. */
export function previousWeekRange(now: Date): { from: Date; to: Date; key: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay() || 7; // segunda = 1 … domingo = 7
  const thisMonday = new Date(today.getTime() - (day - 1) * 86400000);
  const from = new Date(thisMonday.getTime() - 7 * 86400000);
  return { from, to: thisMonday, key: isoWeekKey(from) };
}

function sentimentOf(r: WeekReview): "positive" | "neutral" | "negative" {
  const s = String(r.sentiment || "").toLowerCase();
  if (s === "positive" || s === "negative" || s === "neutral") return s;
  if (typeof r.rating === "number") return r.rating >= 4 ? "positive" : r.rating <= 2 ? "negative" : "neutral";
  return "neutral";
}

function topTopics(list: WeekReview[], limit: number) {
  const counts = new Map<string, number>();
  for (const r of list) {
    for (const k of new Set((r.keywords || []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean))) {
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, limit);
}

export function summarizeWeek(reviews: WeekReview[]): WeekSummary {
  const rated = reviews.filter((r) => typeof r.rating === "number" && r.rating! >= 1 && r.rating! <= 5);
  const bySentiment = { positive: [] as WeekReview[], neutral: [] as WeekReview[], negative: [] as WeekReview[] };
  for (const r of reviews) bySentiment[sentimentOf(r)].push(r);
  return {
    total: reviews.length,
    averageRating: rated.length ? Math.round((rated.reduce((s, r) => s + r.rating!, 0) / rated.length) * 10) / 10 : null,
    positive: bySentiment.positive.length,
    neutral: bySentiment.neutral.length,
    negative: bySentiment.negative.length,
    unanswered: reviews.filter((r) => !r.answered).length,
    praise: topTopics(bySentiment.positive, 3),
    complaints: topTopics([...bySentiment.negative, ...bySentiment.neutral], 3),
  };
}

/** Textos (já cortados) para a IA sugerir o que mudar: primeiro os negativos. */
export function textsForSuggestions(reviews: WeekReview[], max = 20): string[] {
  const order = { negative: 0, neutral: 1, positive: 2 } as const;
  return reviews
    .filter((r) => String(r.text || "").trim())
    .sort((a, b) => order[sentimentOf(a)] - order[sentimentOf(b)])
    .slice(0, max)
    .map((r) => `[${r.rating ?? "?"}★] ${String(r.text).trim().slice(0, 500)}`);
}

/** Lê a resposta da IA: uma sugestão por linha, no máximo 3. */
export function parseSuggestions(raw: string): string[] {
  return String(raw || "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length >= 10)
    .slice(0, 3);
}

export function weeklyReportContent(input: {
  firstName?: string | null;
  weekLabel: string;
  businesses: Array<{ name: string; summary: WeekSummary; suggestions: string[] }>;
  baseUrl: string;
}): { subject: string; text: string } {
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  const blocks = input.businesses.map(({ name, summary: s, suggestions }) => {
    const lines = [
      `${name}`,
      `- ${plural(s.total, "avaliação nova", "avaliações novas")}${s.averageRating !== null ? `, média ${String(s.averageRating).replace(".", ",")} estrelas` : ""}`,
      `- ${s.positive} positivas, ${s.neutral} neutras, ${s.negative} negativas`,
      s.unanswered ? `- ${plural(s.unanswered, "avaliação sem resposta", "avaliações sem resposta")}` : "- Todas respondidas",
    ];
    if (s.complaints.length) lines.push(`- O que os clientes repetem de menos bom: ${s.complaints.map((t) => `${t.topic} (${t.count})`).join(", ")}`);
    if (s.praise.length) lines.push(`- O que elogiam: ${s.praise.map((t) => `${t.topic} (${t.count})`).join(", ")}`);
    if (suggestions.length) lines.push("", "O que mudar esta semana:", ...suggestions.map((x, i) => `${i + 1}. ${x}`));
    return lines.join("\n");
  });
  const total = input.businesses.reduce((n, b) => n + b.summary.unanswered, 0);
  return {
    subject: `Relatório semanal ${input.weekLabel}: ${total ? plural(total, "avaliação por responder", "avaliações por responder") : "tudo respondido"}`,
    text: `Olá${input.firstName ? ` ${input.firstName}` : ""},\n\nResumo da semana ${input.weekLabel}.\n\n${blocks.join("\n\n")}\n\nVer e responder: ${input.baseUrl}/app\n\nPode desligar este relatório em Privacidade e dados.\n\nResponder Já`,
  };
}
