
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client
// The API key is obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ReviewResponseRequest {
  reviewText: string;
  platform: string;
  tone: string;
  language: string;
  establishmentContext?: {
    name?: string;
    type?: string;
    responseGuidelines?: string;
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
  responseType: string;
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
  
  async detectSentiment(reviewText: string): Promise<"positive" | "negative" | "neutral"> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the sentiment of this review. Return ONLY one word: "positive", "negative", or "neutral". Review: "${reviewText}"`,
        config: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      });

      const text = response.text?.toLowerCase().trim();
      if (text?.includes("positive")) return "positive";
      if (text?.includes("negative")) return "negative";
      return "neutral";
    } catch (error) {
      console.error("Sentiment detection error:", error);
      return "neutral";
    }
  },

  async generateReviewResponses(request: ReviewResponseRequest): Promise<GeneratedResponse[]> {
    const { reviewText, platform, tone, language, establishmentContext, dynamicFields } = request;
    
    const sentiment = await this.detectSentiment(reviewText);
    const platformKey = platform.toLowerCase().replace(/\s+/g, '_');
    const config = PLATFORM_CONFIGS[platformKey] || PLATFORM_CONFIGS['google_maps'];

    const systemInstruction = `
      You are an expert customer service AI for ${config.name || platform}.
      
      Review Sentiment: ${sentiment.toUpperCase()}
      Target Tone: ${tone}
      Language: ${language}
      
      Platform Constraints:
      - Max Characters: ${config.maxChars}
      - Emojis Allowed: ${config.allowsEmojis}
      - Style: ${config.guidelines}

      Business Context:
      ${establishmentContext?.name ? `Name: ${establishmentContext.name}` : ''}
      ${establishmentContext?.responseGuidelines ? `Guidelines: ${establishmentContext.responseGuidelines}` : ''}

      Customer Name: ${dynamicFields?.customerName || 'Customer'}

      Task: Generate 3 DISTINCT variations of a response.
      1. Concise
      2. Balanced/Standard
      3. Detailed/Personalized
      
      For negative reviews, be apologetic and solution-oriented.
      For positive reviews, be grateful and inviting.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Customer Review: "${reviewText}"`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
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
                    type: { type: Type.STRING, enum: ["concise", "balanced", "detailed"] }
                  },
                  required: ["text", "type"]
                }
              }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{"variations": []}');
      
      return json.variations.map((v: any, index: number) => ({
        variationNumber: index + 1,
        responseText: v.text,
        tone: tone,
        language: language,
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
        reviewText: params.comment,
        platform: params.platform,
        tone: params.tone,
        language: "pt", 
        establishmentContext: {
            name: params.businessContext?.businessName,
            responseGuidelines: params.extraInstructions
        }
      });

      const selected = variations[0]; // Default to first

      return {
          response: selected ? selected.responseText : "Erro ao gerar resposta.",
          sentiment: await this.detectSentiment(params.comment),
          keywords: [],
          detectedLanguage: { language: "pt" },
          tokensUsed: 0 // Mocked for legacy interface
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
