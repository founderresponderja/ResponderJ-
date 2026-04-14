/**
 * Utilitários do servidor - Export central
 * 
 * Exporta classes e funções utilitárias organizadas por categoria.
 */

// Core Utilities
export { Logger, LogLevel, ErrorType } from './Logger.js';
export { ControllerUtils, AppError } from './ControllerUtils.js';
export { urlBuilder, URLBuilder } from './url-builder.js';

// Common Types
export interface RequestContext {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Validation Helpers
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

// Error Types
export interface StructuredError {
  message: string;
  type: string;
  code?: string;
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
  metadata?: any;
}