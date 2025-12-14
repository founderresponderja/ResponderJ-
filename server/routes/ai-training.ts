import { Router } from "express";
import { requireAuth, requireAdmin } from "../auth";
import { aiTrainingService } from "../services/ai-training-service";

const router = Router();

/**
 * Executar análise completa de tipos de resposta
 * POST /api/ai-training/analyze
 */
router.post("/analyze", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { limitResponses = 100 } = req.body;

    // Verificar se o utilizador tem permissão para análise completa (plano Pro+)
    const userPlan = req.user?.selectedPlan || req.user?.subscriptionPlan || 'free';
    const canRunFullAnalysis = ['pro', 'enterprise', 'agency'].includes(userPlan) || req.user?.isAdmin;
    
    if (!canRunFullAnalysis) {
      return res.status(403).json({
        success: false,
        message: "Análise completa disponível apenas nos planos Pro e superiores",
        code: "UPGRADE_REQUIRED"
      });
    }

    console.log(`🔍 User ${userId} (${userPlan}) iniciou análise de IA com limite de ${limitResponses} respostas`);

    // Executar análise completa
    const analysis = await aiTrainingService.performCompleteAnalysis(limitResponses);

    res.json({
      success: true,
      message: "Análise de IA concluída com sucesso",
      data: {
        analysis,
        summary: {
          responseTypesIdentified: analysis.responseTypes.length,
          totalExamplesGenerated: Object.values(analysis.testExamples)
            .reduce((total: number, examples: any) => total + examples.length, 0),
          totalResponsesAnalyzed: analysis.totalAnalyzed,
          analysisDate: analysis.analysisDate
        }
      }
    });

  } catch (error) {
    console.error("Erro na análise de IA:", error);
    res.status(500).json({ 
      message: "Erro interno na análise de IA",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Obter apenas os tipos de resposta identificados (sem re-análise)
 * GET /api/ai-training/response-types
 */
router.get("/response-types", requireAuth, async (req: any, res) => {
  try {
    // Esta rota retorna os tipos padrão ou pode ser expandida para buscar tipos salvos
    const defaultPatterns = await aiTrainingService.performCompleteAnalysis(50);
    
    res.json({
      success: true,
      data: {
        responseTypes: defaultPatterns.responseTypes,
        lastAnalysis: defaultPatterns.analysisDate
      }
    });

  } catch (error) {
    console.error("Erro ao obter tipos de resposta:", error);
    res.status(500).json({ 
      message: "Erro ao obter tipos de resposta",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Gerar exemplos para um tipo específico de resposta
 * POST /api/ai-training/generate-examples
 */
router.post("/generate-examples", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { responseType, count = 5 } = req.body;
    const userPlan = req.user?.selectedPlan || req.user?.subscriptionPlan || 'free';

    // Verificar se o utilizador pode gerar exemplos (planos pagos)
    if (['trial', 'free'].includes(userPlan) && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Geração de exemplos disponível apenas nos planos pagos",
        code: "UPGRADE_REQUIRED"
      });
    }

    if (!responseType) {
      return res.status(400).json({ 
        message: "Tipo de resposta é obrigatório" 
      });
    }

    console.log(`📝 User ${userId} (${userPlan}) generating ${count} examples for response type: ${responseType}`);

    // Criar um padrão básico para gerar exemplos
    const pattern = {
      type: responseType,
      description: `Exemplos para tipo: ${responseType}`,
      characteristics: ["Resposta apropriada", "Tom adequado", "Contextualizada"],
      platforms: ["google_maps", "facebook", "booking"],
      tones: ["profissional", "amigável"],
      examples: []
    };

    // Gerar exemplos usando o serviço
    const examples = await aiTrainingService.generateTestExamples([pattern]);

    res.json({
      success: true,
      message: `${count} exemplos gerados para o tipo: ${responseType}`,
      data: {
        responseType,
        examples: examples[responseType] || [],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Erro na geração de exemplos:", error);
    res.status(500).json({ 
      message: "Erro na geração de exemplos",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Análise rápida dos padrões históricos (versão simplificada)
 * GET /api/ai-training/quick-analysis
 */
router.get("/quick-analysis", requireAuth, async (req: any, res) => {
  try {
    // Análise mais rápida com menos dados
    const quickAnalysis = await aiTrainingService.analyzeHistoricalResponses(25);
    
    res.json({
      success: true,
      message: "Análise rápida concluída",
      data: {
        responseTypes: quickAnalysis,
        totalAnalyzed: 25,
        analysisType: "quick",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Erro na análise rápida:", error);
    res.status(500).json({ 
      message: "Erro na análise rápida",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Status do sistema de treino de IA
 * GET /api/ai-training/status
 */
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    // Verificar se OpenAI está configurada
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    res.json({
      success: true,
      data: {
        aiConfigured: hasOpenAI,
        features: {
          patternAnalysis: hasOpenAI,
          exampleGeneration: hasOpenAI,
          historicalAnalysis: hasOpenAI
        },
        status: hasOpenAI ? "operational" : "configuration_required",
        message: hasOpenAI 
          ? "Sistema de treino de IA operacional" 
          : "OpenAI API Key não configurada"
      }
    });

  } catch (error) {
    console.error("Erro ao verificar status:", error);
    res.status(500).json({ 
      message: "Erro ao verificar status do sistema",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

export default router;
