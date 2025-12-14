
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import { Logger, ErrorType } from '../utils/Logger';
import { ControllerUtils } from '../utils/ControllerUtils';
import { AppError } from '../middleware/errorHandler';

const router: Router = createRouter();

// Schema para relatórios de erro frontend
const ErrorReportSchema = z.object({
  timestamp: z.string(),
  type: z.enum(['react_error', 'api_error', 'programmatic_error', 'performance_issue']),
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  url: z.string(),
  userAgent: z.string(),
  environment: z.string(),
  context: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Schema para análise de performance
const PerformanceReportSchema = z.object({
  timestamp: z.string(),
  type: z.literal('performance'),
  operation: z.string(),
  duration: z.number(),
  url: z.string(),
  userAgent: z.string(),
  metrics: z.object({
    memoryUsage: z.number().optional(),
    loadTime: z.number().optional(),
    renderTime: z.number().optional(),
    apiResponseTime: z.number().optional()
  }).optional()
});

/**
 * Sistema de armazenamento de erros em memória para demonstração
 * Em produção, usar base de dados dedicada ou serviço externo
 */
class ErrorStore {
  private static errors: Array<{
    id: string;
    timestamp: Date;
    type: string;
    message: string;
    context: any;
    userId?: string;
    sessionId?: string;
    resolved: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  private static maxErrors = 1000; // Limite de erros armazenados

  static addError(errorData: {
    type: string;
    message: string;
    context: any;
    userId?: string;
    sessionId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): string {
    const id = ControllerUtils.generateSecureId('err');
    
    const error = {
      id,
      timestamp: new Date(),
      resolved: false,
      severity: 'medium' as const,
      ...errorData
    };

    this.errors.unshift(error);
    
    // Manter apenas os últimos N erros
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    return id;
  }

  static getErrors(filters: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    userId?: string;
    limit?: number;
  } = {}): any[] {
    let filtered = this.errors;

    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }
    if (filters.severity) {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }
    if (filters.resolved !== undefined) {
      filtered = filtered.filter(e => e.resolved === filters.resolved);
    }
    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    const limit = filters.limit || 50;
    return filtered.slice(0, limit);
  }

  static getErrorStats(): any {
    const total = this.errors.length;
    const byType = this.errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const last24h = this.errors.filter(err => 
      Date.now() - err.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      total,
      last24h,
      byType,
      bySeverity,
      resolved: this.errors.filter(e => e.resolved).length,
      unresolved: this.errors.filter(e => !e.resolved).length
    };
  }

  static markResolved(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }
}

/**
 * Classificar severidade do erro
 */
function classifyErrorSeverity(errorReport: any): 'low' | 'medium' | 'high' | 'critical' {
  // Erros críticos que afetam funcionalidade principal
  if (errorReport.type === 'react_error' && errorReport.componentStack?.includes('App')) {
    return 'critical';
  }

  // Erros de autenticação/autorização são alta prioridade
  if (errorReport.message?.includes('auth') || errorReport.message?.includes('permission')) {
    return 'high';
  }

  // Erros de rede são médios
  if (errorReport.type === 'api_error' && errorReport.message?.includes('network')) {
    return 'medium';
  }

  // Performance issues são baixos
  if (errorReport.type === 'performance_issue') {
    return 'low';
  }

  return 'medium';
}

/**
 * POST /api/errors/report
 * Receber relatórios de erro do frontend
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const reportData = ControllerUtils.validateSchema(
      req.body,
      ErrorReportSchema,
      'error report'
    ) as z.infer<typeof ErrorReportSchema>;

    // Classificar severidade
    const severity = classifyErrorSeverity(reportData);
    
    // Obter contexto da sessão
    const userId = req.user?.id;
    const sessionId = req.sessionID;
    
    // Armazenar erro
    const errorId = ErrorStore.addError({
      type: reportData.type,
      message: reportData.message,
      context: {
        ...reportData,
        ip: req.ip,
        sessionId,
        requestId: req.requestId
      },
      userId,
      sessionId,
      severity
    });

    // Log estruturado
    Logger.error('Frontend error reported', new Error(reportData.message), {
      requestId: req.requestId,
      userId,
      url: reportData.url,
      userAgent: reportData.userAgent,
      metadata: {
        errorId,
        severity,
        type: reportData.type
      }
    });

    // Para erros críticos, alertar imediatamente
    if (severity === 'critical') {
      Logger.security(`Critical error reported: ${reportData.message}`, {
        requestId: req.requestId,
        userId,
        metadata: {
          errorId,
          context: reportData
        }
      });
    }

    ControllerUtils.sendSuccess(res, { errorId }, 'Erro reportado com sucesso');

  } catch (error) {
    ControllerUtils.handleError(error, 'report error', res, req);
  }
});

/**
 * POST /api/errors/performance
 * Receber relatórios de performance
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const reportData = ControllerUtils.validateSchema(
      req.body,
      PerformanceReportSchema,
      'performance report'
    ) as z.infer<typeof PerformanceReportSchema>;

    // Armazenar como erro de baixa prioridade se performance for muito ruim
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (reportData.duration > 5000) severity = 'medium';
    if (reportData.duration > 10000) severity = 'high';

    if (severity !== 'low') {
      ErrorStore.addError({
        type: 'performance_issue',
        message: `Slow operation: ${reportData.operation} took ${reportData.duration}ms`,
        context: reportData,
        userId: req.user?.id,
        sessionId: req.sessionID,
        severity
      });
    }

    // Log de performance
    Logger.performance(reportData.operation, reportData.duration, {
      requestId: req.requestId,
      userId: req.user?.id,
      url: reportData.url,
      metadata: {
        metrics: reportData.metrics
      }
    });

    ControllerUtils.sendSuccess(res, null, 'Performance reportada');

  } catch (error) {
    ControllerUtils.handleError(error, 'report performance', res, req);
  }
});

/**
 * GET /api/errors/stats
 * Obter estatísticas de erros (apenas para admins)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = ControllerUtils.requireRole(req, ['admin', 'super_admin']);
    
    const stats = ErrorStore.getErrorStats();
    
    ControllerUtils.sendSuccess(res, stats);

  } catch (error) {
    ControllerUtils.handleError(error, 'get error stats', res, req);
  }
});

/**
 * GET /api/errors/list
 * Listar erros com filtros (apenas para admins)
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const user = ControllerUtils.requireRole(req, ['admin', 'super_admin']);
    
    const { page, limit } = ControllerUtils.getPaginationParams(req);
    const { filters } = ControllerUtils.getFilterParams(req);
    
    const filterParams = {
      type: filters.type as string | undefined,
      severity: filters.severity as string | undefined,
      resolved: filters.resolved ? filters.resolved === 'true' : undefined,
      userId: filters.userId as string | undefined,
      limit: limit * page // Simular paginação
    };
    
    const errors = ErrorStore.getErrors(filterParams);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedErrors = errors.slice(startIndex, endIndex);
    
    const response = ControllerUtils.createPaginatedResponse(
      paginatedErrors,
      page,
      limit,
      errors.length
    );

    res.json(response);

  } catch (error) {
    ControllerUtils.handleError(error, 'list errors', res, req);
  }
});

/**
 * PUT /api/errors/:id/resolve
 * Marcar erro como resolvido (apenas para admins)
 */
router.put('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const user = ControllerUtils.requireRole(req, ['admin', 'super_admin']);
    
    const errorId = req.params.id;
    if (!errorId) {
      throw AppError.validation('ID do erro é obrigatório');
    }

    const resolved = ErrorStore.markResolved(errorId);
    
    if (!resolved) {
      throw AppError.notFound('Erro');
    }

    Logger.info('Error marked as resolved', {
      requestId: req.requestId,
      userId: user.id,
      metadata: {
        errorId,
        resolvedBy: user.email
      }
    });

    ControllerUtils.sendSuccess(res, null, 'Erro marcado como resolvido');

  } catch (error) {
    ControllerUtils.handleError(error, 'resolve error', res, req);
  }
});

/**
 * GET /api/errors/health
 * Health check do sistema de error reporting
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = ErrorStore.getErrorStats();
    const criticalErrors = ErrorStore.getErrors({ severity: 'critical', resolved: false });
    
    const health = {
      status: criticalErrors.length === 0 ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      errors: {
        total: stats.total,
        unresolved: stats.unresolved,
        critical: criticalErrors.length,
        last24h: stats.last24h
      },
      recommendations: [] as string[]
    };

    // Adicionar recomendações baseadas nas estatísticas
    if (criticalErrors.length > 0) {
      health.recommendations.push('Existem erros críticos não resolvidos que requerem atenção imediata');
    }
    
    if (stats.last24h > 100) {
      health.recommendations.push('Alto volume de erros nas últimas 24h - investigar possíveis problemas sistémicos');
    }

    ControllerUtils.sendSuccess(res, health);

  } catch (error) {
    ControllerUtils.handleError(error, 'error health check', res, req);
  }
});

export default router;
