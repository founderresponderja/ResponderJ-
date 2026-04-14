
import { Router } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { GoogleReviewsService } from "../services/google-reviews-service.js";

const router = Router();

// Listar reviews (Híbrido: Base de dados local + Live Fetch se solicitado)
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const refresh = req.query.refresh === 'true';

    // 1. Obter histórico local de gerações
    const localResponses = await storage.getUserAiResponses(userId, limit);

    // 2. Se solicitado refresh, tentar buscar reviews reais das contas conectadas
    let liveReviews: any[] = [];
    if (refresh) {
      // Buscar contas Google conectadas do utilizador
      // (Assumindo que o user tem permissão para ver as contas corporativas ou tem as suas próprias linkadas)
      // Para simplificar, vamos buscar as contas sociais guardadas
      const accounts = await storage.getCorporateSocialAccounts(); 
      const googleAccount = accounts.find(a => a.platform === 'google' || a.platform === 'google_business');

      if (googleAccount) {
        try {
          const externalData = await GoogleReviewsService.fetchReviews(userId.toString(), googleAccount.id);
          // Mapear para o formato ReviewData
          liveReviews = externalData.map(r => ({
            id: r.reviewId,
            platform: 'Google Maps',
            customerName: r.reviewer.displayName,
            rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : 3, // Simplificado
            reviewText: r.comment,
            tone: 'Neutro', // Default
            language: 'Português',
            generatedResponse: r.reviewReply ? r.reviewReply.comment : null,
            createdAt: r.createTime,
            isFavorite: false,
            responseType: r.reviewReply ? 'published' : 'pending'
          }));
        } catch (err) {
          console.warn("Falha ao buscar live reviews:", err);
        }
      }
    }

    // Combinar dados (priorizando live reviews se existirem, ou apenas retornando o histórico de gerações)
    // Na prática, a UI deve decidir como mostrar, aqui retornamos o histórico de gerações primariamente
    // mas se houver liveReviews, poderíamos fundir. Para manter a UI atual a funcionar:
    
    // Se tivermos live reviews, retornamos essas formatadas, senão o histórico local
    const finalResponse = liveReviews.length > 0 ? [...liveReviews, ...localResponses] : localResponses;
    
    // Ordenar por data
    finalResponse.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(finalResponse.slice(0, limit));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Update a response (e.g. edited text)
router.patch("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { responseText, isFavorite, status } = req.body;
    
    // Se o status for "published" e tivermos o ID da review original, tentar publicar
    // Logica futura: Se id for um ID externo do Google, chamar GoogleReviewsService.replyToReview
    
    const updated = await storage.updateAiResponse(id, {
      responseText,
      isFavorite,
      // @ts-ignore
      isPublished: status === 'published'
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Error updating review" });
  }
});

export default router;
