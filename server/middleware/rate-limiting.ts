/**
 * Rate Limiting Middleware - Implementação Crítica de Segurança
 * Previne ataques de força bruta e abuso de APIs
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import process from 'process';

// Rate limiting para autenticação (mais restritivo)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // TEMPORÁRIO: Aumentado para 20 tentativas para resolução de problemas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Permitir em desenvolvimento local OU IPs internos do Replit
    return process.env.NODE_ENV === 'development' || 
           req.ip === '127.0.0.1' || 
           (req.ip && req.ip.startsWith('10.')) ||
           (req.ip && req.ip.startsWith('192.168.')) ||
           (req.ip && req.ip.startsWith('172.'));
  },
  handler: (req: any, res: any) => {
    console.log(`🚨 AUTH RATE LIMIT: IP ${req.ip} excedeu limite de login`);
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(15 * 60) // segundos
    });
  }
});

// Rate limiting para APIs gerais
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto  
  max: 100, // Máximo 100 requisições por minuto
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Permitir em desenvolvimento local
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  },
  handler: (req: any, res: any) => {
    console.log(`⚠️ API RATE LIMIT: IP ${req.ip} excedeu limite geral`);
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente em 1 minuto.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: 60 // segundos
    });
  }
});

// Rate limiting para admin (muito restritivo)
export const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // Máximo 20 requisições por 5 minutos
  message: {
    error: 'Muitas requisições admin. Tente novamente em 5 minutos.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Permitir em desenvolvimento local
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  },
  handler: (req: any, res: any) => {
    console.log(`🔥 ADMIN RATE LIMIT: IP ${req.ip} excedeu limite admin`);
    res.status(429).json({
      error: 'Muitas requisições admin. Tente novamente em 5 minutos.',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(5 * 60) // segundos
    });
  }
});

// Rate limiting para contacto (previne spam)
export const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 mensagens por hora
  message: {
    error: 'Muitas mensagens de contacto. Tente novamente em 1 hora.',
    code: 'CONTACT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res: any) => {
    console.log(`📧 CONTACT RATE LIMIT: IP ${req.ip} excedeu limite de contacto`);
    res.status(429).json({
      error: 'Muitas mensagens de contacto. Tente novamente em 1 hora.',
      code: 'CONTACT_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(60 * 60) // segundos
    });
  }
});

// Rate limiting específico para uploads (previne abuso de storage)
export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // Máximo 5 uploads por 10 minutos
  message: {
    error: 'Muitos uploads. Tente novamente em 10 minutos.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res: any) => {
    console.log(`📤 UPLOAD RATE LIMIT: IP ${req.ip} excedeu limite de upload`);
    res.status(429).json({
      error: 'Muitos uploads. Tente novamente em 10 minutos.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(10 * 60) // segundos
    });
  }
});

// Middleware inteligente que aplica diferentes rate limits baseado na rota
export const smartRateLimit = (req: any, res: any, next: any) => {
  const path = req.path.toLowerCase();
  
  // Rate limits específicos por tipo de rota
  if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) {
    return (authRateLimit as any)(req, res, next);
  }
  
  if (path.includes('/admin')) {
    return (adminRateLimit as any)(req, res, next);
  }
  
  if (path.includes('/contact') || path.includes('/suggestions')) {
    return (contactRateLimit as any)(req, res, next);
  }
  
  if (path.includes('/upload') || path.includes('/files')) {
    return (uploadRateLimit as any)(req, res, next);
  }
  
  // Rate limit geral para outras APIs
  if (path.startsWith('/api/')) {
    return (apiRateLimit as any)(req, res, next);
  }
  
  // Sem rate limit para recursos estáticos
  next();
};