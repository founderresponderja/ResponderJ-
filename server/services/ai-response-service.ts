import { GoogleGenAI, Type, Schema } from "@google/genai";

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

    // Construção do contexto de negócio para a Prompt
    let businessContextStr = "";
    if (businessContext) {
        businessContextStr = `
        CONTEXTO DO NEGÓCIO:
        Nome: ${businessContext.businessName || "Empresa"}
        Tipo: ${businessContext.businessType || "Serviços"}
        Descrição: ${businessContext.description || ""}
        Diretrizes da Marca: ${businessContext.responseGuidelines || ""}
        `;
    }

    const systemInstruction = `Atua como um Gestor de Redes Sociais Sénior e Especialista em Customer Success para PMEs em Portugal ("Responder Já").
    A tua missão é escrever respostas profissionais, humanas e que convertam avaliações em fidelização.

    CONFIGURAÇÃO:
    - Plataforma: ${platform}
    - Tom de Voz Solicitado: ${tone}
    - Objetivo: ${responseType || 'Responder ao cliente'}
    ${businessContextStr}

    REGRAS DE OURO:
    1. **Idioma:** Deteta o idioma do comentário. Se for Português, responde SEMPRE em PORTUGUÊS DE PORTUGAL (PT-PT). Não uses gerúndios brasileiros (ex: "estamos fazendo" -> "estamos a fazer").
    2. **Personalização:** Nunca comeces com "Caro cliente" se o nome estiver disponível. Sê específico sobre o que o cliente mencionou.
    3. **Tom:** 
       - Se "Profissional": Usa "Você" ou impessoal. Formal mas cordial.
       - Se "Amigável": Podes usar "Tu" se o contexto permitir, emojis moderados, caloroso.
       - Se "Negativo/Reclamação": Sê empático, pede desculpa, não assumas culpa legal, leva para offline (email/telefone).
    4. **Brevidade:** Redes sociais exigem respostas diretas. Evita "palha".
    5. **Chamada para Ação:** Convida sempre a voltar ou a contactar, mas sem ser agressivo.
    6. **Autenticidade:** Evita linguagem robótica ou excessivamente corporativa.

    ${extraInstructions ? `INSTRUÇÕES ESTRITAS DA REGRA DE AUTOMAÇÃO: ${extraInstructions}` : ''}
    `;

    const prompt = `Analisa este comentário e gera a melhor resposta possível: "${comment}"`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        response: { 
          type: Type.STRING, 
          description: "O texto da resposta gerada, pronto a publicar." 
        },
        sentiment: { 
          type: Type.STRING, 
          enum: ["Positive", "Neutral", "Negative"],
          description: "Análise de sentimento do comentário original."
        },
        keywords: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "3-5 tópicos principais mencionados (ex: 'Atendimento', 'Comida')."
        },
        language: {
          type: Type.STRING,
          description: "Código do idioma detetado (pt, en, es, fr)."
        }
      },
      required: ["response", "sentiment", "keywords", "language"]
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7, // Criativo mas controlado
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      return {
        response: result.response || "Obrigado pelo seu contacto. Responderemos o mais breve possível.",
        sentiment: result.sentiment || "Neutral",
        keywords: result.keywords || [],
        detectedLanguage: { language: result.language || "pt" },
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
      };

    } catch (error) {
      console.error("AI Service Error:", error);
      // Fallback gracioso
      return {
        response: "Obrigado pelo seu feedback! A nossa equipa irá analisar o seu comentário.",
        sentiment: "Neutral",
        keywords: [],
        detectedLanguage: { language: "pt" },
        tokensUsed: 0
      };
    }
  },

  async analyzeSentiment(text: string) {
    const prompt = `Analisa o sentimento do seguinte texto (foca-te na intenção do cliente): "${text}". Retorna JSON.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentimentScore: { type: Type.NUMBER, description: "Score de -1 (muito negativo) a 1 (muito positivo)" },
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

  // Alias method for compatibility
  async detectSentiment(text: string) {
    const result = await this.analyzeSentiment(text);
    return result.sentimentLabel || "neutral";
  },

  // Method to generate multiple response variations (Para a UI de escolha)
  async generateReviewResponses(params: {
    reviewText: string;
    platform: string;
    tone: string;
    language: string;
    establishmentContext?: any;
    dynamicFields?: any;
  }) {
    const { reviewText, platform, tone, language, establishmentContext } = params;
    
    // Forçar PT-PT se a língua for português
    const languageInstruction = language.toLowerCase().includes('pt') || language.toLowerCase().includes('portugues') 
        ? "Português de Portugal (PT-PT)" 
        : language;
    
    let prompt = `Tu és o "Responder Já". Escreve 3 variações distintas de resposta profissional para esta review no ${platform}.
    Review Original: "${reviewText}"
    Tom Desejado: ${tone}
    Idioma de Saída: ${languageInstruction}
    
    Contexto do Estabelecimento: ${JSON.stringify(establishmentContext || {})}
    `;

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
                            responseType: { type: Type.STRING, enum: ["agradecimento", "desculpa", "esclarecimento", "convite", "venda"] }
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
    // 1 crédito por resposta simples
    return 1; 
  }
};