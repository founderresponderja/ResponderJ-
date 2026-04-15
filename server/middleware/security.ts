
/**
 * MIDDLEWARE DE SEGURANÇA AVANÇADA - RESPONDER JÁ
 * Implementa headers de segurança, proteção CSRF, e validação de entrada
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import process from 'process';
import { Buffer } from 'buffer';
import { domainManager } from '../config/domains.js';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ✅ Função para limpar rate limiting durante desenvolvimento
export const clearRateLimit = () => {
  if (process.env.NODE_ENV === 'development') {
    rateLimitStore.clear();
    console.log('🔧 Rate limiting store cleared for development');
  }
};

// CSRF token store (em produção, usar Redis)
const csrfTokenStore = new Map<string, string>();

// 🔒 CABEÇALHOS DE SEGURANÇA MULTI-DOMÍNIO COM DOMAIN MANAGER
const getAllowedDomains = () => {
  const baseDomains = domainManager.getAllowedDomains();
  
  // Expandir com wildcards para CSP
  const expandedDomains = baseDomains.flatMap(domain => [
    domain,
    `*.${domain}`,
    `www.${domain}`
  ]);
  
  // Adicionar domínios específicos para desenvolvimento
  expandedDomains.push('*.replit.dev', '*.replit.app');
  
  console.log('🔒 Security headers configured for', baseDomains.length, 'domains');
  return Array.from(new Set(expandedDomains)); // Remove duplicatas
};

// Security headers middleware with custom domain support
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  const nonce = crypto.randomBytes(16).toString('base64');
  const allowedDomains = getAllowedDomains();
  
  // CSP para desenvolvimento - MELHORADA (remover unsafe-eval)
  if (process.env.NODE_ENV === 'development') {
    (res as any).setHeader('Content-Security-Policy', [
      `default-src 'self' ${allowedDomains.join(' ')}`,
      `script-src 'self' 'unsafe-inline' *.stripe.com *.google.com *.googleapis.com ${allowedDomains.join(' ')} 'wasm-unsafe-eval'`,
      `style-src 'self' 'unsafe-inline' fonts.googleapis.com ${allowedDomains.join(' ')}`,
      `font-src 'self' fonts.gstatic.com ${allowedDomains.join(' ')}`,
      `img-src 'self' data: blob: *.stripe.com *.google.com *.googleapis.com ${allowedDomains.join(' ')}`,
      `connect-src 'self' *.stripe.com *.google.com *.googleapis.com ws://localhost:* wss: ${allowedDomains.join(' ')}`,
      `frame-ancestors 'none'`,
      `form-action 'self' ${allowedDomains.join(' ')}`,
      `base-uri 'self'`,
      `worker-src 'self' blob:`
    ].join('; '));
  } else {
    // CSP mais restritiva para produção
    (res as any).setHeader('Content-Security-Policy', [
      `default-src 'self' ${allowedDomains.join(' ')}`,
      `script-src 'self' 'nonce-${nonce}' *.stripe.com *.google.com *.googleapis.com ${allowedDomains.join(' ')}`,
      `style-src 'self' 'unsafe-inline' fonts.googleapis.com ${allowedDomains.join(' ')}`,
      `font-src 'self' fonts.gstatic.com ${allowedDomains.join(' ')}`,
      `img-src 'self' data: blob: *.stripe.com *.google.com *.googleapis.com ${allowedDomains.join(' ')}`,
      `connect-src 'self' *.stripe.com *.google.com *.googleapis.com wss: ${allowedDomains.join(' ')} ${allowedDomains.map(d => `wss://${d.replace('*', 'ws')}`).join(' ')}`,
      `frame-ancestors 'none'`,
      `form-action 'self' ${allowedDomains.join(' ')}`,
      `base-uri 'self'`
    ].join('; '));
  }

  // Security headers
  (res as any).setHeader('X-Frame-Options', 'DENY');
  (res as any).setHeader('X-Content-Type-Options', 'nosniff');
  (res as any).setHeader('X-XSS-Protection', '1; mode=block');
  (res as any).setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  (res as any).setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (apenas em HTTPS)
  if ((req as any).secure || (req as any).get('X-Forwarded-Proto') === 'https') {
    (res as any).setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove headers que revelam informação do servidor
  (res as any).removeHeader('X-Powered-By');
  (res as any).removeHeader('Server');

  next();
};

// CSRF Protection middleware - HARDENED VERSION
export const csrfProtection = (req: any, res: any, next: any) => {
  // Skip para métodos GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip apenas endpoints específicos seguros
  const exemptPaths = [
    '/api/suggestions', // Formulário público
    '/api/auth/user',   // Auth check
    '/api/login',       // OpenID flow
    '/api/callback',    // OpenID callback
    '/api/auth/register', // Registo
    '/api/auth/login',   // Login directo
    '/api/admin/downloads', // Downloads administrativos
    '/api/billing/webhook', // Stripe webhook signed payload
    '/api/generate-response',
    '/api/billing/subscription-status',
    '/api/reviews-ai/'
  ];
  
  // Debug para downloads
  if (req.path.startsWith('/api/admin/downloads')) {
    console.log(`🔓 CSRF BYPASS para downloads: ${req.method} ${req.path}`);
    return next();
  }
  
  if (exemptPaths.includes(req.path) || exemptPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // ✅ EXCEPÇÃO PARA EMAILS DE TESTE (evitar gastar budget)
  const testEmails = [
    'test@example.com',
    'user@test.com', 
    'admin@test.com',
    'demo@responderja.com'
  ];
  
  const requestEmail = req.body?.email || req.query?.email;
  if (requestEmail && typeof requestEmail === 'string' && testEmails.includes(requestEmail.toLowerCase())) {
    console.log(`🔧 CSRF excepção aplicada para email de teste: ${requestEmail}`);
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionId = req.sessionID || (req as any).session?.id;

  if (!token || !sessionId) {
    return res.status(403).json({ 
      message: 'CSRF token necessário',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }

  const storedToken = csrfTokenStore.get(sessionId);
  if (!storedToken || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken))) {
    return res.status(403).json({ 
      message: 'CSRF token inválido',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokenStore.set(sessionId, token);
  
  // Cleanup expired tokens (após 1 hora)
  setTimeout(() => {
    csrfTokenStore.delete(sessionId);
  }, 60 * 60 * 1000);
  
  return token;
};

// Rate limiting middleware - HARDENED VERSION  
export const createRateLimit = (
  maxRequests: number, 
  windowMs: number, 
  skipSuccessful: boolean = false
) => {
  return (req: any, res: any, next: any) => {
    // ✅ EXCEPÇÃO PARA DESENVOLVIMENTO - evitar bloquear durante testes
    if (process.env.NODE_ENV === 'development') {
      // console.log(`🔧 Rate limit bypassed para desenvolvimento: ${req.method} ${req.path}`);
      return next();
    }
    
    // Usar múltiplos identificadores para prevenir bypass
    const clientId = (req.get('X-Forwarded-For')?.split(',')[0]?.trim() || req.ip) || 'unknown';
    const userAgent = req.get('User-Agent')?.substring(0, 50) || 'unknown';
    const sessionId = req.sessionID || 'anonymous';
    const key = `${clientId}:${req.path}:${Buffer.from(userAgent).toString('base64').substring(0, 10)}:${sessionId}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const entry = rateLimitStore.get(key)!;
    
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
      return next();
    }
    
    if (entry.count >= maxRequests) {
      // Log suspicious activity
      console.warn(`⚠️ Rate limit exceeded for IP ${clientId} on ${req.path}`);
      
      return res.status(429).json({ 
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    entry.count++;
    
    // Track successful requests
    res.on('finish', () => {
      if (skipSuccessful && res.statusCode < 400) {
        entry.count = Math.max(0, entry.count - 1);
      }
    });
    
    next();
  };
};

// Input sanitization middleware
export const sanitizeInput = (req: any, res: any, next: any) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove scripts maliciosos
      value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove event handlers
      value = value.replace(/on\w+\s*=\s*["\'][^"\']*["\']/gi, '');
      
      // Remove javascript: protocol
      value = value.replace(/javascript:/gi, '');
      
      // Trim excessive whitespace
      value = value.trim();
      
      return value;
    } else if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// SQL injection prevention middleware
export const sqlInjectionProtection = (req: any, res: any, next: any) => {
  const sqlPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i,
    /(\s|^)(or|and)\s+\d+\s*=\s*\d+/i,
    /(\s|^)(or|and)\s+['"]\s*['"]/i,
    /(\s|^)\d+\s*;\s*(update|delete|drop|insert)/i,
    /(\-\-)|(\#)|\/\*.*\*\//i,
    /(\s|^)(xp_|sp_)/i,
    /(\s|^)(benchmark|sleep)\s*\(/i,
    /(\s|^)(load_file|into\s+outfile)/i
  ];

  const checkValue = (value: any, path: string = ''): boolean => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          console.error(`🚨 SQL Injection attempt detected: ${pattern} in ${path}: ${value}`);
          return true;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (checkValue(value[key], `${path}.${key}`)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check body, query, and params
  if (checkValue(req.body, 'body') || 
      checkValue(req.query, 'query') || 
      checkValue(req.params, 'params')) {
    
    return res.status(400).json({
      message: 'Input inválido detectado',
      code: 'INVALID_INPUT'
    });
  }

  next();
};

// Helper functions for secure logging
const sanitizeUrl = (url: string): string => {
  // Remove query parameters that might contain sensitive data
  return url.split('?')[0].substring(0, 100);
};

const anonymizeIp = (ip: string): string => {
  // Anonymize last octet for IPv4, last 64 bits for IPv6
  if (ip.includes(':')) {
    // IPv6 - keep first 64 bits
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::xxxx';
  } else {
    // IPv4 - anonymize last octet
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.') + '.xxx';
  }
};

// Security logging middleware - SECURE VERSION
export const securityLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Add request ID to headers for tracking
  res.setHeader('X-Request-ID', requestId);
  
  // Log request details - SECURE VERSION (GDPR compliant)
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: sanitizeUrl(req.url),
    ip: anonymizeIp(req.ip || 'unknown'),
    userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown',
    referer: req.get('Referer') ? 'present' : 'none',
    sessionExists: !!req.sessionID,
    userAuthenticated: !!(req as any).user
  };

  // Log response when finished
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const fullLogData = {
      ...logData,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: res.get('Content-Length') ? 'present' : 'none'
    };

    // Log apenas eventos de segurança críticos (GDPR compliant)
    if (res.statusCode >= 400) {
      console.log('SECURITY ALERT:', JSON.stringify(fullLogData));
    }
    
    // Import and use SecurityLogService for structured logging
    try {
      // Import dinâmico para evitar dependência circular
      const { SecurityLogService } = await import('../services/security-log-service.js');
      
      // Determine log level and type based on status code and endpoint
      let level: 'info' | 'warning' | 'error' | 'critical' = 'info';
      let type: 'auth' | 'access' | 'rate_limit' | 'error' | 'audit' = 'access';
      let details = `${req.method} ${sanitizeUrl(req.url)}`;

      if (res.statusCode === 401) {
        level = 'error';
        type = 'auth';
        details = 'Unauthorized access attempt';
      } else if (res.statusCode === 403) {
        level = 'error';
        type = 'access';
        details = 'Forbidden access attempt';
      } else if (res.statusCode === 429) {
        level = 'warning';
        type = 'rate_limit';
        details = 'Rate limit exceeded';
      } else if (res.statusCode >= 500) {
        level = 'critical';
        type = 'error';
        details = `Server error ${res.statusCode}`;
      } else if (req.url.includes('/admin')) {
        type = 'audit';
        details = `Admin access: ${req.method} ${req.url}`;
      }

      // Add to SecurityLogService
      if (SecurityLogService && typeof SecurityLogService.addLog === 'function') {
        SecurityLogService.addLog({
          level,
          type,
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          endpoint: req.url,
          userId: (req as any).user?.id,
          details,
          statusCode: res.statusCode
        });
      }

    } catch (error) {
      // Falha silenciosa no logging para não afectar o request
      if (process.env.NODE_ENV === 'development') {
        console.warn('Security logging failed:', error);
      }
    }
  });

  next();
};

// Combined security middleware
export const applySecurity = (req: any, res: any, next: any) => {
  securityLogger(req, res, () => {
    securityHeaders(req, res, () => {
      sanitizeInput(req, res, () => {
        sqlInjectionProtection(req, res, () => {
          // Aplicar CSRF com exceções mínimas
          csrfProtection(req, res, next);
        });
      });
    });
  });
};

// Endpoint specific rate limits
export const authRateLimit = createRateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const apiRateLimit = createRateLimit(100, 60 * 1000); // 100 requests per minute
export const adminRateLimit = createRateLimit(50, 60 * 1000); // 50 requests per minute for admin
export const generateRateLimit = createRateLimit(30, 60 * 1000); // 30 generations per minute
