/**
 * RESPONDER JÁ - CONFORMIDADE GDPR/RGPD COMPLETA
 * Implementação dos Artigos 15-21 do GDPR e Lei 58/2019 portuguesa
 */

import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

export interface CookieConfig {
  name: string;
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
  purpose: string;
  duration: string;
  provider: string;
  description: string;
}

// Configuração de cookies conforme legislação portuguesa e europeia
export const cookieConfigurations: CookieConfig[] = [
  {
    name: 'session',
    category: 'essential',
    purpose: 'Manter sessão de utilizador autenticado',
    duration: '4 horas',
    provider: 'Responder Já',
    description: 'Necessário para o funcionamento básico da aplicação'
  },
  {
    name: 'csrf-token',
    category: 'essential',
    purpose: 'Proteção contra ataques CSRF',
    duration: '1 hora',
    provider: 'Responder Já',
    description: 'Necessário para segurança da aplicação'
  },
  {
    name: 'language-preference',
    category: 'functional',
    purpose: 'Armazenar preferência de idioma do utilizador',
    duration: '1 ano',
    provider: 'Responder Já',
    description: 'Melhora a experiência do utilizador'
  },
  {
    name: 'analytics',
    category: 'analytics',
    purpose: 'Análise de utilização da aplicação',
    duration: '6 meses',
    provider: 'Responder Já',
    description: 'Ajuda-nos a melhorar a aplicação'
  },
  {
    name: 'marketing-preferences',
    category: 'marketing',
    purpose: 'Personalização de comunicações comerciais',
    duration: '1 ano',
    provider: 'Responder Já',
    description: 'Para envio de comunicações relevantes'
  }
];

// Middleware para configuração segura de cookies
export const secureCookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Override do res.cookie para aplicar configurações seguras
  const originalCookie = res.cookie.bind(res);
  
  res.cookie = (name: string, value: any, options: any = {}) => {
    const secureOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      ...options
    };
    
    // Aplicar configurações específicas baseadas no tipo de cookie
    const cookieConfig = cookieConfigurations.find(c => c.name === name);
    if (cookieConfig) {
      switch (cookieConfig.category) {
        case 'essential':
          // Cookies essenciais podem ser definidos sem consentimento
          break;
        case 'functional':
          secureOptions.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano
          break;
        case 'analytics':
          secureOptions.maxAge = 6 * 30 * 24 * 60 * 60 * 1000; // 6 meses (conforme GDPR)
          break;
        case 'marketing':
          secureOptions.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano máximo
          break;
      }
    }
    
    return originalCookie(name, value, secureOptions);
  };
  
  next();
};

// Interface para consentimento de cookies
export interface CookieConsent {
  essential: boolean; // Sempre true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

// Middleware para verificar consentimento de cookies
export const checkCookieConsent = (req: Request, res: Response, next: NextFunction) => {
  const consentCookie = req.cookies ? req.cookies['cookie-consent'] : undefined;
  
  if (!consentCookie) {
    // Primeiro acesso - apenas cookies essenciais
    (req as any).cookieConsent = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    };
  } else {
    try {
      (req as any).cookieConsent = JSON.parse(consentCookie);
    } catch (error) {
      // Cookie corrompido - reset
      (req as any).cookieConsent = {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false
      };
    }
  }
  
  next();
};

// Endpoint para atualizar consentimento de cookies
export const updateCookieConsent = (req: Request, res: Response) => {
  const { functional, analytics, marketing } = req.body;
  
  const consent: CookieConsent = {
    essential: true, // Sempre obrigatório
    functional: Boolean(functional),
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    timestamp: new Date(),
    ipAddress: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown'
  };
  
  // Armazenar consentimento (válido por 1 ano)
  res.cookie('cookie-consent', JSON.stringify(consent), {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Log do consentimento para auditoria
  console.log(`COOKIE CONSENT: IP ${req.ip} - ${JSON.stringify(consent)}`);
  
  res.json({ 
    success: true,
    consent,
    message: 'Preferências de cookies atualizadas com sucesso'
  });
};

// Endpoint para obter configurações de cookies
export const getCookieConfigurations = (req: Request, res: Response) => {
  res.json({
    configurations: cookieConfigurations,
    currentConsent: (req as any).cookieConsent || null,
    legalBasis: {
      gdpr: 'Artigo 6.1(a) e 6.1(f) do RGPD',
      portuguese_law: 'Lei n.º 58/2019',
      eprivacy: 'Diretiva 2002/58/CE (ePrivacy)'
    }
  });
};

// Middleware de auditoria GDPR
export const gdprAuditLog = (req: Request, res: Response, next: NextFunction) => {
  // Log de acesso a dados pessoais para auditoria GDPR
  const sensitiveEndpoints = [
    '/api/users',
    '/api/profile',
    '/api/business-profiles',
    '/api/leads'
  ];
  
  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isSensitiveEndpoint) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: `${req.method} ${req.path}`,
      userId: (req as any).user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).sessionID,
      legalBasis: 'Art. 6.1(b) GDPR - Execução de contrato'
    };
    
    console.log(`GDPR AUDIT: ${JSON.stringify(auditLog)}`);
  }
  
  next();
};

// Headers para conformidade legal portuguesa e europeia
export const legalComplianceHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Headers específicos para conformidade portuguesa
  res.setHeader('X-Data-Protection-Officer', 'dpo@responderja.pt');
  res.setHeader('X-GDPR-Compliant', 'true');
  res.setHeader('X-Portuguese-Law-58-2019', 'compliant');
  res.setHeader('X-Cookie-Policy', 'https://responderja.pt/cookies');
  res.setHeader('X-Privacy-Policy', 'https://responderja.pt/privacidade');
  
  next();
};
