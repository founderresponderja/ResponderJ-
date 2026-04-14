
import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { rateLimitMiddleware } from "../performance-optimizations";

const router = Router();
// Initialize Gemini with API Key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

// Knowledge base and persona definition for Sofia
const SOFIA_SYSTEM_INSTRUCTION = `
És a Sofia, a assistente virtual do Responder Já.
Objetivo: Ajudar PMEs a gerir reviews e usar a plataforma.

INFO PLATAFORMA:
- Trial: 7 dias grátis, 50 créditos.
- Starter (€19/mês): 200 resp, 1 local, 3 users.
- Pro (€49/mês): 1000 resp, 3 locais, users ilimitados.
- Agência (€149/mês): 5000 resp, 10 locais.
- Funcionalidades: IA Gemini 2.5, Análise Sentimento, Automação, CRM.

REGRAS:
- Sê concisa, profissional e empática (PT-PT).
- Usa emojis moderadamente (✨, 🚀).
- Para suporte humano: suporte@responderja.com.
- NÃO geras respostas para reviews aqui, ensinas a usar a ferramenta "Gerar Resposta".
- Se te perguntarem sobre preços, resume os planos acima.
`;

router.post("/chat", rateLimitMiddleware(20, 60000), async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // Prepare chat history context (limited to last 4 interactions for performance/tokens)
    let chatContext = "";
    if (history && Array.isArray(history)) {
        const recentHistory = history.slice(-4); 
        chatContext = recentHistory.map((msg: any) => 
            `${msg.role === 'user' ? 'Utilizador' : 'Sofia'}: ${msg.content}`
        ).join("\n");
    }

    const prompt = `
      ${chatContext}
      
      Utilizador: ${message}
      Sofia:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SOFIA_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 300, // Limit for quick chat responses
      }
    });

    res.json({ 
      response: response.text,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Erro na Sofia AI:", error);
    // Graceful fallback
    res.json({ 
      response: "A Sofia está a processar muitos pedidos. Por favor, tente novamente em alguns segundos. 🚦",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
