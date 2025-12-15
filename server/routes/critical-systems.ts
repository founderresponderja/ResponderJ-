
import { Express } from 'express';
import { requireAuth } from '../auth';
// These services might need to be created if they don't exist, but we assume they are part of the project structure
import { businessMetricsService } from '../services/business-metrics-service';
import { distributedCache, responseCache, sessionCache, apiCache } from '../services/distributed-cache-service';
import { createHash } from 'crypto';

export function registerCriticalSystemsRoutes(app: any): void {
  
  // === ROTAS DE MÉTRICAS DE NEGÓCIO ===

  // Dashboard principal de métricas
  app.get('/api/admin/metrics/dashboard', requireAuth, async (req: any, res: any) => {
    try {
      const dashboard = await businessMetricsService.getCriticalMetricsDashboard();
      res.json(dashboard);
    } catch (error: any) {
      console.error('Erro ao obter dashboard de métricas:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Métricas por categoria
  app.get('/api/admin/metrics/:category', requireAuth, async (req: any, res: any) => {
    try {
      const { category } = req.params;
      const metrics = await businessMetricsService.getMetricsByCategory(category as any);
      res.json(metrics);
    } catch (error: any) {
      console.error('Erro ao obter métricas por categoria:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Alertas ativos
  app.get('/api/admin/metrics/alerts', requireAuth, async (req: any, res: any) => {
    try {
      const alerts = businessMetricsService.getActiveAlerts();
      res.json(alerts);
    } catch (error: any) {
      console.error('Erro ao obter alertas:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reconhecer alerta
  app.post('/api/admin/metrics/alerts/:alertId/acknowledge', requireAuth, async (req: any, res: any) => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Utilizador não autenticado' });
      }

      await businessMetricsService.acknowledgeAlert(alertId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao reconhecer alerta:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Resolver alerta
  app.post('/api/admin/metrics/alerts/:alertId/resolve', requireAuth, async (req: any, res: any) => {
    try {
      const { alertId } = req.params;
      await businessMetricsService.resolveAlert(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao resolver alerta:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Forçar atualização de métricas
  app.post('/api/admin/metrics/refresh', requireAuth, async (req: any, res: any) => {
    try {
      await businessMetricsService.forceMetricsUpdate();
      res.json({ success: true, message: 'Métricas atualizadas com sucesso' });
    } catch (error: any) {
      console.error('Erro ao atualizar métricas:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // === ROTAS DE CACHE DISTRIBUÍDO ===

  // Estatísticas do cache
  app.get('/api/admin/cache/stats', requireAuth, async (req: any, res: any) => {
    try {
      const stats = {
        main: distributedCache.getStats(),
        response: responseCache.getStats(),
        session: sessionCache.getStats(),
        api: apiCache.getStats()
      };
      res.json(stats);
    } catch (error: any) {
      console.error('Erro ao obter estatísticas do cache:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Relatório detalhado do cache
  app.get('/api/admin/cache/report', requireAuth, async (req: any, res: any) => {
    try {
      const report = {
        main: distributedCache.generateReport(),
        response: responseCache.generateReport(),
        session: sessionCache.generateReport(),
        api: apiCache.generateReport()
      };
      res.json(report);
    } catch (error: any) {
      console.error('Erro ao gerar relatório do cache:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Otimizar cache
  app.post('/api/admin/cache/optimize', requireAuth, async (req: any, res: any) => {
    try {
      const results = {
        main: distributedCache.optimize(),
        response: responseCache.optimize(),
        session: sessionCache.optimize(),
        api: apiCache.optimize()
      };
      res.json(results);
    } catch (error: any) {
      console.error('Erro ao otimizar cache:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Limpar cache por tipo
  app.delete('/api/admin/cache/:type', requireAuth, async (req: any, res: any) => {
    try {
      const { type } = req.params;
      
      switch (type) {
        case 'main':
          distributedCache.clear();
          break;
        case 'response':
          responseCache.clear();
          break;
        case 'session':
          sessionCache.clear();
          break;
        case 'api':
          apiCache.clear();
          break;
        case 'all':
          distributedCache.clear();
          responseCache.clear();
          sessionCache.clear();
          apiCache.clear();
          break;
        default:
          return res.status(400).json({ error: 'Tipo de cache inválido' });
      }

      res.json({ success: true, message: `Cache ${type} limpo com sucesso` });
    } catch (error: any) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remover item específico do cache
  app.delete('/api/admin/cache/:type/:key', requireAuth, async (req: any, res: any) => {
    try {
      const { type, key } = req.params;
      let success = false;

      switch (type) {
        case 'main':
          success = distributedCache.delete(key);
          break;
        case 'response':
          success = responseCache.delete(key);
          break;
        case 'session':
          success = sessionCache.delete(key);
          break;
        case 'api':
          success = apiCache.delete(key);
          break;
        default:
          return res.status(400).json({ error: 'Tipo de cache inválido' });
      }

      res.json({ success, message: success ? 'Item removido' : 'Item não encontrado' });
    } catch (error: any) {
      console.error('Erro ao remover item do cache:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // === ROTAS DE SISTEMA GERAL ===

  // Status geral dos sistemas críticos
  app.get('/api/admin/critical-systems/status', requireAuth, async (req: any, res: any) => {
    try {
      const dashboard = await businessMetricsService.getCriticalMetricsDashboard();
      const cacheStats = {
        main: distributedCache.getStats(),
        response: responseCache.getStats(),
        session: sessionCache.getStats(),
        api: apiCache.getStats()
      };

      const systemStatus = {
        timestamp: new Date().toISOString(),
        business: {
          totalRevenue: dashboard.revenue.totalRevenue,
          activeUsers: dashboard.users.activeUsers24h,
          systemHealth: dashboard.performance.uptime,
          alertsCount: dashboard.alerts.length,
          criticalAlertsCount: dashboard.alerts.filter(a => a.severity === 'critical').length
        },
        performance: {
          averageResponseTime: dashboard.performance.averageResponseTime,
          successRate: dashboard.performance.successRate,
          cacheHitRate: (
            cacheStats.main.hitRate + 
            cacheStats.response.hitRate + 
            cacheStats.session.hitRate + 
            cacheStats.api.hitRate
          ) / 4,
          memoryUsage: Object.values(cacheStats).reduce((sum, stat) => sum + stat.memoryUsage, 0)
        },
        alerts: dashboard.alerts.slice(0, 5), // Top 5 alertas
        lastUpdated: new Date()
      };

      res.json(systemStatus);
    } catch (error: any) {
      console.error('Erro ao obter status dos sistemas críticos:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check dos sistemas críticos
  app.get('/api/admin/critical-systems/health', requireAuth, async (req: any, res: any) => {
    try {
      const healthStatus = {
        metrics: {
          status: 'operational',
          lastUpdate: new Date(),
          alertsActive: businessMetricsService.getActiveAlerts().length
        },
        cache: {
          status: 'operational',
          hitRate: distributedCache.getStats().hitRate,
          memoryUsage: distributedCache.getStats().memoryUsage,
          itemCount: distributedCache.getStats().size
        },
        overall: 'operational' as 'operational' | 'degraded' | 'critical'
      };

      // Determinar status geral
      const criticalAlerts = businessMetricsService.getActiveAlerts()
        .filter(alert => alert.severity === 'critical').length;
      
      const cacheHitRate = distributedCache.getStats().hitRate;

      if (criticalAlerts > 0 || cacheHitRate < 50) {
        healthStatus.overall = 'critical';
      } else if (criticalAlerts > 0 || cacheHitRate < 80) {
        healthStatus.overall = 'degraded';
      }

      res.json(healthStatus);
    } catch (error: any) {
      console.error('Erro ao verificar saúde dos sistemas:', error);
      res.status(500).json({ 
        error: error.message,
        overall: 'critical'
      });
    }
  });

  // === CACHE INTELIGENTE PARA RESPOSTAS IA ===

  // Middleware para cache automático de respostas IA
  app.use('/api/ai/generate-response', async (req: any, res: any, next: any) => {
    try {
      // Criar chave de cache baseada no input
      const cacheKey = `ai_response_${createHash('md5').update(JSON.stringify(req.body)).digest('hex')}`;
      
      // Tentar obter do cache
      const cachedResponse = await responseCache.get<Record<string, any>>(cacheKey);
      if (cachedResponse) {
        return res.json({
          ...cachedResponse,
          fromCache: true,
          cached: true
        });
      }

      // Se não estiver em cache, continuar para o handler normal
      // e interceptar a resposta para cachear
      const originalSend = res.json;
      res.json = function(data: any) {
        // Cachear apenas respostas de sucesso
        if (res.statusCode === 200 && data.response) {
          responseCache.set(cacheKey, data, {
            ttl: 3600, // 1 hora
            tags: ['ai_response', req.body.platform || 'unknown'],
            compress: true
          });
        }
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Erro no middleware de cache IA:', error);
      next();
    }
  });
}