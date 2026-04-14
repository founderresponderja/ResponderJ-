
/**
 * 🎯 SERVIÇO DE FEEDBACK DE QUALIDADE
 * Sistema para avaliar e melhorar respostas IA
 */

import { storage } from '../storage.js';
import { wsNotificationService } from './websocket-notification-service.js';

interface QualityFeedbackRequest {
  responseId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5; // Estrelas
  sentiment: 'positive' | 'neutral' | 'negative';
  categories: string[]; // accuracy, tone, relevance, etc.
  improvements: string[];
  comment?: string;
  isUseful: boolean;
  platform: string;
  responseTime: number; // em milissegundos
}

interface QualityMetrics {
  averageRating: number;
  totalFeedback: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categoryScores: Record<string, number>;
  improvementSuggestions: Array<{
    suggestion: string;
    frequency: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  platformPerformance: Record<string, {
    averageRating: number;
    responseTime: number;
    accuracy: number;
  }>;
}

export class QualityFeedbackService {
  /**
   * 📝 Submeter feedback de qualidade
   */
  static async submitFeedback(feedback: QualityFeedbackRequest): Promise<void> {
    try {
      // Guardar feedback na base de dados
      // Nota: Convertemos string IDs para números se a base de dados usar inteiros
      const userId = parseInt(feedback.userId) || 0;
      const responseId = parseInt(feedback.responseId) || 0;

      await storage.createQualityFeedback({
        responseId: responseId,
        userId: userId,
        rating: feedback.rating,
        sentiment: feedback.sentiment,
        categories: JSON.stringify(feedback.categories),
        improvements: JSON.stringify(feedback.improvements),
        comment: feedback.comment,
        isUseful: feedback.isUseful,
        platform: feedback.platform,
        responseTime: feedback.responseTime
      });

      // Notificar utilizador via WebSocket
      await wsNotificationService.sendToClient(feedback.userId, {
        type: 'system',
        title: 'Feedback Recebido',
        message: 'Obrigado pelo seu feedback! Ajuda-nos a melhorar.',
        priority: 'low'
      });

      // Se rating muito baixo, alertar admin
      if (feedback.rating <= 2) {
        await this.alertLowQualityResponse(feedback);
      }

      console.log(`✅ Feedback submetido para resposta ${feedback.responseId}`);
    } catch (error) {
      console.error('❌ Erro ao submeter feedback:', error);
      throw error;
    }
  }

  /**
   * 📊 Obter métricas de qualidade
   */
  static async getQualityMetrics(userId?: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<QualityMetrics> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const feedbacks = await storage.getQualityFeedback(userId, since);

      if (!feedbacks.length) {
        return this.getEmptyMetrics();
      }

      // Calcular métricas
      const totalFeedback = feedbacks.length;
      const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

      // Breakdown de sentimentos
      const sentimentBreakdown = feedbacks.reduce((acc, f) => {
        // Assume sentiment values match keys
        const sentiment = f.sentiment as 'positive' | 'neutral' | 'negative';
        if (acc[sentiment] !== undefined) {
           acc[sentiment]++;
        }
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 });

      // Scores por categoria
      const categoryScores: Record<string, number> = {};
      feedbacks.forEach(f => {
        try {
          const categories = JSON.parse(f.categories || '[]');
          categories.forEach((category: string) => {
            if (!categoryScores[category]) categoryScores[category] = 0;
            categoryScores[category] += f.rating;
          });
        } catch (e) {}
      });

      // Normalizar scores
      Object.keys(categoryScores).forEach(category => {
        const count = feedbacks.filter(f => {
            try {
                return JSON.parse(f.categories || '[]').includes(category);
            } catch { return false; }
        }).length;
        if (count > 0) {
            categoryScores[category] = categoryScores[category] / count;
        }
      });

      // Sugestões de melhoria
      const improvementMap: Record<string, number> = {};
      feedbacks.forEach(f => {
        try {
            const improvements = JSON.parse(f.improvements || '[]');
            improvements.forEach((improvement: string) => {
              improvementMap[improvement] = (improvementMap[improvement] || 0) + 1;
            });
        } catch (e) {}
      });

      const improvementSuggestions = Object.entries(improvementMap)
        .map(([suggestion, frequency]) => ({
          suggestion,
          frequency,
          priority: (frequency >= totalFeedback * 0.3 ? 'high' : 
                   frequency >= totalFeedback * 0.1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        }))
        .sort((a, b) => b.frequency - a.frequency);

      // Performance por plataforma
      const platformPerformance: Record<string, any> = {};
      const platforms = [...new Set(feedbacks.map(f => f.platform).filter(p => p !== null))];

      platforms.forEach(platform => {
        if (!platform) return;
        const platformFeedbacks = feedbacks.filter(f => f.platform === platform);
        const avgRating = platformFeedbacks.reduce((sum, f) => sum + f.rating, 0) / platformFeedbacks.length;
        const avgResponseTime = platformFeedbacks.reduce((sum, f) => sum + (f.responseTime || 0), 0) / platformFeedbacks.length;
        const accuracy = (platformFeedbacks.filter(f => f.isUseful).length / platformFeedbacks.length) * 100;

        platformPerformance[platform] = {
          averageRating: avgRating,
          responseTime: avgResponseTime,
          accuracy: accuracy
        };
      });

      return {
        averageRating,
        totalFeedback,
        sentimentBreakdown,
        categoryScores,
        improvementSuggestions,
        platformPerformance
      };

    } catch (error) {
      console.error('❌ Erro ao obter métricas de qualidade:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * 🚨 Alertar sobre resposta de baixa qualidade
   */
  private static async alertLowQualityResponse(feedback: QualityFeedbackRequest): Promise<void> {
    try {
      // Obter admins
      const admins = await storage.getAdminUsers();
      
      // Notificar cada admin
      for (const admin of admins) {
        await wsNotificationService.sendToClient(String(admin.id), {
          type: 'alert',
          title: 'Resposta de Baixa Qualidade',
          message: `Resposta recebeu rating ${feedback.rating}/5 na plataforma ${feedback.platform}`,
          priority: 'high',
          actionUrl: `/admin/quality-reports`,
          metadata: {
            responseId: feedback.responseId,
            rating: feedback.rating,
            platform: feedback.platform
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao alertar sobre baixa qualidade:', error);
    }
  }

  /**
   * 📈 Obter tendências de qualidade
   */
  static async getQualityTrends(userId?: string): Promise<{
    weeklyTrend: Array<{week: string; averageRating: number; totalFeedback: number}>;
    monthlyImprovement: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const feedbacks = await storage.getQualityFeedback(userId, thirtyDaysAgo);

      // Trend semanal
      const weeklyTrend = this.calculateWeeklyTrend(feedbacks);

      // Melhoria mensal
      const monthlyImprovement = this.calculateMonthlyImprovement(weeklyTrend);

      // Distribuição de ratings
      const ratingDistribution = feedbacks.reduce((acc, f) => {
        acc[f.rating] = (acc[f.rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return {
        weeklyTrend,
        monthlyImprovement,
        ratingDistribution
      };

    } catch (error) {
      console.error('❌ Erro ao obter tendências:', error);
      return {
        weeklyTrend: [],
        monthlyImprovement: 0,
        ratingDistribution: {}
      };
    }
  }

  /**
   * 🎯 Gerar relatório de qualidade
   */
  static async generateQualityReport(userId?: string): Promise<{
    summary: string;
    metrics: QualityMetrics;
    trends: any;
    recommendations: string[];
  }> {
    const [metrics, trends] = await Promise.all([
      this.getQualityMetrics(userId),
      this.getQualityTrends(userId)
    ]);

    const summary = this.generateSummary(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      summary,
      metrics,
      trends,
      recommendations
    };
  }

  // Helper methods
  private static getEmptyMetrics(): QualityMetrics {
    return {
      averageRating: 0,
      totalFeedback: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      categoryScores: {},
      improvementSuggestions: [],
      platformPerformance: {}
    };
  }

  private static calculateWeeklyTrend(feedbacks: any[]): Array<{week: string; averageRating: number; totalFeedback: number}> {
    // Basic implementation for weekly trend
    const weeksMap = new Map<string, { sum: number; count: number }>();
    
    feedbacks.forEach(f => {
        const d = new Date(f.createdAt);
        // Get week number/start date representation
        const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
        
        if (!weeksMap.has(weekKey)) {
            weeksMap.set(weekKey, { sum: 0, count: 0 });
        }
        const data = weeksMap.get(weekKey)!;
        data.sum += f.rating;
        data.count++;
    });

    // If empty, return placeholder data
    if (weeksMap.size === 0) {
        const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        return weeks.map(week => ({
          week,
          averageRating: 0, 
          totalFeedback: 0
        }));
    }

    return Array.from(weeksMap.entries()).map(([week, data]) => ({
        week,
        averageRating: data.count > 0 ? data.sum / data.count : 0,
        totalFeedback: data.count
    }));
  }

  private static calculateMonthlyImprovement(weeklyTrend: any[]): number {
    if (weeklyTrend.length < 2) return 0;
    const first = weeklyTrend[0].averageRating;
    const last = weeklyTrend[weeklyTrend.length - 1].averageRating;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }

  private static generateSummary(metrics: QualityMetrics): string {
    const rating = metrics.averageRating;
    const positivePercentage = metrics.totalFeedback > 0 ? (metrics.sentimentBreakdown.positive / metrics.totalFeedback) * 100 : 0;
    
    return `Qualidade geral: ${rating.toFixed(1)}/5 ⭐ | ${positivePercentage.toFixed(0)}% feedback positivo | ${metrics.totalFeedback} avaliações`;
  }

  private static generateRecommendations(metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.averageRating < 3.5) {
      recommendations.push("🔧 Focar na melhoria da precisão das respostas");
    }

    if (metrics.sentimentBreakdown.negative > metrics.totalFeedback * 0.2) {
      recommendations.push("😊 Ajustar tom das respostas para mais positivo");
    }

    metrics.improvementSuggestions.slice(0, 3).forEach(suggestion => {
      recommendations.push(`💡 ${suggestion.suggestion}`);
    });

    return recommendations;
  }
}
