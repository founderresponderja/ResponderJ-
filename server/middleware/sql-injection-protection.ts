/**
 * RESPONDER JÁ - PROTEÇÃO SQL INJECTION MILITAR
 * Detecção e bloqueio de 25+ padrões de SQL injection
 */

import { Request, Response, NextFunction } from 'express';

// Padrões de SQL injection mais comuns e avançados
const sqlInjectionPatterns = [
  // Comentários SQL
  /--[\s\S]*/gi,
  /\/\*[\s\S]*?\*\//gi,
  /#[\s\S]*/gi,
  
  // Union attacks
  /\bunion\b[\s\S]*?\bselect\b/gi,
  /\bunion\b[\s\S]*?\ball\b/gi,
  
  // Stacked queries
  /;\s*(\w+)/gi,
  
  // Boolean-based blind SQL injection
  /\b(and|or)\b[\s\S]*?=[\s\S]*?/gi,
  /\b(and|or)\b[\s\S]*?\b(true|false)\b/gi,
  
  // Time-based blind SQL injection
  /\bwaitfor\b[\s\S]*?\bdelay\b/gi,
  /\bsleep\b\s*\(/gi,
  /\bbenchmark\b\s*\(/gi,
  
  // Error-based SQL injection
  /\bconvert\b\s*\(/gi,
  /\bcast\b\s*\(/gi,
  /\bextractvalue\b\s*\(/gi,
  /\bxpath\b\s*\(/gi,
  
  // Information schema attacks
  /\binformation_schema\b/gi,
  /\bsys\.\w+/gi,
  /\bmaster\.\w+/gi,
  
  // Database functions
  /\bversion\b\s*\(/gi,
  /\buser\b\s*\(/gi,
  /\bdatabase\b\s*\(/gi,
  /\bschema\b\s*\(/gi,
  
  // File operations
  /\bload_file\b\s*\(/gi,
  /\binto\s+outfile\b/gi,
  /\binto\s+dumpfile\b/gi,
  
  // Conditional statements
  /\bif\b\s*\(/gi,
  /\bcase\b[\s\S]*?\bwhen\b/gi,
  
  // SQL commands
  /\b(select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
  
  // Hexadecimal and char functions
  /0x[0-9a-f]+/gi,
  /\bchar\b\s*\(/gi,
  /\bascii\b\s*\(/gi,
  
  // Quotation marks manipulation
  /\'+[\s\S]*?\'/gi,
  /\"+[\s\S]*?\"/gi,
  
  // Special characters sequences
  /%27|%22|%20|%3D|%3C|%3E/gi,
  
  // Logical operators
  /\|\|/gi,
  /&&/gi
];

// Padrões específicos para NoSQL injection
const noSqlInjectionPatterns = [
  /\$where/gi,
  /\$ne/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$or/gi,
  /\$and/gi,
  /\$regex/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$gte/gi,
  /\$lte/gi
];

// Lista de valores seguros em headers que podem conter palavras-chave
const safeHeaderValues = [
  // User agents mobile comuns
  /mozilla.*mobile/i,
  /webkit.*mobile/i,
  /android/i,
  /iphone/i,
  /ipad/i,
  /blackberry/i,
  /windows phone/i,
  // Valores de cookies seguros
  /secure/i,
  /httponly/i,
  /samesite/i,
  // Headers de compressão e encoding
  /gzip.*deflate/i,
  /charset=utf-8/i,
  /application\/json/i,
  /text\/html/i
];

// Verificar se string contém padrões de SQL injection
const containsSQLInjection = (input: string, isHeader = false): boolean => {
  if (typeof input !== 'string') return false;
  
  // Para headers, verificar primeiro se é um valor seguro conhecido
  if (isHeader && safeHeaderValues.some(pattern => pattern.test(input))) {
    return false;
  }
  
  const decoded = decodeURIComponent(input.toLowerCase());
  
  // Para headers, usar verificação menos restritiva
  if (isHeader) {
    // Apenas verificar padrões mais óbvios de SQL injection em headers
    const criticalPatterns = [
      /\bunion\b[\s\S]*?\bselect\b/gi,
      /\bdrop\b[\s\S]*?\btable\b/gi,
      /\bdelete\b[\s\S]*?\bfrom\b/gi,
      /\binsert\b[\s\S]*?\binto\b/gi,
      /--[\s\S]*/gi,
      /\/\*[\s\S]*?\*\//gi,
      /\bexec\b[\s\S]*?\(/gi,
      /\bexecute\b[\s\S]*?\(/gi
    ];
    return criticalPatterns.some(pattern => pattern.test(decoded));
  }
  
  return sqlInjectionPatterns.some(pattern => pattern.test(decoded)) ||
         noSqlInjectionPatterns.some(pattern => pattern.test(decoded));
};

// Verificar objeto recursivamente
const checkObjectForSQLInjection = (obj: any, path = ''): string | null => {
  if (typeof obj === 'string') {
    if (containsSQLInjection(obj, false)) {
      return path || 'root';
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = checkObjectForSQLInjection(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (containsSQLInjection(key, false)) {
        return `${path}.${key}(key)`;
      }
      const result = checkObjectForSQLInjection(value, `${path}.${key}`);
      if (result) return result;
    }
  }
  
  return null;
};

// Middleware principal de proteção
export const protectDatabaseQueries = (req: Request, res: Response, next: NextFunction) => {
  try {
    // TEMPORÁRIO: Desactivar para endpoints de login
    if (req.path.includes('login') || req.path.includes('/auth/')) {
      return next();
    }
    
    // Skip security check for legitimate frontend assets
    const url = req.url || '';
    if (url.startsWith('/src/') || 
        url.startsWith('/@fs/') ||
        url.startsWith('/node_modules/') ||
        url.includes('.tsx') ||
        url.includes('.jsx') ||
        url.includes('.ts') ||
        url.includes('.js') ||
        url.includes('/components/') ||
        url.includes('/ui/') ||
        url.includes('vite') ||
        url.includes('hot-update')) {
      return next();
    }

    // Verificar URL e query parameters
    if (req.url && containsSQLInjection(req.url, false)) {
      console.error(`SQL INJECTION DETECTED IN URL: ${req.url} from IP ${req.ip}`);
      return res.status(400).json({ 
        error: 'Requisição suspeita detectada',
        code: 'SQL_INJECTION_URL'
      });
    }
    
    // Verificar query parameters
    if (req.query) {
      const suspiciousField = checkObjectForSQLInjection(req.query, 'query');
      if (suspiciousField) {
        console.error(`SQL INJECTION DETECTED IN QUERY: ${suspiciousField} from IP ${req.ip}`);
        return res.status(400).json({ 
          error: 'Parâmetros suspeitos detectados',
          code: 'SQL_INJECTION_QUERY'
        });
      }
    }
    
    // Verificar body
    if (req.body) {
      const suspiciousField = checkObjectForSQLInjection(req.body, 'body');
      if (suspiciousField) {
        console.error(`SQL INJECTION DETECTED IN BODY: ${suspiciousField} from IP ${req.ip}`);
        return res.status(400).json({ 
          error: 'Dados suspeitos detectados',
          code: 'SQL_INJECTION_BODY'
        });
      }
    }
    
    // Verificar headers críticos (com verificação menos restritiva)
    const criticalHeaders = ['authorization', 'cookie', 'x-forwarded-for'];
    for (const header of criticalHeaders) {
      const value = req.get(header);
      if (value && containsSQLInjection(value, true)) {
        console.error(`SQL INJECTION DETECTED IN HEADER ${header}: ${value} from IP ${req.ip}`);
        return res.status(400).json({ 
          error: 'Headers suspeitos detectados',
          code: 'SQL_INJECTION_HEADER'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro no middleware de proteção SQL:', error);
    return res.status(500).json({ 
      error: 'Erro interno de segurança',
      code: 'SECURITY_ERROR'
    });
  }
};

// Wrapper para funções de database que adiciona logging
export const secureDbQuery = async <T>(
  queryFn: () => Promise<T>,
  queryName: string,
  params?: any
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    // Log da query (sem parâmetros sensíveis)
    console.log(`DB QUERY START: ${queryName} at ${new Date().toISOString()}`);
    
    const result = await queryFn();
    
    const duration = Date.now() - startTime;
    console.log(`DB QUERY SUCCESS: ${queryName} completed in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`DB QUERY ERROR: ${queryName} failed after ${duration}ms:`, error);
    throw error;
  }
};
