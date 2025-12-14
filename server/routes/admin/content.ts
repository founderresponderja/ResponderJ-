
import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";

// Note: requireAuth will be handled by the main routes.ts file

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Mock data para demonstração - seria substituído por dados reais de uma base de dados
const mockPages = [
  {
    id: "landing",
    pageName: "Página Inicial",
    route: "/",
    title: "Responder Já - Plataforma de Comunicação Empresarial",
    description: "Utilize IA para gerar respostas inteligentes para as redes sociais",
    content: {
      heroTitle: "Transforme a Comunicação do Seu Negócio",
      heroSubtitle: "Gere respostas inteligentes com IA para Google Reviews e redes sociais",
      heroButton: "Comece Gratuitamente",
      featuresTitle: "Funcionalidades Principais",
      feature1Title: "Detecção Automática de Idioma",
      feature1Description: "A IA detecta o idioma do comentário e responde na mesma língua",
      feature2Title: "Múltiplas Plataformas",
      feature2Description: "Suporte para Google, Facebook, Instagram e mais",
      feature3Title: "Tom Personalizado",
      feature3Description: "Ajuste o tom das respostas ao perfil da sua empresa"
    },
    lastModified: new Date().toISOString(),
    status: "active"
  },
  {
    id: "generate",
    pageName: "Gerar Resposta",
    route: "/generate",
    title: "Gerar Resposta Inteligente",
    description: "Crie respostas personalizadas para comentários e avaliações",
    content: {
      pageTitle: "Gerar Resposta",
      pageSubtitle: "Crie respostas inteligentes com IA para a comunicação empresarial",
      formTitle: "Gerador de Respostas",
      platformLabel: "Plataforma",
      messageLabel: "Mensagem/Avaliação Original",
      messagePlaceholder: "Cole a mensagem ou avaliação à qual pretende responder...",
      toneLabel: "Tom da Resposta",
      generateButton: "Gerar Resposta",
      copyButton: "Copiar Resposta",
      creditsInfo: "Esta geração utilizará créditos do seu saldo",
      languageDetectionTitle: "Detecção Automática de Idioma",
      languageDetectionDescription: "O sistema detecta automaticamente o idioma do comentário e responde na mesma língua"
    },
    lastModified: new Date().toISOString(),
    status: "active"
  },
  {
    id: "admin",
    pageName: "Painel Administrativo",
    route: "/admin",
    title: "Painel de Administração",
    description: "Gestão completa da plataforma",
    content: {
      dashboardTitle: "Painel de Administração",
      usersTitle: "Gestão de Utilizadores",
      analyticsTitle: "Análises e Relatórios",
      bankingTitle: "Gestão Bancária",
      contentTitle: "Gestão de Conteúdo",
      settingsTitle: "Configurações do Sistema"
    },
    lastModified: new Date().toISOString(),
    status: "active"
  }
];

let mockTextErrors: any[] = [];

// Obter todas as páginas
router.get('/pages', async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockPages
    });
  } catch (error) {
    console.error("Erro ao obter páginas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Obter uma página específica
router.get('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = mockPages.find(p => p.id === id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Página não encontrada"
      });
    }
    
    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error("Erro ao obter página:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Actualizar conteúdo de uma página
router.put('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;
    
    const pageIndex = mockPages.findIndex(p => p.id === id);
    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Página não encontrada"
      });
    }
    
    // Actualizar o campo específico
    if (field in mockPages[pageIndex].content) {
      (mockPages[pageIndex].content as any)[field] = value;
      mockPages[pageIndex].lastModified = new Date().toISOString();
    } else if (field === 'title' || field === 'description') {
      (mockPages[pageIndex] as any)[field] = value;
      mockPages[pageIndex].lastModified = new Date().toISOString();
    }
    
    res.json({
      success: true,
      data: mockPages[pageIndex],
      message: "Conteúdo actualizado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao actualizar página:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Obter erros de texto
router.get('/text-errors', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    
    const filteredErrors = mockTextErrors.filter(error => 
      status === 'all' || error.status === status
    );
    
    res.json({
      success: true,
      data: filteredErrors
    });
  } catch (error) {
    console.error("Erro ao obter erros de texto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Corrigir um erro de texto
router.patch('/text-errors/:id/fix', async (req, res) => {
  try {
    const { id } = req.params;
    
    const errorIndex = mockTextErrors.findIndex(e => e.id === id);
    if (errorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Erro não encontrado"
      });
    }
    
    // Marcar erro como corrigido
    mockTextErrors[errorIndex].status = "fixed";
    
    // Aplicar a correcção na página correspondente
    const error = mockTextErrors[errorIndex];
    const affectedPage = mockPages.find(p => p.pageName === error.page);
    
    if (affectedPage) {
      // Encontrar e actualizar o texto no conteúdo da página
      Object.keys(affectedPage.content).forEach(key => {
        if ((affectedPage.content as any)[key] === error.currentText) {
          (affectedPage.content as any)[key] = error.suggestedText;
          affectedPage.lastModified = new Date().toISOString();
        }
      });
    }
    
    res.json({
      success: true,
      message: "Erro corrigido com sucesso",
      data: mockTextErrors[errorIndex]
    });
  } catch (error) {
    console.error("Erro ao corrigir texto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Ignorar um erro de texto
router.patch('/text-errors/:id/ignore', async (req, res) => {
  try {
    const { id } = req.params;
    
    const errorIndex = mockTextErrors.findIndex(e => e.id === id);
    if (errorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Erro não encontrado"
      });
    }
    
    mockTextErrors[errorIndex].status = "ignored";
    
    res.json({
      success: true,
      message: "Erro ignorado com sucesso",
      data: mockTextErrors[errorIndex]
    });
  } catch (error) {
    console.error("Erro ao ignorar erro de texto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Executar verificação de texto com Gemini
router.post('/text-check', async (req, res) => {
  try {
    // Recolher todo o texto de todas as páginas
    const allContent: {page: string, key: string, text: string}[] = [];
    
    mockPages.forEach(page => {
      Object.entries(page.content).forEach(([key, text]) => {
        allContent.push({
          page: page.pageName,
          key,
          text: text as string
        });
      });
    });

    // Dividir em chunks para não exceder limites de contexto, se necessário
    // Para este exemplo, enviaremos os primeiros 20 textos
    const textToAnalyze = allContent.slice(0, 20);
    
    const prompt = `
      You are an expert copywriter and editor for a Portuguese SaaS platform called "Responder Já".
      Analyze the following texts from the application UI.
      Identify spelling errors, grammar issues, inconsistencies, or style improvements.
      The language is European Portuguese (pt-PT).
      
      Return a JSON object with an array 'errors'. Each error should have:
      - originalText: the exact text containing the issue
      - suggestedText: the improved version
      - errorType: one of ["spelling", "grammar", "consistency", "style"]
      - severity: one of ["low", "medium", "high"]
      - location: a descriptive string (e.g. "Page Name - Key")
      
      Texts to analyze:
      ${JSON.stringify(textToAnalyze.map(t => ({ id: `${t.page} - ${t.key}`, text: t.text })))}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalText: { type: Type.STRING },
                  suggestedText: { type: Type.STRING },
                  errorType: { type: Type.STRING, enum: ["spelling", "grammar", "consistency", "style"] },
                  severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                  location: { type: Type.STRING }
                },
                required: ["originalText", "suggestedText", "errorType", "severity", "location"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{ \"errors\": [] }");
    const aiErrors = result.errors || [];

    const newErrors = aiErrors.map((err: any) => {
      // Find which page this text belongs to
      const locationParts = err.location.split(' - ');
      const pageName = locationParts[0];
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        page: pageName || "Desconhecida",
        location: err.location,
        currentText: err.originalText,
        suggestedText: err.suggestedText,
        errorType: err.errorType,
        severity: err.severity,
        status: "pending",
        detectedAt: new Date().toISOString()
      };
    });
    
    // Adicionar novos erros à lista (limpando anteriores para evitar duplicados nesta demo)
    mockTextErrors = newErrors;
    
    res.json({
      success: true,
      message: `Verificação concluída. ${newErrors.length} problemas detectados pela IA.`,
      data: {
        newErrors: newErrors.length,
        totalPending: newErrors.length
      }
    });
  } catch (error) {
    console.error("Erro na verificação de texto:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor durante análise de IA"
    });
  }
});

export default router;
