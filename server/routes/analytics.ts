
import type { Express } from "express";
import { requireAuth, requireFeature } from "../auth.js";
import { storage } from "../storage.js";
import { db } from "../db.js";
import { desc, eq, inArray } from "drizzle-orm";
import { establishments, responses, reviews } from "../../shared/schema.js";

export function registerAnalyticsRoutes(app: any) {
  const resolveUserId = (req: any) => {
    const raw = req.user?.id || req.user?.claims?.sub;
    const userId = Number(raw);
    return Number.isFinite(userId) ? userId : null;
  };

  // Dashboard analytics
  app.get("/api/analytics/dashboard", requireAuth, async (req: any, res: any) => {
    try {
      const userId = resolveUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }
      const userResponses = await db.select().from(responses)
        .where(eq(responses.userId, userId))
        .orderBy(desc(responses.createdAt))
        .limit(1000);

      const userEstablishments = await db.select({ id: establishments.id })
        .from(establishments)
        .where(eq(establishments.userId, userId));
      const establishmentIds = userEstablishments.map((item) => item.id);

      const userReviews = establishmentIds.length > 0
        ? await db.select().from(reviews).where(inArray(reviews.establishmentId, establishmentIds))
        : [];

      const totalResponses = userResponses.length;
      const totalReviewsReceived = userReviews.length;
      const pendingApprovals = userResponses.filter((item) => item.approvalStatus === "pending").length;
      const responseRate = totalReviewsReceived > 0 ? (totalResponses / totalReviewsReceived) * 100 : 0;

      const ratingByPlatform: Record<string, { sum: number; count: number }> = {};
      for (const reviewItem of userReviews) {
        const platform = String(reviewItem.platform || "unknown");
        if (!ratingByPlatform[platform]) ratingByPlatform[platform] = { sum: 0, count: 0 };
        ratingByPlatform[platform].sum += Number(reviewItem.rating || 0);
        ratingByPlatform[platform].count += reviewItem.rating ? 1 : 0;
      }

      const averageRatingByPlatform = Object.fromEntries(
        Object.entries(ratingByPlatform).map(([platform, data]) => [
          platform,
          data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
        ]),
      );

      const user = await storage.getUser(userId);

      res.json({
        totalReviewsReceived,
        totalResponsesGenerated: totalResponses,
        responseRate: Number(responseRate.toFixed(2)),
        averageRatingByPlatform,
        pendingApprovals,
        creditsRemaining: user?.credits || 0,
      });
    } catch (error: any) {
      console.error("Erro ao obter analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Análise detalhada de performance
  app.get("/api/analytics/performance", requireAuth, requireFeature("hasAdvancedAnalytics"), async (req: any, res: any) => {
    try {
      const userId = resolveUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      // Obter dados de performance
      const userResponses = await storage.getUserAiResponses(userId);
      
      // Calcular métricas de performance
      const totalResponses = userResponses.length;
      const successfulResponses = userResponses.filter((responseItem) => responseItem.isPublished || responseItem.isSelected).length;
      const avgResponseTime = 0;

      const performanceMetrics = {
        totalResponses,
        successRate: totalResponses > 0 ? (successfulResponses / totalResponses) * 100 : 0,
        averageResponseTime: avgResponseTime,
        responsesByPlatform: {
          facebook: 0,
          instagram: 0,
          google: 0,
        },
        responsesByTone: {
          professional: userResponses.filter((r) => r.tone === 'professional').length,
          friendly: userResponses.filter((r) => r.tone === 'friendly').length,
          casual: userResponses.filter((r) => r.tone === 'casual').length,
        }
      };

      res.json(performanceMetrics);
    } catch (error: any) {
      console.error("Erro ao obter métricas de performance:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Relatório de engagement
  app.get("/api/analytics/engagement", requireAuth, requireFeature("hasAdvancedAnalytics"), async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { period = 'week' } = req.query;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      // Dados de engagement simulados baseados no período
      const engagementData = {
        week: {
          likes: 1250,
          comments: 340,
          shares: 89,
          clicks: 567,
          impressions: 12500,
          engagementRate: 18.2
        },
        month: {
          likes: 4800,
          comments: 1250,
          shares: 320,
          clicks: 2100,
          impressions: 45000,
          engagementRate: 19.1
        }
      };

      res.json(engagementData[period as keyof typeof engagementData] || engagementData.week);
    } catch (error: any) {
      console.error("Erro ao obter dados de engagement:", error);
      res.status(500).json({ error: error.message });
    }
  });
}