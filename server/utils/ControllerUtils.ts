import type { Request, Response } from "express";
import { z } from 'zod';
import { storage } from "../storage";
import { Logger, ErrorType } from './Logger';

// Implementação interna de AppError para evitar dependências circulares ou ficheiros em falta
export class AppError extends Error {
  constructor(
    public message: string,
    public type: string = ErrorType.SYSTEM,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string,
    public details?: any,
    public originalError?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(message: string, details?: any) {
    return new AppError(message, ErrorType.VALIDATION, 400, true, 'VALIDATION_ERROR', details);
  }

  static authentication(message: string) {
    return new AppError(message, ErrorType.AUTHENTICATION, 401, true, 'AUTH_ERROR');
  }

  static authorization(message: string) {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, true, 'ACCESS_DENIED');
  }
  
  static database(message: string, originalError?: any) {
    return new AppError(message, ErrorType.DATABASE, 500, false, 'DB_ERROR', undefined, originalError);
  }

  static fromZodError(error: z.ZodError) {
    return new AppError('Dados inválidos', ErrorType.VALIDATION, 400, true, 'VALIDATION_ERROR', error.errors);
  }
}

/**
 * Classe utilitária para controladores com métodos auxiliares comuns
 */
export class ControllerUtils {
  /**
   * Tratamento centralizado de erros
   */
  static handleError(error: any, operation: string, res: Response, req?: Request): void {
    const context = req ? Logger.createRequestContext(req) : undefined;
    
    // Early return para AppError já estruturado
    if (error instanceof AppError) {
      Logger.error(`Controller error: ${operation}`, error, context);
      
      res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
          details: error.details
        }
      });
      return;
    }

    // Erros do Zod
    if (error instanceof z.ZodError) {
      const appError = AppError.fromZodError(error);
      Logger.warn(`Validation error in ${operation}`, { ...context, metadata: appError.details });
      
      res.status(400).json({
        success: false,
        error: {
          message: appError.message,
          type: appError.type,
          code: appError.code,
          details: appError.details
        }
      });
      return;
    }

    // Erros genéricos
    Logger.error(`Unexpected error in ${operation}`, error, context);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Ocorreu um erro interno no servidor',
        type: ErrorType.SYSTEM,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }

  /**
   * Verifica se um lead já existe na base de dados pelo email
   */
  static async validateLeadExists(email: string): Promise<boolean> {
    return await storage.checkLeadExists(email);
  }

  /**
   * Configurar headers para download de CSV
   */
  static setCSVHeaders(res: Response, filename: string): void {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  }

  /**
   * Processa um array de leads com validação
   */
  static async processLeadsArray(
    leads: any[], 
    processor: (lead: any) => Promise<void>,
    options: { checkExists?: boolean, source?: string } = {}
  ): Promise<{ processed: number; skipped: number; errors: string[] }> {
    const leadPromises = leads.map(async (leadData) => {
      try {
        if (options.checkExists && leadData.email) {
          const exists = await this.validateLeadExists(leadData.email);
          if (exists) {
            return { status: 'skipped', leadData };
          }
        }

        await processor(leadData);
        return { status: 'processed', leadData };
      } catch (error) {
        const identifier = leadData.email || 'unknown';
        return { status: 'error', leadData, error: `Erro no lead ${identifier}: ${(error as Error).message}` };
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
      companyName: leadData.companyName,
      contactName: leadData.contactName || '',
      email: leadData.email,
      phone: leadData.phone || '',
      website: leadData.website || '',
      industry: leadData.industry || '',
      region: leadData.region || '',
      businessType: leadData.businessType || '',
      source: source,
      status: leadData.status || 'novo',
      emailStatus: 'pending',
    });
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
   * Extrai e valida parâmetros de paginação
   */
  static getPaginationParams(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * Cria resposta padronizada com metadados de paginação
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
      },
      ...additionalData
    };
  }
}