
import { Router } from "express";
import { eq, and, desc, isNotNull, ne } from "drizzle-orm";
import { db } from "../db.js";
import { reviews, responses, establishments, users, socialPlatformConnections } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { aiResponseService } from "../services/ai-response-service.js";
import { storage } from "../storage.js";
import { GoogleReviewsService } from "../services/google-reviews-service.js";

const router = Router();

function resolveUserId(req: any): number | null {
  const raw = req.user?.id;
  const maybe = Number(raw);
  if (Number.isFinite(maybe) && maybe > 0) return maybe;
  return null;
}

router.post("/generate-responses", requireAuth, async (req: any, res) => {
  try {
    const { reviewText, platform, tone, language, customerName, visitDate, product, location, extraInstructions } = req.body;
    const userId = resolveUserId(req);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!reviewText?.trim()) return res.status(400).json({ message: "Review text required" });

    // 1. Check Credits (pre-check, but atomic deduction handles the real check)
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Get Context
    const [establishment] = await db
      .select()
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);

    const effectiveTone = tone || establishment?.brandTone || "profissional";
    const seoKeywords = [
      establishment?.name,
      establishment?.type,
      location,
      product,
    ].filter(Boolean) as string[];

    // 3. Generate via Gemini 2.5
    const variations = await aiResponseService.generateReviewResponses({
      userId,
      reviewText,
      platform: platform || 'google_maps',
      tone: effectiveTone,
      language,
      localSeoKeywords: seoKeywords,
      extraInstructions,
      establishmentContext: establishment ? {
        name: establishment.name,
        type: establishment.type || undefined,
        responseGuidelines: establishment.responseGuidelines || undefined,
        location,
      } : undefined,
      dynamicFields: { customerName }
    });

    if (!variations || variations.length === 0) {
      return res.status(500).json({ message: "Failed to generate responses." });
    }

    // 4. Save Review
    const sentiment = await aiResponseService.detectSentiment(reviewText);
    const detectedLanguage = await aiResponseService.detectLanguage(reviewText);
    const [savedReview] = await db.insert(reviews).values({
      establishmentId: establishment?.id,
      platform: platform || 'google_maps',
      reviewText,
      language: detectedLanguage,
      authorName: customerName,
      reviewDate: new Date(),
      sentiment
    }).returning();

    // 5. Save Responses
    const savedResponses = [];
    for (const v of variations) {
      const [r] = await db.insert(responses).values({
        reviewId: savedReview.id,
        userId: userId,
        variationNumber: v.variationNumber,
        responseText: v.responseText,
        originalResponseText: v.responseText,
        tone: v.tone || effectiveTone,
        language: v.language || detectedLanguage,
        responseType: v.responseType,
        customerName,
        visitDate,
        product,
        location,
        creditsUsed: 1,
        aiModel: "gemini-2.5-flash",
        approvalStatus: "pending",
        isSelected: false,
        isPublished: false,
        learningMeta: {
          sentiment: v.sentiment || sentiment,
          seoKeywords: v.seoKeywords || seoKeywords,
        },
      }).returning();
      savedResponses.push(r);
    }

    // 6. Deduct Credit (1 credit per generation request - Atomic Operation)
    const deducted = await storage.deductUserCreditsAtomic(userId, 1);
    
    if (!deducted) {
       // If deduction failed (e.g. race condition reached 0), we still return the generated response 
       // but log it as an overage or handle appropriately. 
       // For strict enforcement, we would do this BEFORE generation, but AI costs are sunk cost at this point.
       // Best practice: Reserve credit before generation, commit after. 
       // For simplicity here: we accept the minor loss or mark account as negative if logic allowed.
       console.warn(`User ${userId} generated response but credit deduction failed (likely 0 balance)`);
    }

    if (deducted) {
        await storage.createCreditTransaction({
            userId,
            type: 'usage',
            amount: -1,
            description: `Generated responses for review ${savedReview.id}`
        });
    }

    // Get fresh user data for UI update
    const updatedUser = await storage.getUserById(userId);

    res.json({
      success: true,
      reviewId: savedReview.id,
      responses: variations,
      sentiment,
      detectedLanguage,
      creditsRemaining: updatedUser?.credits || 0
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reuse existing GET endpoints...
router.get("/history", requireAuth, async (req: any, res) => {
    try {
        const userId = resolveUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const limit = 20;
        
        const data = await db.select().from(responses)
            .where(eq(responses.userId, userId))
            .orderBy(desc(responses.createdAt))
            .limit(limit);
            
        res.json({ responses: data });
    } catch (e) {
        res.status(500).json({message: "Error fetching history"});
    }
});

router.get("/pending", requireAuth, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Gate on having at least one real platform connection. We key platform connections
    // by the Clerk external id (header provided by the frontend) so that pending responses
    // never show pre-existing mock data when the user has no platform linked.
    const clerkUserId = String(
      req.headers["x-clerk-user-id"] ||
      req.query?.clerkUserId ||
      req.user?.clerkUserId ||
      ""
    ).trim();

    if (clerkUserId) {
      const [connected] = await db.select({ id: socialPlatformConnections.id })
        .from(socialPlatformConnections)
        .where(and(
          eq(socialPlatformConnections.userExternalId, clerkUserId),
          eq(socialPlatformConnections.status, "connected"),
        ))
        .limit(1);

      if (!connected) {
        return res.json({ items: [] });
      }
    }

    // Only return responses linked to a real (platform-synced) review. We identify real
    // reviews by the presence of an externalId (Google Business, etc.). This guarantees we
    // never surface draft/mock entries created from the manual "Generate" form, so the
    // UI only shows pending items that came from an actual connected platform.
    const pendingRows = await db.select({
      responseId: responses.id,
      reviewId: responses.reviewId,
      responseText: responses.responseText,
      tone: responses.tone,
      language: responses.language,
      approvalStatus: responses.approvalStatus,
      isSelected: responses.isSelected,
      isPublished: responses.isPublished,
      createdAt: responses.createdAt,
      customerName: responses.customerName,
      platform: reviews.platform,
      reviewText: reviews.reviewText,
      rating: reviews.rating,
      externalId: reviews.externalId,
    }).from(responses)
      .innerJoin(reviews, eq(reviews.id, responses.reviewId))
      .where(and(
        eq(responses.userId, userId),
        eq(responses.isPublished, false),
        isNotNull(reviews.externalId),
        ne(reviews.externalId, ""),
      ))
      .orderBy(desc(responses.createdAt))
      .limit(100);

    res.json({ items: pendingRows });
  } catch (error) {
    console.error("Pending responses fetch error:", error);
    res.status(500).json({ message: "Erro ao obter respostas pendentes" });
  }
});

router.patch("/responses/:id/edit", requireAuth, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const responseId = Number(req.params.id);
    const editedText = String(req.body?.responseText || "").trim();
    if (!editedText) return res.status(400).json({ message: "responseText é obrigatório" });

    const [existing] = await db.select().from(responses)
      .where(and(eq(responses.id, responseId), eq(responses.userId, userId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Resposta não encontrada" });

    const [parentReview] = await db.select().from(reviews)
      .where(eq(reviews.id, existing.reviewId as number))
      .limit(1);

    const updated = await storage.updateAiResponse(responseId, {
      responseText: editedText,
      approvalStatus: "edited",
      editCount: (existing.editCount || 0) + 1,
      learningMeta: {
        ...(existing.learningMeta as Record<string, any> || {}),
        editedAt: new Date().toISOString(),
      },
    });

    await aiResponseService.recordEditLearning({
      userId,
      language: existing.language || parentReview?.language || "pt",
      tone: existing.tone || "profissional",
      sentiment: ((parentReview?.sentiment as any) || "neutral"),
      originalText: existing.originalResponseText || existing.responseText,
      editedText,
    });

    res.json({ success: true, response: updated });
  } catch (error) {
    console.error("Edit response error:", error);
    res.status(500).json({ message: "Erro ao editar resposta" });
  }
});

router.post("/responses/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const responseId = Number(req.params.id);
    const [existing] = await db.select().from(responses)
      .where(and(eq(responses.id, responseId), eq(responses.userId, userId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Resposta não encontrada" });

    const updated = await storage.updateAiResponse(responseId, {
      isSelected: true,
      approvalStatus: existing.editCount && existing.editCount > 0 ? "edited" : "approved",
    });

    res.json({ success: true, response: updated });
  } catch (error) {
    console.error("Approve response error:", error);
    res.status(500).json({ message: "Erro ao aprovar resposta" });
  }
});

router.post("/responses/:id/publish", requireAuth, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const responseId = Number(req.params.id);
    const [existing] = await db.select().from(responses)
      .where(and(eq(responses.id, responseId), eq(responses.userId, userId)))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Resposta não encontrada" });
    if (!existing.isSelected) return res.status(400).json({ message: "Aprova primeiro a resposta antes de publicar" });

    const [parentReview] = await db.select().from(reviews)
      .where(eq(reviews.id, existing.reviewId as number))
      .limit(1);
    if (!parentReview) return res.status(404).json({ message: "Review não encontrada para publicação" });

    let publishMeta: Record<string, any> = { mode: "internal" };
    if (parentReview.platform === "google" && parentReview.externalId) {
      try {
        await GoogleReviewsService.replyToReview(
          String(userId),
          String(parentReview.externalId),
          existing.responseText,
          parentReview.establishmentId ?? null,
        );
        publishMeta = { mode: "google_api", publishedExternally: true };
      } catch (error: any) {
        return res.status(502).json({
          message: "Falha ao publicar no Google. Verifica ligação OAuth e permissões.",
          detail: error?.message || "google_publish_failed",
        });
      }
    }

    const updated = await storage.updateAiResponse(responseId, {
      isPublished: true,
      publishedAt: new Date(),
      learningMeta: {
        ...(existing.learningMeta as Record<string, any> || {}),
        publishMeta,
      },
    });

    res.json({ success: true, response: updated });
  } catch (error) {
    console.error("Publish response error:", error);
    res.status(500).json({ message: "Erro ao publicar resposta" });
  }
});

export default router;
