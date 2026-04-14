import type { Request, Response } from "express";
import { z } from 'zod';
import { storage } from "../storage.js";
import { Logger, ErrorType } from './Logger.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Re-export AppError for compatibility with index.ts exports
export { AppError };

/**
 * Classe utilitária para controladores com métodos auxiliares comuns
 * 
 * Fornece funções padronizadas para validação, autenticação, autorização,
 * tratamento de erros, respostas HTTP e outras operações frequentes.
 * 
 * Objectivos:
 * - Consistencia entre todos os controladores
 * - Redução de código duplicado
 * - Tratamento robusto de erros
 * - Validações padronizadas
 * - Respostas HTTP consistentes
 */
export class ControllerUtils {
  /**
   * Tratamento centralizado e robusto de erros para controladores
   * 
   * Analisa o tipo de erro, converte para AppError quando necessário,
   * faz logging apropriado e retorna resposta JSON consistente.
   * 
   * @param error - Erro capturado (qualquer tipo)
   * @param operation - Nome da operação onde ocorreu o erro
   * @param res - Response object do Express para enviar resposta
   * @param req - Request object do Express para contexto de logging
   * 
   * @example
   * try {
   *   await someOperation();
   * } catch (error) {
   *   return ControllerUtils.handleError(error, 'create_user', res, req);
   * }
   */
  static handleError(error: any, operation: string, res: Response, req: Request): void {
    const context = Logger.createRequestContext(req);
    
    // Early return para AppError já estruturado
    if (error instanceof AppError) {
      Logger.error(`Controller error: ${operation}`, error, {
        ...context,
        errorType: error.type,
        metadata: { ...context.metadata, operation }
      });
      
      return (res as any).status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code
        }
      });
    }

    // Criar AppError apropriado baseado no tipo de erro
    let appError: AppError;
    
    // Early return para erros de validação
    if (error.name === 'ValidationError' || error instanceof z.ZodError) {
      appError = error instanceof z.ZodError 
        ? AppError.fromZodError(error)
        : AppError.validation(error.message);
    } else if (error.code === 'P2002') { // Prisma unique constraint
      appError = AppError.validation('Dados duplicados encontrados');
    } else if (error.code?.startsWith('P')) { // Outros erros Prisma/DB
      appError = AppError.database(error.message, error);
    } else {
      appError = new AppError(
        `Erro interno na operação: ${operation}`,
        ErrorType.SYSTEM,
        500,
        false,
        'CONTROLLER_ERROR',
        { operation },
        error
      );
    }

    Logger.error(`Controller error: ${operation}`, appError, {
      ...context,
      errorType: appError.type,
      metadata: { ...context.metadata, operation }
    });

    (res as any).status(appError.statusCode).json({
      success: false,
      error: {
        message: appError.message,
        type: appError.type,
        code: appError.code
      }
    });
  }

  /**
   * Verifica se um lead já existe na base de dados pelo email
   * 
   * Utilizada para evitar duplicações na importação de leads
   * e validações de unicidade.
   * 
   * @param email - Endereço de email do lead a verificar
   * @returns Promise que resolve para true se lead existe, false caso contrário
   * 
   * @example
   * const exists = await ControllerUtils.validateLeadExists('user@example.com');
   * if (exists) {
   *   throw AppError.validation('Lead já existe');
   * }
   */
  static async validateLeadExists(email: string): Promise<boolean> {
    return await storage.checkLeadExists(email);
  }

  /**
   * Configurar headers para download de CSV
   */
  static setCSVHeaders(res: Response, filename: string): void {
    (res as any).setHeader('Content-Type', 'text/csv');
    (res as any).setHeader('Content-Disposition', `attachment; filename=${filename}`);
  }

  /**
   * Processa um array de leads com validação, duplicação e tratamento de erros
   * 
   * Função genérica para processamento em lote de leads com tracking
   * detalhado de sucessos, itens ignorados e erros.
   * 
   * @param leads - Array de dados de leads para processar
   * @param processor - Função assíncrona para processar cada lead
   * @param options - Opções de processamento
   * @param options.checkExists - Se deve verificar duplicações
   * @param options.source - Fonte dos leads para metadados
   * @returns Estatísticas detalhadas do processamento
   * 
   * @example
   * const result = await ControllerUtils.processLeadsArray(
   *   csvData,
   *   async (lead) => await storage.createLead(lead),
   *   { checkExists: true, source: 'csv_import' }
   * );
   * console.log(`Processados: ${result.processed}, Erros: ${result.errors.length}`);
   */
  static async processLeadsArray(
    leads: any[], 
    processor: (lead: any) => Promise<void>,
    options: { checkExists?: boolean, source?: string } = {}
  ): Promise<{ processed: number; skipped: number; errors: string[] }> {
    // Processar leads usando Promise.allSettled para performance melhorada
    const leadPromises = leads.map(async (leadData) => {
      try {
        // Verificar se lead já existe (se solicitado)
        if (options.checkExists) {
          const exists = await this.validateLeadExists(leadData.email);
          if (exists) {
            return { status: 'skipped', leadData };
          }
        }

        await processor(leadData);
        return { status: 'processed', leadData };
      } catch (error) {
        return { status: 'error', leadData, error: `Erro no lead ${leadData.email}: ${error}` };
      }
    });

    const results = await Promise.allSettled(leadPromises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .reduce(
        (acc, result) => {
          if (result.status === 'processed') acc.processed++;
          else if (result.status === 'skipped') acc.skipped++;
          else if (result.status === 'error') acc.errors.push(result.error);
          return acc;
        },
        { processed: 0, skipped: 0, errors: [] as string[] }
      );
  }

  /**
   * Criar lead com dados padrão
   */
  static async createLeadWithDefaults(
    leadData: any, 
    source: string = 'manual'
  ): Promise<any> {
    return await storage.createLead({
      ...leadData,
      source,
      emailStatus: 'pending',
    });
  }

  /**
   * Valida dados contra um schema Zod com tratamento de erros integrado
   * 
   * Alternativa ao middleware validateSchema para validação manual
   * dentro de controladores.
   * 
   * @param data - Dados a serem validados
   * @param schema - Schema Zod para validação
   * @param operation - Nome da operação para contexto de erro
   * @returns Dados validados e tipados
   * @throws AppError.validation se validação falhar
   * 
   * @example
   * const userData = ControllerUtils.validateSchema(
   *   req.body,
   *   userCreateSchema,
   *   'create_user'
   * );
   * // userData é tipado e validado
   */
  static validateSchema<T>(
    data: any,
    schema: z.ZodSchema<T>,
    operation: string
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw AppError.fromZodError(error);
      }
      throw AppError.validation(`Dados inválidos para operação: ${operation}`);
    }
  }

  /**
   * Validar dados obrigatórios do request
   */
  static validateRequired(
    data: any, 
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Verifica se o utilizador está autenticado ou lança erro
   * 
   * Verificação simples de autenticação que pode ser usada
   * em controladores que requerem login.
   * 
   * @param req - Request object do Express
   * @returns Objeto user se autenticado
   * @throws AppError.authentication se não autenticado
   * 
   * @example
   * const user = ControllerUtils.requireAuth(req);
   * // user contém dados do utilizador autenticado
   */
  static requireAuth(req: Request): any {
    if (!(req as any).user) {
      throw AppError.authentication('Utilizador não autenticado');
    }
    return (req as any).user;
  }

  /**
   * Verifica se o utilizador tem uma das roles permitidas
   * 
   * Validação de autorização baseada em roles para controlo
   * de acesso granular.
   * 
   * @param req - Request object do Express
   * @param allowedRoles - Array de roles que têm acesso
   * @returns Objeto user se autorizado
   * @throws AppError.authentication se não autenticado
   * @throws AppError.authorization se não tem role adequada
   * 
   * @example
   * const admin = ControllerUtils.requireRole(req, ['admin', 'super_admin']);
   * // admin é utilizador com role adequada
   */
  static requireRole(req: Request, allowedRoles: string[]): any {
    const user = this.requireAuth(req);
    
    if (!allowedRoles.includes(user.role)) {
      throw AppError.authorization(
        `Acesso negado. Requer uma das roles: ${allowedRoles.join(', ')}`
      );
    }
    
    return user;
  }

  /**
   * Validação de propriedade de recurso
   */
  static async requireOwnership(
    req: Request,
    resourceOwnerId: string,
    options: { allowAdmin?: boolean } = {}
  ): Promise<any> {
    const user = this.requireAuth(req);
    
    // Admins podem aceder a qualquer recurso
    if (options.allowAdmin && ['admin', 'super_admin'].includes(user.role)) {
      return user;
    }
    
    // Verificar se o utilizador é proprietário do recurso
    if (user.id !== resourceOwnerId) {
      throw AppError.authorization(
        'Não tem permissões para aceder a este recurso'
      );
    }
    
    return user;
  }

  /**
   * Validação de limites de rate limiting
   */
  static checkRateLimit(
    req: Request,
    maxRequests: number,
    windowMs: number,
    identifier?: string
  ): void {
    // Implementação básica - pode ser expandida com Redis
    const key = identifier || (req as any).ip;
    const now = Date.now();
    
    // Por agora, apenas log - implementação completa requer cache externo
    Logger.debug(`Rate limit check for ${key}`, {
      requestId: (req as any).requestId,
      metadata: {
        maxRequests,
        windowMs,
        timestamp: now
      }
    });
  }

  /**
   * Envia resposta de sucesso padronizada em formato JSON
   * 
   * Cria estrutura consistente para todas as respostas de sucesso
   * da API com timestamp automático.
   * 
   * @param res - Response object do Express
   * @param data - Dados a retornar (opcional)
   * @param message - Mensagem de sucesso (opcional)
   * @param statusCode - Código HTTP (padrão: 200)
   * 
   * @example
   * ControllerUtils.sendSuccess(res, users, 'Utilizadores obtidos com sucesso');
   * // Resposta: { success: true, data: [...], message: '...', timestamp: '...' }
   */
  static sendSuccess(
    res: Response,
    data?: any,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: any = {
      success: true,
      timestamp: new Date().toISOString()
    };
    
    if (message) response.message = message;
    if (data !== undefined) response.data = data;
    
    (res as any).status(statusCode).json(response);
  }

  /**
   * Resposta de erro padronizada
   */
  static sendError(
    res: Response,
    message: string,
    statusCode: number = 400,
    errorCode?: string,
    details?: any
  ): void {
    const response: any = {
      success: false,
      error: {
        message,
        timestamp: new Date().toISOString()
      }
    };
    
    if (errorCode) response.error.code = errorCode;
    if (details) response.error.details = details;
    
    (res as any).status(statusCode).json(response);
  }

  /**
   * Resposta padronizada para operações de importação
   */
  static sendImportResponse(
    res: Response, 
    result: { processed: number; skipped: number; errors: string[] }
  ): void {
    const success = result.errors.length === 0;
    
    (res as any).status(success ? 200 : 207).json({
      success,
      data: {
        imported: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        total: result.processed + result.skipped + result.errors.length
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Extrai e valida parâmetros de paginação do query string
   * 
   * Obtém parâmetros 'page' e 'limit' da query, aplica valores padrão
   * e límites de segurança, e calcula offset para base de dados.
   * 
   * @param req - Request object do Express
   * @returns Objeto com page, limit e offset calculado
   * @throws AppError.validation se parâmetros inválidos
   * 
   * @example
   * const { page, limit, offset } = ControllerUtils.getPaginationParams(req);
   * const users = await db.getUsers({ limit, offset });
   * // page=1, limit=50 (padrão), offset=0
   */
  static getPaginationParams(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt((req as any).query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req as any).query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    if (page < 1) {
      throw AppError.validation('Página deve ser maior que 0');
    }
    
    if (limit < 1 || limit > 100) {
      throw AppError.validation('Limite deve estar entre 1 e 100');
    }
    
    return { page, limit, offset };
  }

  /**
   * Extrair parâmetros de filtro e pesquisa
   */
  static getFilterParams(req: Request): {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters: Record<string, any>;
  } {
    const search = (req as any).query.search as string;
    const sortBy = (req as any).query.sortBy as string;
    const sortOrder = ((req as any).query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
    
    // Extrair outros filtros do query string usando filter e reduce
    const excludedKeys = ['page', 'limit', 'search', 'sortBy', 'sortOrder'];
    const filters = Object.entries((req as any).query)
      .filter(([key]) => !excludedKeys.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>);
    
    return {
      search: search?.trim(),
      sortBy,
      sortOrder,
      filters
    };
  }

  /**
   * Cria resposta padronizada com metadados de paginação completos
   * 
   * Gera estrutura de resposta consistente com informações detalhadas
   * de paginação para facilitar navegação no frontend.
   * 
   * @param data - Array de dados da página actual
   * @param page - Número da página actual
   * @param limit - Itens por página
   * @param total - Total de itens na base de dados
   * @param additionalData - Dados extra para incluir na resposta
   * @returns Objeto de resposta com dados e metadados de paginação
   * 
   * @example
   * const response = ControllerUtils.createPaginatedResponse(
   *   users, 2, 10, 95, { totalActiveUsers: 80 }
   * );
   * // response.pagination.hasNext === true
   * // response.pagination.totalPages === 10
   */
  static createPaginatedResponse(
    data: any[], 
    page: number, 
    limit: number, 
    total: number,
    additionalData?: Record<string, any>
  ): any {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null
      },
      timestamp: new Date().toISOString(),
      ...additionalData
    };
  }

  /**
   * Sanitização de dados de entrada
   */
  static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validação de formato de email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validação de formato de telefone
   */
  static validatePhone(phone: string): boolean {
    // Suporte para formatos portugueses e internacionais
    const phoneRegex = /^(\+351|00351|351)?\s?[1-9]\d{8}$|^(\+\d{1,3})?\s?\d{6,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Validação de limite de tamanho de ficheiro
   */
  static validateFileSize(file: any, maxSizeMB: number): void {
    if (!file) {
      throw AppError.validation('Ficheiro é obrigatório');
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      throw AppError.validation(
        `Ficheiro demasiado grande. Máximo: ${maxSizeMB}MB`
      );
    }
  }

  /**
   * Validação de tipo de ficheiro
   */
  static validateFileType(file: any, allowedTypes: string[]): void {
    if (!file) {
      throw AppError.validation('Ficheiro é obrigatório');
    }
    
    const fileType = file.mimetype || file.type;
    
    if (!allowedTypes.includes(fileType)) {
      throw AppError.validation(
        `Tipo de ficheiro não permitido. Tipos aceites: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Mede tempo de execução de operações com logging automático
   * 
   * Wrapper que cronometra operações assíncronas e faz logging
   * detalhado do tempo de execução e resultado.
   * 
   * @param operation - Nome descritivo da operação
   * @param fn - Função assíncrona a executar
   * @param req - Request object para contexto (opcional)
   * @returns Resultado da função executada
   * @throws Re-lana qualquer erro da função após logging
   * 
   * @example
   * const users = await ControllerUtils.measureOperation(
   *   'fetch_all_users',
   *   () => db.getAllUsers(),
   *   req
   * );
   * // Logs: "Starting operation: fetch_all_users" e "Operation completed: ..."
   */
  static async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    req?: Request
  ): Promise<T> {
    const timer = Logger.timer(operation);
    const context = req ? Logger.createRequestContext(req) : {};
    
    try {
      Logger.debug(`Starting operation: ${operation}`, context);
      const result = await fn();
      const duration = timer();
      
      Logger.info(`Operation completed: ${operation}`, {
        ...context,
        duration,
        metadata: { ...context.metadata, success: true }
      });
      
      return result;
    } catch (error) {
      const duration = timer();
      
      Logger.error(`Operation failed: ${operation}`, error as Error, {
        ...context,
        duration,
        metadata: { ...context.metadata, success: false }
      });
      
      throw error;
    }
  }

  /**
   * Gerador de IDs únicos seguros
   */
  static generateSecureId(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * Normaliza e valida dados de contacto com formatos padronizados
   * 
   * Aplica formatação consistente e validação a dados de contacto,
   * garantindo qualidade e consistência na base de dados.
   * 
   * @param data - Objeto com dados de contacto opcionais
   * @returns Dados normalizados e validados
   * @throws AppError.validation se algum campo for inválido
   * 
   * @example
   * const normalized = ControllerUtils.normalizeContactData({
   *   email: '  USER@EXAMPLE.COM  ',
   *   phone: '+351 91 234 56 78',
   *   name: 'joão silva  '
   * });
   * // { email: 'user@example.com', phone: '+351912345678', name: 'joão silva' }
   */
  static normalizeContactData(data: {
    email?: string;
    phone?: string;
    name?: string;
  }): any {
    const normalized: any = {};
    
    if (data.email) {
      normalized.email = data.email.toLowerCase().trim();
      if (!this.validateEmail(normalized.email)) {
        throw AppError.validation('Formato de email inválido');
      }
    }
    
    if (data.phone) {
      normalized.phone = data.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
      if (!this.validatePhone(normalized.phone)) {
        throw AppError.validation('Formato de telefone inválido');
      }
    }
    
    if (data.name) {
      normalized.name = data.name.trim();
      if (normalized.name.length < 2) {
        throw AppError.validation('Nome deve ter pelo menos 2 caracteres');
      }
    }
    
    return normalized;
  }

  /**
   * Sistema de cache em memória com expiração automática
   * 
   * Cache simples para armazenar resultados de operações frequentes
   * e reduzir carga na base de dados. Adequado para dados que mudam
   * pouco e podem ser partilhados entre requests.
   * 
   * @private
   */
  private static cache = new Map<string, { data: any; expires: number }>();
  
  /**
   * Obtém valor do cache se existir e não tiver expirado
   * 
   * @param key - Chave do cache
   * @returns Valor em cache ou null se não existir/expirado
   * 
   * @example
   * const users = ControllerUtils.getCached<User[]>('all_users');
   * if (!users) {
   *   const freshUsers = await db.getAllUsers();
   *   ControllerUtils.setCached('all_users', freshUsers, 300000);
   * }
   */
  static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Armazena valor no cache com tempo de expiração
   * 
   * @param key - Chave do cache
   * @param data - Dados a armazenar
   * @param ttlMs - Tempo de vida em milissegundos (padrão: 5 minutos)
   * 
   * @example
   * ControllerUtils.setCached('user_stats', stats, 600000); // 10 minutos
   */
  static setCached(key: string, data: any, ttlMs: number = 300000): void { // 5 min default
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }
  
  static clearCache(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Remove entradas expiradas do cache para libertar memória
   * 
   * Deve ser chamado periodicamente (ex: via cron job) para evitar
   * acumulação de memória com entradas expiradas.
   * 
   * @example
   * // Chamar a cada 15 minutos
   * setInterval(() => {
   *   ControllerUtils.cleanupExpiredCache();
   * }, 15 * 60 * 1000);
   */
  static cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    }
  }
}