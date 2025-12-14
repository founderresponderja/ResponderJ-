
import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { reviews, responses, establishments, users } from "@shared/schema";
import { requireAuth } from "../auth";
import { aiResponseService as reviewsAIService } from "../services/ai-response-service";

const router = Router();

// Gerar 3 variações de resposta para uma review
router.post("/generate-responses", requireAuth, async (req: any, res) => {
  try {
    const { reviewText, platform, tone, language, customerName, visitDate, product, location } = req.body;
    const userId = req.user?.claims?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Utilizador não autenticado" });
    }

    // Validar input obrigatório
    if (!reviewText?.trim()) {
      return res.status(400).json({ message: "Texto da review é obrigatório" });
    }

    if (!["google_maps", "booking", "airbnb", "thefork", "facebook"].includes(platform)) {
      return res.status(400).json({ message: "Plataforma inválida" });
    }

    // Verificar créditos do utilizador
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    if (user.credits <= 0) {
      return res.status(402).json({ 
        message: "Créditos insuficientes",
        credits: user.credits 
      });
    }

    // Buscar estabelecimento do utilizador (V0: apenas 1)
    const [establishment] = await db
      .select()
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);

    // Preparar contexto do estabelecimento
    const establishmentContext = establishment ? {
      name: establishment.name,
      type: establishment.type,
      brandTone: establishment.brandTone,
      responseGuidelines: establishment.responseGuidelines,
      forbiddenPhrases: establishment.forbiddenPhrases ? JSON.parse(establishment.forbiddenPhrases) : []
    } : undefined;

    // Preparar campos dinâmicos
    const dynamicFields = {
      customerName,
      visitDate,
      product,
      location
    };

    // Gerar respostas com IA
    const generatedResponses = await reviewsAIService.generateReviewResponses({
      reviewText,
      platform,
      tone: tone || "profissional",
      language: language || "pt",
      establishmentContext,
      dynamicFields
    });

    if (generatedResponses.length === 0) {
      return res.status(500).json({ message: "Falha na geração de respostas" });
    }

    // Salvar review na base de dados
    const [savedReview] = await db.insert(reviews).values({
      establishmentId: establishment?.id,
      platform,
      reviewText,
      language: language || "pt",
      sentiment: await reviewsAIService.detectSentiment(reviewText)
    }).returning();

    // Salvar as 3 respostas geradas
    const savedResponses = [];
    for (const response of generatedResponses) {
      const [savedResponse] = await db.insert(responses).values({
        reviewId: savedReview.id,
        userId,
        variationNumber: response.variationNumber,
        responseText: response.responseText,
        tone: response.tone,
        language: response.language,
        responseType: response.responseType,
        customerName,
        visitDate,
        product,
        location,
        creditsUsed: 1, // V0: 1 crédito por geração de 3 variações
        aiModel: "gemini-2.5-flash"
      }).returning();
      
      savedResponses.push(savedResponse);
    }

    // Debitar 1 crédito (para as 3 variações)
    await db
      .update(users)
      .set({ 
        credits: user.credits - 1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      reviewId: savedReview.id,
      responses: generatedResponses,
      creditsRemaining: user.credits - 1,
      message: "3 variações geradas com sucesso!"
    });

  } catch (error) {
    console.error("Erro na geração de respostas:", error);
    res.status(500).json({ 
      message: "Erro interno do servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// Buscar histórico de reviews e respostas do utilizador
router.get("/history", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const reviewsWithResponses = await db
      .select({
        review: reviews,
        responses: responses,
        establishment: establishments
      })
      .from(reviews)
      .leftJoin(responses, eq(reviews.id, responses.reviewId))
      .leftJoin(establishments, eq(reviews.establishmentId, establishments.id))
      .where(eq(responses.userId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Agrupar por review
    const groupedReviews = reviewsWithResponses.reduce((acc, row) => {
      const reviewId = row.review.id;
      if (!acc[reviewId]) {
        acc[reviewId] = {
          ...row.review,
          establishment: row.establishment,
          responses: []
        };
      }
      if (row.responses) {
        acc[reviewId].responses.push(row.responses);
      }
      return acc;
    }, {} as any);

    res.json({
      reviews: Object.values(groupedReviews),
      pagination: {
        page,
        limit,
        total: Object.keys(groupedReviews).length
      }
    });

  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Marcar resposta como selecionada/publicada
router.patch("/responses/:responseId/select", requireAuth, async (req: any, res) => {
  try {
    const { responseId } = req.params;
    const { isSelected, isPublished } = req.body;
    const userId = req.user?.claims?.sub || req.user?.id;

    // Verificar se a resposta pertence ao utilizador
    const [response] = await db
      .select()
      .from(responses)
      .where(and(eq(responses.id, responseId), eq(responses.userId, userId)));

    if (!response) {
      return res.status(404).json({ message: "Resposta não encontrada" });
    }

    // Atualizar estado
    const [updatedResponse] = await db
      .update(responses)
      .set({ 
        isSelected: isSelected ?? response.isSelected,
        isPublished: isPublished ?? response.isPublished,
        publishedAt: isPublished ? new Date() : response.publishedAt
      })
      .where(eq(responses.id, responseId))
      .returning();

    res.json({
      success: true,
      response: updatedResponse,
      message: "Estado da resposta atualizado"
    });

  } catch (error) {
    console.error("Erro ao atualizar resposta:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
