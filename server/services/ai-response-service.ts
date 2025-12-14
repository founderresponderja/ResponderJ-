import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client
// The API key is obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiResponseService = {
  async generateResponse(params: {
    comment: string;
    platform: string;
    tone: string;
    extraInstructions?: string;
    businessContext?: any;
    responseType?: string;
  }) {
    const { comment, platform, tone, extraInstructions, businessContext, responseType } = params;

    let systemInstruction = `You are "Responder Já", an expert AI Social Media Manager and Customer Success Specialist dedicated to helping Portuguese SMEs (PME).
    Your task is to write a professional, human-like, and engaging response to a customer comment or review on ${platform}.
    
    Current Tone: ${tone}.
    Goal: ${responseType || 'Reply to the customer'}.
    
    Instructions:
    1. Detect the language of the comment and RESPOND IN THE SAME LANGUAGE (mostly Portuguese).
    2. Be empathetic, professional, and efficient.
    3. If the review is negative, apologize and offer a solution without admitting total liability unless clear.
    4. If the review is positive, thank them and invite them back warmly.
    5. Keep it concise but warm, suitable for modern social media interactions.
    `;

    if (extraInstructions && extraInstructions.trim()) {
      systemInstruction += `\n\nIMPORTANT CUSTOM INSTRUCTIONS: ${extraInstructions}`;
    }

    if (businessContext) {
      if (businessContext.businessName) systemInstruction += `\nBusiness Name: ${businessContext.businessName}`;
      if (businessContext.businessType) systemInstruction += `\nBusiness Type: ${businessContext.businessType}`;
      if (businessContext.description) systemInstruction += `\nAbout the business: ${businessContext.description}`;
      if (businessContext.responseGuidelines) systemInstruction += `\nSpecific Guidelines: ${businessContext.responseGuidelines}`;
    }

    const prompt = `Please analyze this comment and generate a response: "${comment}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { 
                type: Type.STRING, 
                description: "The generated response text to be published." 
              },
              sentiment: { 
                type: Type.STRING, 
                enum: ["Positive", "Neutral", "Negative"],
                description: "The sentiment analysis of the original comment."
              },
              keywords: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Key topics extracted from the comment."
              },
              language: {
                type: Type.STRING,
                description: "Detected language code (e.g. pt, en, es)"
              }
            },
            required: ["response", "sentiment", "keywords", "language"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      return {
        response: result.response || "Obrigado pelo seu contacto. Responderemos em breve.",
        sentiment: result.sentiment || "Neutral",
        keywords: result.keywords || [],
        detectedLanguage: { language: result.language || "pt" },
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
      };

    } catch (error) {
      console.error("AI Service Error:", error);
      return {
        response: "Não foi possível gerar uma resposta automática neste momento. Por favor tente novamente.",
        sentiment: "Neutral",
        keywords: [],
        detectedLanguage: { language: "pt" },
        tokensUsed: 0
      };
    }
  },

  async analyzeSentiment(text: string) {
    const prompt = `Analyze the sentiment of the following text: "${text}".`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentimentScore: { type: Type.NUMBER, description: "Score from -1 (negative) to 1 (positive)" },
              sentimentLabel: { type: Type.STRING, enum: ["positive", "neutral", "negative"] },
              emotions: {
                type: Type.OBJECT,
                properties: {
                  joy: { type: Type.NUMBER },
                  anger: { type: Type.NUMBER },
                  sadness: { type: Type.NUMBER },
                  surprise: { type: Type.NUMBER },
                  trust: { type: Type.NUMBER }
                }
              }
            },
            required: ["sentimentScore", "sentimentLabel", "emotions"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("AI Sentiment Error:", error);
      return {
        sentimentScore: 0,
        sentimentLabel: "neutral",
        emotions: {}
      };
    }
  },

  // Alias method for compatibility with existing calls
  async detectSentiment(text: string) {
    const result = await this.analyzeSentiment(text);
    return result.sentimentLabel || "neutral";
  },

  // Method to generate multiple response variations
  async generateReviewResponses(params: {
    reviewText: string;
    platform: string;
    tone: string;
    language: string;
    establishmentContext?: any;
    dynamicFields?: any;
  }) {
    const { reviewText, platform, tone, language, establishmentContext } = params;
    
    let prompt = `You are "Responder Já". Write 3 distinct, professional responses to this review on ${platform}.
    Review: "${reviewText}"
    Tone: ${tone}
    Language: ${language}
    `;
    
    if (establishmentContext) {
        prompt += `\nBusiness Context: ${JSON.stringify(establishmentContext)}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            variationNumber: { type: Type.INTEGER },
                            responseText: { type: Type.STRING },
                            tone: { type: Type.STRING },
                            language: { type: Type.STRING },
                            responseType: { type: Type.STRING, enum: ["agradecimento", "desculpa", "esclarecimento", "convite"] }
                        }
                    }
                }
            }
        });
        
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Error generating multiple responses:", e);
        return [];
    }
  },

  calculateCreditCost(tokens: number, platform: string) {
    // Logic: 1 credit per generation mostly. Complex ones could cost more.
    return 1; 
  }
};