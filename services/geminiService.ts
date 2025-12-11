import { GoogleGenAI } from "@google/genai";
import { ReviewData } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateResponse = async (review: ReviewData): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key não configurada. Por favor configure a API_KEY.");
  }

  const modelId = 'gemini-2.5-flash';
  
  const prompt = `
    Você é um gerente de sucesso do cliente experiente em uma PME.
    Sua tarefa é escrever uma resposta para uma avaliação de cliente.
    
    Detalhes da Avaliação:
    - Plataforma: ${review.platform}
    - Nome do Cliente: ${review.customerName}
    - Classificação: ${review.rating}/5 estrelas
    - Texto da Avaliação: "${review.reviewText}"
    - Tom Desejado: ${review.tone}
    - Idioma da Resposta: ${review.language}

    Instruções:
    1. Agradeça o feedback (seja positivo ou negativo).
    2. Dirija-se ao cliente pelo nome, se fornecido.
    3. Responda a pontos específicos mencionados no texto da avaliação.
    4. Se a avaliação for negativa (3 estrelas ou menos), seja empático, peça desculpas sem ser defensivo e sugira uma resolução (ex: entrar em contato por email).
    5. Se a avaliação for positiva, convide-os a voltar.
    6. Mantenha a resposta concisa e profissional, mas humana.
    7. Não inclua placeholders como [Seu Nome] ou [Nome da Empresa] a menos que seja estritamente necessário, prefira assinar como "A Equipa".
    
    Gere apenas o texto da resposta.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });

    return response.text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Erro ao gerar resposta com Gemini:", error);
    throw new Error("Falha ao comunicar com a IA. Tente novamente.");
  }
};

export const analyzeSentiment = async (reviews: string[]): Promise<{ positive: number, neutral: number, negative: number }> => {
    // This function is a placeholder for a more complex bulk analysis
    // For now, we assume this logic happens elsewhere or we implement a simple version
    return { positive: 0, neutral: 0, negative: 0 };
};