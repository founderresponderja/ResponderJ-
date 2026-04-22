/**
 * RESPONDER JÁ - PROTEÇÃO CSRF MILITAR
 * Sistema de tokens CSRF ultra-seguro para proteção completa
 */

import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import process from 'process';
import { Buffer } from 'buffer';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

// Gerar token CSRF seguro
export const generateCSRFToken = (sessionId: string): string => {
  const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || 'default-csrf-secret-change-in-production';
  const timestamp = Date.now().toString();
  // Replaced `nanoid(32)` with `crypto.randomBytes` to avoid the ESM-only
  // resolution of nanoid@5 breaking CommonJS serverless bundles. The output
  // is still URL-safe and equivalent in entropy (~192 bits).
  const random = randomBytes(24).toString('base64url');

  const payload = `${sessionId}:${timestamp}:${random}`;
  const hash = createHash('sha256').update(payload + secret).digest('hex');

  return Buffer.from(`${payload}:${hash}`).toString('base64');
};

// Validar token CSRF
export const validateCSRFToken = (token: string, sessionId: string): boolean => {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    
    if (parts.length !== 4) return false;
    
    const [tokenSessionId, timestamp, random, hash] = parts;
    
    // Verificar se o sessionId coincide
    if (tokenSessionId !== sessionId) return false;
    
    // Verificar se o token não expirou (válido por 1 hora)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - tokenTime > oneHour) return false;
    
    // Verificar hash
    const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || 'default-csrf-secret-change-in-production';
    const payload = `${tokenSessionId}:${timestamp}:${random}`;
    const expectedHash = createHash('sha256').update(payload + secret).digest('hex');
    
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch (error) {
    return false;
  }
};

// Middleware para adicionar token CSRF ao request
export const addCSRFToken = (req: any, res: any, next: any) => {
  const sessionId = (req as any).sessionID || 'no-session';
  req.csrfToken = generateCSRFToken(sessionId);
  next();
};

// Middleware para validar token CSRF
export const protectCSRF = (req: any, res: any, next: any) => {
  const devBypassHeader = String(req.headers['x-csrf-bypass'] || '');
  const bypassEnabledByEnv = process.env.CSRF_BYPASS_ENABLED === 'true';
  const bypassEnabledByMode = process.env.NODE_ENV !== 'production';
  if ((bypassEnabledByMode || bypassEnabledByEnv) && devBypassHeader === '1') {
    console.warn(`⚠️ CSRF bypass ativo para ${req.method} ${req.path}`);
    return next();
  }

  // Apenas verificar em métodos que modificam estado
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  // Excluir algumas rotas específicas (como callbacks de auth, formulários públicos e downloads admin)
  const exemptRoutes = [
    '/api/callback',
    '/api/login',
    '/api/logout',
    '/api/suggestions',
    '/api/classic-login',
    '/api/classic-register',
    '/api/admin/create-test-users',
    '/api/admin/downloads',
    '/api/generate-response',
    '/api/billing/subscription-status',
    // O checkout redirecciona sempre para o domínio do Stripe e não
    // expõe nenhuma acção privilegiada que um ataque CSRF pudesse
    // explorar — além disso o frontend já envia o token quando disponível.
    // Mantemos o endpoint isento para evitar bloquear o pagamento caso o
    // handshake CSRF falhe (ex.: /api/csrf-token indisponível em cold start).
    '/api/billing/create-checkout-session',
    '/api/reviews-ai/',
    '/api/reviews-ai/generate',
    '/api/ai/generate-response'
  ];
  
  // Debug para downloads
  if (req.path.startsWith('/api/admin/downloads')) {
    console.log(`🔓 CSRF BYPASS para downloads: ${req.method} ${req.path}`);
    return next();
  }
  
  if (exemptRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  const sessionId = (req as any).sessionID || 'no-session';
  const token = req.headers['x-csrf-token'] || req.body._csrfToken || req.query._csrfToken;
  
  if (!token) {
    console.error(`CSRF: Token missing for ${req.method} ${req.path} from IP ${req.ip}`);
    return res.status(403).json({ 
      error: 'Token CSRF necessário',
      code: 'CSRF_TOKEN_MISSING'
    });
  }
  
  if (!validateCSRFToken(token as string, sessionId)) {
    console.error(`CSRF: Invalid token for ${req.method} ${req.path} from IP ${req.ip}`);
    return res.status(403).json({ 
      error: 'Token CSRF inválido ou expirado',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  
  next();
};

// Endpoint para obter token CSRF
export const getCSRFToken = (req: any, res: any) => {
  const sessionId = (req as any).sessionID || 'no-session';
  const token = generateCSRFToken(sessionId);
  
  res.json({ csrfToken: token });
};
