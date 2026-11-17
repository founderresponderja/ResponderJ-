
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../db.js";
import { and, desc, eq } from "drizzle-orm";
import { responseLearningPatterns } from "../../shared/schema.js";

// RJ-0.4 (decisão de 17/11/2026): o Gemini é o único fornecedor de IA.
// Modelo de reserva: gemini-1.5-flash já foi descontinuado pela Google; passa a gemini-2.5-flash-lite
// (sem data de desligamento anunciada em 22/10/2026). Ambos configuráveis na Vercel.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const geminiClient = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface ReviewResponseRequest {
  userId?: number;
  reviewText: string;
  platform: string;
  tone: string;
  language?: string;
  localSeoKeywords?: string[];
  extraInstructions?: string;
  establishmentContext?: {
    name?: string;
    type?: string;
    responseGuidelines?: string;
    location?: string;
  };
  dynamicFields?: {
    customerName?: string;
  };
}

export interface GeneratedResponse {
  variationNumber: number;
  responseText: string;
  tone: string;
  language: string;
  sentiment: "positive" | "negative" | "neutral";
  seoKeywords?: string[];
  responseType: string;
  characterCount?: number;
}

interface GeminiResponseLike {
  text?: string;
}

const PLATFORM_CONFIGS: Record<string, any> = {
  google_maps: {
    maxChars: 4096,
    allowsEmojis: true,
    guidelines: "Professional, SEO-friendly, inviting."
  },
  booking: {
    maxChars: 2000,
    allowsEmojis: false,
    guidelines: "Strictly professional, service-oriented, no emojis."
  },
  tripadvisor: {
    maxChars: 4000,
    allowsEmojis: false,
    guidelines: "Detailed, grateful, addresses specific points."
  },
  facebook: {
    maxChars: 8000,
    allowsEmojis: true,
    guidelines: "Social, engaging, community-focused."
  },
  instagram: {
    maxChars: 2200,
    allowsEmojis: true,
    guidelines: "Visual style text, short, many emojis allowed."
  }
};

export const aiResponseService = {
  async callGemini(messages: Array<{ role: "system" | "user"; content: string }>, temperature = 0.7, asJson = false): Promise<GeminiResponseLike> {
    if (!geminiClient) {
      throw new Error("GEMINI_API_KEY/API_KEY is not configured.");
    }

    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
    const prompt = `${systemMessage}\n\n${userMessages}`.trim();

    const config = asJson
      ? {
          temperature,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["concise", "balanced", "detailed"] },
                  },
                  required: ["text", "type"],
                },
              },
            },
          },
        }
      : {
          temperature,
        };

    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config,
      });
      return { text: response.text || "" };
    } catch (error: any) {
      if (GEMINI_FALLBACK_MODEL === GEMINI_MODEL) throw error;
      console.warn(`Gemini primary model failed (${GEMINI_MODEL}), trying fallback (${GEMINI_FALLBACK_MODEL})`, error?.message || error);
      const fallback = await geminiClient.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents: prompt,
        config,
      });
      return { text: fallback.text || "" };
    }
  },

  // Nome mantido por compatibilidade: hoje há um só fornecedor (Gemini), com modelo de reserva em callGemini.
  async generateWithFallback(
    messages: Array<{ role: "system" | "user"; content: string }>,
    temperature = 0.7,
    asJson = false,
  ): Promise<string> {
    if (!geminiClient) {
      throw new Error("AI provider not configured. Set GEMINI_API_KEY.");
    }
    const geminiData = await this.callGemini(messages, temperature, asJson);
    return geminiData.text?.trim() || "";
  },

  parseJsonPayload<T>(raw: string, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  
  async detectSentiment(reviewText: string): Promise<"positive" | "negative" | "neutral"> {
    try {
      const text = await this.generateWithFallback(
        [
          {
            role: "system",
            content:
              "You are a sentiment classifier for customer reviews. Reply with exactly one word: positive, negative, or neutral.",
          },
          {
            role: "user",
            content: reviewText,
          },
        ],
        0.1,
      );
      const normalizedText = text.toLowerCase();
      if (normalizedText?.includes("positive")) return "positive";
      if (normalizedText?.includes("negative")) return "negative";
      return "neutral";
    } catch (error) {
      console.error("Sentiment detection error:", error);
      return "neutral";
    }
  },

  /**
   * RJ-4.4: deteção local por palavras e caracteres típicos de cada língua.
   * Devolve null quando não há uma vencedora clara (aí pergunta-se à IA).
   */
  detectLanguageHeuristic(reviewText: string): "pt" | "en" | "es" | null {
    const text = ` ${String(reviewText || "").toLowerCase()} `;
    const words = text.match(/[a-záàâãéêíóôõúüçñ]+/g) || [];
    if (words.length === 0) return null;
    const LEX: Record<"pt" | "en" | "es", string[]> = {
      pt: ["não", "muito", "obrigado", "obrigada", "você", "estava", "foi", "atendimento", "comida", "bom", "boa", "ótimo", "ótima", "também", "mas", "com", "uma", "para", "pelo", "pela", "isso", "aqui", "mais", "sempre", "simpático", "simpáticos", "espera", "lugar", "voltar", "voltaremos", "recomendo", "nós", "são", "está", "estão", "então", "já", "ao", "às", "à", "nao", "obg", "em", "tudo", "parabéns", "equipa", "razoável", "excelente", "pessoal", "gostei", "adorei", "preço", "sítio", "também"],
      es: ["muy", "pero", "gracias", "fue", "estaba", "comida", "bueno", "buena", "también", "con", "una", "para", "el", "los", "las", "del", "servicio", "lugar", "volver", "recomiendo", "nosotros", "son", "está", "están", "hay", "todo", "nada", "mucho", "perfecto", "personal", "llegó", "repetiré", "sitio", "amable"],
      en: ["the", "and", "was", "were", "very", "great", "with", "but", "not", "staff", "food", "place", "good", "nice", "service", "would", "again", "recommend", "we", "they", "this", "that", "is", "are", "had", "have", "friendly", "lovely", "value", "money", "avoid", "twice", "highly"],
    };
    const score = { pt: 0, es: 0, en: 0 };
    for (const w of words) {
      for (const lang of ["pt", "es", "en"] as const) if (LEX[lang].includes(w)) score[lang] += 1;
    }
    // Caracteres exclusivos pesam muito: ã/õ/ç só existem em português; ñ/¿/¡ em espanhol.
    score.pt += (text.match(/[ãõç]/g) || []).length * 2 + (text.match(/ção|ções|ões|lh|nh/g) || []).length;
    score.es += (text.match(/[ñ¿¡]/g) || []).length * 2 + (text.match(/ción|ciones|ll/g) || []).length;
    const ranked = (Object.entries(score) as ["pt" | "en" | "es", number][]).sort((x, y) => y[1] - x[1]);
    const [first, second] = ranked;
    if (first[1] === 0) return null;
    if (first[1] >= 2 && first[1] >= second[1] * 2) return first[0];
    return null;
  },

  async detectLanguage(reviewText: string): Promise<"pt" | "en" | "es"> {
    const local = this.detectLanguageHeuristic(reviewText);
    if (local) return local;
    try {
      const text = await this.generateWithFallback(
        [
          {
            role: "system",
            content:
              "Detect the review language. Reply with exactly one code: pt, en, or es. If unsure, reply pt.",
          },
          { role: "user", content: reviewText },
        ],
        0.1,
      );
      // RJ-4.4: ler só um código isolado. Antes, "includes('es')" apanhava "Portuguese" como espanhol.
      const match = String(text || "").toLowerCase().match(/\b(pt|en|es)\b/);
      return (match?.[1] as "pt" | "en" | "es") ?? "pt";
    } catch {
      return "pt";
    }
  },

  async getLearningPattern(input: {
    userId?: number;
    language: string;
    tone: string;
    sentiment: string;
  }): Promise<{
    openingStyle?: string | null;
    closingStyle?: string | null;
    preferredPhrases?: string[];
    avoidedPhrases?: string[];
  } | null> {
    if (!input.userId) return null;
    const [pattern] = await db
      .select()
      .from(responseLearningPatterns)
      .where(and(
        eq(responseLearningPatterns.userId, input.userId),
        eq(responseLearningPatterns.language, input.language),
        eq(responseLearningPatterns.tone, input.tone),
        eq(responseLearningPatterns.sentiment, input.sentiment),
      ))
      .orderBy(desc(responseLearningPatterns.updatedAt))
      .limit(1);
    if (!pattern) return null;
    return {
      openingStyle: pattern.openingStyle,
      closingStyle: pattern.closingStyle,
      preferredPhrases: (pattern.preferredPhrases as string[]) || [],
      avoidedPhrases: (pattern.avoidedPhrases as string[]) || [],
    };
  },

  extractPhraseDifferences(original: string, edited: string) {
    const o = original.toLowerCase();
    const e = edited.toLowerCase();
    const splitWords = (value: string) => value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const originalSet = new Set(splitWords(o));
    const editedSet = new Set(splitWords(e));
    const preferred = [...editedSet].filter((w) => !originalSet.has(w) && w.length > 3).slice(0, 10);
    const avoided = [...originalSet].filter((w) => !editedSet.has(w) && w.length > 3).slice(0, 10);
    return { preferred, avoided };
  },

  inferOpeningStyle(text: string): string {
    const first = text.trim().split(/\s+/).slice(0, 6).join(" ");
    return first;
  },

  inferClosingStyle(text: string): string {
    const words = text.trim().split(/\s+/);
    return words.slice(Math.max(0, words.length - 8)).join(" ");
  },

  async recordEditLearning(input: {
    userId: number;
    language: string;
    tone: string;
    sentiment: "positive" | "negative" | "neutral";
    originalText: string;
    editedText: string;
  }) {
    const diffs = this.extractPhraseDifferences(input.originalText, input.editedText);
    const openingStyle = this.inferOpeningStyle(input.editedText);
    const closingStyle = this.inferClosingStyle(input.editedText);

    const [existing] = await db.select().from(responseLearningPatterns).where(and(
      eq(responseLearningPatterns.userId, input.userId),
      eq(responseLearningPatterns.language, input.language),
      eq(responseLearningPatterns.tone, input.tone),
      eq(responseLearningPatterns.sentiment, input.sentiment),
    )).limit(1);

    if (existing) {
      const currentPreferred = (existing.preferredPhrases as string[]) || [];
      const currentAvoided = (existing.avoidedPhrases as string[]) || [];
      await db.update(responseLearningPatterns).set({
        openingStyle,
        closingStyle,
        preferredPhrases: Array.from(new Set([...currentPreferred, ...diffs.preferred])).slice(0, 20),
        avoidedPhrases: Array.from(new Set([...currentAvoided, ...diffs.avoided])).slice(0, 20),
        editCount: (existing.editCount || 0) + 1,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(responseLearningPatterns.id, existing.id));
      return;
    }

    await db.insert(responseLearningPatterns).values({
      userId: input.userId,
      language: input.language,
      tone: input.tone,
      sentiment: input.sentiment,
      openingStyle,
      closingStyle,
      preferredPhrases: diffs.preferred,
      avoidedPhrases: diffs.avoided,
      editCount: 1,
    });
  },

  buildLocalSeoKeywords(input: {
    platform: string;
    location?: string;
    establishmentName?: string;
    establishmentType?: string;
    provided?: string[];
  }): string[] {
    const keywords = new Set<string>();
    for (const kw of input.provided || []) {
      if (kw?.trim()) keywords.add(kw.trim());
    }
    if (input.location) keywords.add(input.location);
    if (input.establishmentName) keywords.add(input.establishmentName);
    if (input.establishmentType) keywords.add(input.establishmentType);
    keywords.add(input.platform);
    return Array.from(keywords).slice(0, 8);
  },

  async generateReviewResponses(request: ReviewResponseRequest): Promise<GeneratedResponse[]> {
    const { reviewText, platform, tone, language, establishmentContext, dynamicFields, localSeoKeywords, extraInstructions, userId } = request;
    
    const sentiment = await this.detectSentiment(reviewText);
    const autoLanguage = await this.detectLanguage(reviewText);
    const effectiveLanguage = (language || autoLanguage).toLowerCase();
    const platformKey = platform.toLowerCase().replace(/\s+/g, '_');
    const config = PLATFORM_CONFIGS[platformKey] || PLATFORM_CONFIGS['google_maps'];
    const seoKeywords = this.buildLocalSeoKeywords({
      platform,
      location: establishmentContext?.location,
      establishmentName: establishmentContext?.name,
      establishmentType: establishmentContext?.type,
      provided: localSeoKeywords,
    });
    const learningPattern = await this.getLearningPattern({
      userId,
      language: effectiveLanguage,
      tone,
      sentiment,
    });

    const systemInstruction = `
      You are an expert customer service AI for ${config.name || platform}.
      
      Review Sentiment: ${sentiment.toUpperCase()}
      Target Tone: ${tone}
      Language: ${effectiveLanguage} (reply in the same language as the review)
      
      Platform Constraints:
      - Max Characters: ${config.maxChars}
      - Emojis Allowed: ${config.allowsEmojis}
      - Style: ${config.guidelines}

      Business Context:
      ${establishmentContext?.name ? `Name: ${establishmentContext.name}` : ''}
      ${establishmentContext?.responseGuidelines ? `Guidelines: ${establishmentContext.responseGuidelines}` : ''}
      ${extraInstructions ? `Extra instructions: ${extraInstructions}` : ""}

      Customer Name: ${dynamicFields?.customerName || 'Customer'}
      SEO Local Keywords (include naturally when appropriate): ${seoKeywords.join(", ")}
      Learned style preferences:
      - Preferred opening: ${learningPattern?.openingStyle || "N/A"}
      - Preferred closing: ${learningPattern?.closingStyle || "N/A"}
      - Preferred phrases: ${(learningPattern?.preferredPhrases || []).join(", ") || "N/A"}
      - Avoid phrases: ${(learningPattern?.avoidedPhrases || []).join(", ") || "N/A"}

      Task: Generate 3 DISTINCT variations of a response.
      1. Concise
      2. Balanced/Standard
      3. Detailed/Personalized
      
      For negative reviews, be apologetic and solution-oriented.
      For positive reviews, be grateful and inviting.
    `;

    try {
      const raw = await this.generateWithFallback(
        [
          { role: "system", content: systemInstruction },
          {
            role: "user",
            content: `Customer Review: "${reviewText}"\n\nReturn ONLY valid JSON in this format:
{"variations":[{"text":"...","type":"concise"},{"text":"...","type":"balanced"},{"text":"...","type":"detailed"}]}`,
          },
        ],
        0.7,
        true,
      );
      const json = this.parseJsonPayload(raw, { variations: [] as Array<{ text: string; type: string }> }) as {
        variations: Array<{ text: string; type: string }>;
      };
      
      return json.variations.map((v: any, index: number) => ({
        variationNumber: index + 1,
        responseText: v.text,
        tone: tone,
        language: effectiveLanguage,
        sentiment,
        seoKeywords,
        responseType: v.type,
        characterCount: v.text.length
      }));

    } catch (error) {
      console.error("Generation error:", error);
      return [];
    }
  },

  // Legacy support wrapper
  async generateResponse(params: {
    comment: string;
    platform: string;
    tone: string;
    extraInstructions?: string;
    businessContext?: any;
    responseType?: string;
  }) {
      const variations = await this.generateReviewResponses({
        userId: params.businessContext?.userId,
        reviewText: params.comment,
        platform: params.platform,
        tone: params.tone,
        language: undefined,
        establishmentContext: {
            name: params.businessContext?.businessName,
            responseGuidelines: params.extraInstructions,
            type: params.businessContext?.businessType,
            location: params.businessContext?.location,
        },
        localSeoKeywords: params.businessContext?.localSeoKeywords || [],
        extraInstructions: params.extraInstructions,
      });

      const selected = variations[0]; // Default to first

      return {
          response: selected ? selected.responseText : "Erro ao gerar resposta.",
          sentiment: await this.detectSentiment(params.comment),
          keywords: selected?.seoKeywords || [],
          detectedLanguage: { language: selected?.language || "pt" },
          tokensUsed: 0
      };
  },

  async analyzeSentiment(text: string) {
      const sentiment = await this.detectSentiment(text);
      return {
          sentimentScore: sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0,
          sentimentLabel: sentiment,
          emotions: {}
      };
  },
  
  calculateCreditCost(tokens: number, platform: string) {
    return 1; 
  }
};
