import { randomBytes } from 'crypto';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  SECURITY = 'security',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found'
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  errorType?: ErrorType;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface StructuredError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  context?: Record<string, any>;
  originalError?: Error;
}

/**
 * Sistema de logging estruturado para debugging e monitorização
 */
export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  private static sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization', 
    'cookie', 'session', 'credit_card', 'ssn', 'email'
  ];

  /**
   * Gera um identificador único para cada request HTTP
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Remove informações sensíveis dos dados antes de fazer log
   */
  private static sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      return this.sensitiveFields.some(field => 
        data.toLowerCase().includes(field)
      ) ? '[SANITIZED]' : data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const isSensitive = this.sensitiveFields.some(field => 
          key.toLowerCase().includes(field)
        );
        sanitized[key] = isSensitive ? '[SANITIZED]' : this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Formata mensagem de log com estrutura padronizada
   */
  private static formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const requestId = context?.requestId || 'unknown';
    
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      requestId,
      message,
      ...this.sanitizeData(context)
    };

    return this.isDevelopment 
      ? JSON.stringify(logData, null, 2)
      : JSON.stringify(logData);
  }

  /**
   * Regista erros do sistema com stack trace e contexto completo
   */
  static error(message: string, error?: Error | StructuredError, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      errorType: (error as StructuredError)?.type || ErrorType.SYSTEM,
      stack: this.isDevelopment ? error?.stack : undefined,
    };

    console.error(this.formatLog(LogLevel.ERROR, message, errorContext));

    // Em produção, enviar para serviço de monitorização
    if (!this.isDevelopment && error) {
      this.reportError(error, context);
    }
  }

  /**
   * Regista avisos que requerem atenção mas não são críticos
   */
  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  /**
   * Regista eventos informativos normais do sistema
   */
  static info(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context));
  }

  /**
   * Regista informações detalhadas para debugging (apenas em desenvolvimento)
   */
  static debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  /**
   * Regista métricas de performance para monitorização de sistema
   */
  static performance(operation: string, duration: number, context?: LogContext): void {
    const performanceContext = {
      ...context,
      duration,
      metadata: { 
        ...context?.metadata, 
        performance: true,
        operation,
        durationMs: `${duration}ms`
      }
    };

    if (duration > 1000) {
      this.warn(`Performance lenta: ${operation}`, performanceContext);
    } else {
      this.debug(`Performance: ${operation}`, performanceContext);
    }
  }

  /**
   * Regista eventos críticos de segurança que requerem atenção imediata
   */
  static security(message: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      errorType: ErrorType.SECURITY,
      metadata: { ...context?.metadata, security: true }
    };

    console.error(this.formatLog(LogLevel.ERROR, `SECURITY: ${message}`, securityContext));
  }

  /**
   * Envia relatório de erro para sistema de monitorização externo
   */
  private static reportError(error: Error, context?: LogContext): void {
    // Implementar integração com Sentry, LogRocket, etc.
    // Por agora, apenas log estruturado
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: this.sanitizeData(context),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown'
    };

    console.error('ERROR_REPORT:', JSON.stringify(errorReport));
  }

  /**
   * Extrai informações de contexto de uma request HTTP
   */
  static createRequestContext(req: any): LogContext {
    return {
      requestId: req.requestId || this.generateRequestId(),
      userId: req.user?.id,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl || req.url,
    };
  }

  /**
   * Cria um timer para medir duração de operações
   */
  static timer(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.performance(label, duration);
      return duration;
    };
  }
}