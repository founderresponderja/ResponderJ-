// RJ-13.4: respostas na língua do cliente.
// Línguas suportadas, nomes para a interface, instruções para a IA e deteção local (sem IA).
// Sem dependências, para poder ser testado e usado no site, no servidor e nas apps.

export const REVIEW_LANGUAGES = ["pt", "en", "es", "fr", "de"] as const;
export type ReviewLanguage = (typeof REVIEW_LANGUAGES)[number];

/** Nomes em português europeu, para a interface. */
export const REVIEW_LANGUAGE_NAMES: Record<ReviewLanguage, string> = {
  pt: "Português (Portugal)",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
};

/**
 * Como a IA deve escrever em cada língua. O português é sempre o de Portugal:
 * sem isto, os modelos tendem a escrever em português do Brasil.
 */
export const REVIEW_LANGUAGE_PROMPT: Record<ReviewLanguage, string> = {
  pt: 'European Portuguese (Portugal, pt-PT). Never Brazilian Portuguese: use "equipa" (not "equipe"), "pequeno-almoço" (not "café da manhã"), "casa de banho" (not "banheiro"), "obrigado/obrigada", and the formal third person or "o senhor/a senhora" instead of "você"; avoid gerunds like "estamos fazendo" (use "estamos a fazer").',
  en: "English",
  es: "Spanish (Spain)",
  fr: "French",
  de: 'German, using the formal "Sie"',
};

export function isReviewLanguage(value: unknown): value is ReviewLanguage {
  return typeof value === "string" && (REVIEW_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Converte o que vier (código, nome antigo da interface como "Português", "pt-BR", "EN")
 * num código suportado, ou null se não for nenhum.
 */
export function toReviewLanguage(value: unknown): ReviewLanguage | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v || v === "auto" || v === "automatica" || v === "automática") return null;
  const code = v.slice(0, 2);
  if (isReviewLanguage(code) && (v.length === 2 || v[2] === "-" || v[2] === "_")) return code;
  const BY_NAME: Record<string, ReviewLanguage> = {
    português: "pt", portugues: "pt", portuguese: "pt",
    inglês: "en", ingles: "en", english: "en",
    espanhol: "es", spanish: "es", español: "es", espanol: "es",
    francês: "fr", frances: "fr", french: "fr", français: "fr", francais: "fr",
    alemão: "de", alemao: "de", german: "de", deutsch: "de",
  };
  return BY_NAME[v] ?? null;
}

const LEX: Record<ReviewLanguage, string[]> = {
  pt: ["não", "muito", "obrigado", "obrigada", "você", "estava", "foi", "atendimento", "comida", "bom", "boa", "ótimo", "ótima", "também", "mas", "com", "uma", "para", "pelo", "pela", "isso", "aqui", "mais", "sempre", "simpático", "simpáticos", "espera", "lugar", "voltar", "voltaremos", "recomendo", "nós", "são", "está", "estão", "então", "já", "ao", "às", "à", "nao", "obg", "em", "tudo", "parabéns", "equipa", "razoável", "excelente", "pessoal", "gostei", "adorei", "preço", "sítio"],
  es: ["muy", "pero", "gracias", "fue", "estaba", "comida", "bueno", "buena", "también", "con", "una", "para", "el", "los", "las", "del", "servicio", "lugar", "volver", "recomiendo", "nosotros", "son", "está", "están", "hay", "todo", "nada", "mucho", "perfecto", "personal", "llegó", "repetiré", "sitio", "amable"],
  en: ["the", "and", "was", "were", "very", "great", "with", "but", "not", "staff", "food", "place", "good", "nice", "service", "would", "again", "recommend", "we", "they", "this", "that", "is", "are", "had", "have", "friendly", "lovely", "value", "money", "avoid", "twice", "highly"],
  fr: ["très", "merci", "nous", "avec", "était", "accueil", "personnel", "vraiment", "chambre", "repas", "nourriture", "bien", "pas", "mais", "pour", "les", "des", "une", "est", "sont", "avons", "été", "endroit", "recommande", "petit", "déjeuner", "sympathique", "agréable", "qualité", "prix", "tout", "trop", "aussi", "je", "vous", "il", "elle", "c'était", "délicieux", "service"],
  de: ["und", "sehr", "nicht", "wir", "war", "waren", "freundlich", "essen", "danke", "ist", "mit", "das", "die", "der", "ein", "eine", "gut", "aber", "für", "auch", "zimmer", "frühstück", "personal", "lecker", "empfehlen", "wieder", "leider", "schön", "toll", "preis", "alles", "ich", "es", "zu", "auf", "nur", "hier"],
};

/**
 * Deteção local por palavras e caracteres típicos de cada língua.
 * Devolve null quando não há uma vencedora clara (aí pergunta-se à IA).
 */
export function detectReviewLanguage(reviewText: string): ReviewLanguage | null {
  const text = ` ${String(reviewText || "").toLowerCase()} `;
  const words = text.match(/[a-zàáâãäçèéêëíîïñóôõöùúûüßœ']+/g) || [];
  if (words.length === 0) return null;
  const score: Record<ReviewLanguage, number> = { pt: 0, es: 0, en: 0, fr: 0, de: 0 };
  for (const w of words) {
    for (const lang of REVIEW_LANGUAGES) if (LEX[lang].includes(w)) score[lang] += 1;
  }
  // Caracteres e terminações que só aparecem numa das línguas pesam mais.
  score.pt += (text.match(/[ãõ]/g) || []).length * 2 + (text.match(/ção|ções|ões|lh|nh/g) || []).length;
  score.es += (text.match(/[ñ¿¡]/g) || []).length * 2 + (text.match(/ción|ciones/g) || []).length;
  score.fr += (text.match(/[èëîïœù]|ç[aou]?\b|eau|aux\b|\bqu'|\bc'|\bj'|\bl'|\bd'/g) || []).length;
  score.de += (text.match(/[äöüß]/g) || []).length * 2 + (text.match(/sch|ung\b|keit\b|lich\b/g) || []).length;
  const ranked = (Object.entries(score) as [ReviewLanguage, number][]).sort((x, y) => y[1] - x[1]);
  const [first, second] = ranked;
  if (first[1] === 0) return null;
  if (first[1] >= 2 && first[1] >= second[1] * 2) return first[0];
  return null;
}
