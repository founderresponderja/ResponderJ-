
import type { Express } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { db } from "../db.js";
import { desc, eq, inArray } from "drizzle-orm";
import { responses, reviews } from "@shared/schema";

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

      const reviewIds = Array.from(new Set(userResponses.map((r) => r.reviewId).filter(Boolean))) as number[];
      const linkedReviews = reviewIds.length > 0
        ? await db.select().from(reviews)
            .where(inArray(reviews.id, reviewIds))
        : [];
      const reviewsMap = new Map(linkedReviews.map((r) => [r.id, r]));

      const totalResponses = userResponses.length;
      const responded = userResponses.filter((r) => r.isPublished || r.isSelected).length;
      const pending = Math.max(0, totalResponses - responded);
      const responseRate = totalResponses > 0 ? (responded / totalResponses) * 100 : 0;

      const platformBreakdown: Record<string, number> = {};
      const ratingByPlatform: Record<string, { sum: number; count: number }> = {};
      for (const responseItem of userResponses) {
        const review = responseItem.reviewId ? reviewsMap.get(responseItem.reviewId) : undefined;
        const platform = String(review?.platform || "unknown");
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
        if (review?.rating) {
          if (!ratingByPlatform[platform]) ratingByPlatform[platform] = { sum: 0, count: 0 };
          ratingByPlatform[platform].sum += review.rating;
          ratingByPlatform[platform].count += 1;
        }
      }

      const averageRatingByPlatform = Object.fromEntries(
        Object.entries(ratingByPlatform).map(([platform, data]) => [
          platform,
          data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
        ]),
      );

      const now = Date.now();
      const averageResponseTimeHours = userResponses
        .map((responseItem) => {
          const review = responseItem.reviewId ? reviewsMap.get(responseItem.reviewId) : undefined;
          if (!review?.reviewDate) return null;
          const publishedAt = responseItem.publishedAt || responseItem.createdAt;
          if (!publishedAt) return null;
          return Math.max(0, (+new Date(publishedAt) - +new Date(review.reviewDate)) / (1000 * 60 * 60));
        })
        .filter((v): v is number => v !== null);

      const avgResponseTime = averageResponseTimeHours.length > 0
        ? Number((averageResponseTimeHours.reduce((a, b) => a + b, 0) / averageResponseTimeHours.length).toFixed(2))
        : 0;

      const weeklyActivity = Array.from({ length: 7 }).map((_, idx) => {
        const date = new Date(now - (6 - idx) * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        const dayCount = userResponses.filter((r) => {
          if (!r.createdAt) return false;
          const ts = +new Date(r.createdAt);
          return ts >= dayStart && ts < dayEnd;
        }).length;
        return { day: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][(date.getDay() + 6) % 7], responses: dayCount };
      });

      res.json({
        totalResponses,
        responded,
        pending,
        responseRate: Number(responseRate.toFixed(2)),
        averageResponseTimeHours: avgResponseTime,
        platformBreakdown,
        averageRatingByPlatform,
        weeklyActivity,
      });
    } catch (error: any) {
      console.error("Erro ao obter analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Análise detalhada de performance
  app.get("/api/analytics/performance", requireAuth, async (req: any, res: any) => {
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
  app.get("/api/analytics/engagement", requireAuth, async (req: any, res: any) => {
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