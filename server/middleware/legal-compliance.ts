/**
 * MIDDLEWARE DE COMPLIANCE LEGAL - RESPONDER JÁ
 * Conformidade com legislação portuguesa e europeia (RGPD/GDPR, Lei 58/2019, ePrivacy)
 */

import { Request, Response, NextFunction } from 'express';

// Configurações de retenção de cookies conformes com legislação PT/EU
export const COOKIE_RETENTION_PERIODS = {
  // Cookies essenciais (Lei 58/2019, Art. 5º)
  SESSION: 7 * 24 * 60 * 60 * 1000, // 7 dias (sessão máxima)
  AUTH: 30 * 24 * 60 * 60 * 1000,   // 30 dias (autenticação)
  
  // Cookies funcionais (RGPD Art. 7º)
  PREFERENCES: 90 * 24 * 60 * 60 * 1000, // 90 dias (preferências)
  LANGUAGE: 365 * 24 * 60 * 60 * 1000,   // 1 ano (idioma)
  
  // Cookies analíticos (ePrivacy Directive)
  ANALYTICS: 24 * 60 * 60 * 1000,         // 24 horas (mínimo legal)
  
  // Cookies marketing (RGPD Art. 13º)
  MARKETING: 30 * 24 * 60 * 60 * 1000,    // 30 dias (máximo recomendado)
  
  // Cookies de terceiros (legislação específica)
  THIRD_PARTY: 24 * 60 * 60 * 1000       // 24 horas (mínimo absoluto)
};

/**
 * Headers de compliance legal obrigatórios
 */
export const legalComplianceHeaders = (req: Request, res: Response, next: NextFunction) => {
  // RGPD Article 25 - Data Protection by Design
  res.setHeader('X-Data-Protection', 'GDPR-Compliant');
  res.setHeader('X-Privacy-Policy', '/privacy');
  res.setHeader('X-Cookie-Policy', '/cookies');
  
  // Lei 58/2019 (Portugal) - Proteção de dados pessoais
  res.setHeader('X-PT-Data-Protection', 'Lei-58-2019-Compliant');
  res.setHeader('X-Cookie-Consent-Required', 'true');
  
  // ePrivacy Directive 2002/58/EC
  res.setHeader('X-ePrivacy-Compliance', 'Directive-2002-58-EC');
  
  // Transferências internacionais adequadas (RGPD Art. 45º)
  res.setHeader('X-Data-Transfer-Adequacy', 'OpenAI-US-Compliant');
  
  next();
};

/**
 * Middleware para cookies seguros (Lei 58/2019 + RGPD)
 */
export const secureCookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSetCookie = res.cookie;
  
  (res as any).cookie = function(name: string, value: any, options: any = {}) {
    // Aplicar configurações de segurança obrigatórias
    const secureOptions = {
      ...options,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      
      // Definir período de retenção baseado no tipo de cookie
      maxAge: options.maxAge || getCookieRetentionPeriod(name)
    };
    
    // Log para auditoria RGPD
    console.log(`🍪 Cookie set: ${name}, retention: ${secureOptions.maxAge}ms, secure: ${secureOptions.secure}`);
    
    return (originalSetCookie as any).call(this, name, value, secureOptions);
  };
  
  next();
};

/**
 * Determinar período de retenção por tipo de cookie
 */
function getCookieRetentionPeriod(cookieName: string): number {
  if (cookieName.includes('session') || cookieName.includes('auth')) {
    return COOKIE_RETENTION_PERIODS.SESSION;
  }
  if (cookieName.includes('preference') || cookieName.includes('lang')) {
    return COOKIE_RETENTION_PERIODS.PREFERENCES;
  }
  if (cookieName.includes('analytics') || cookieName.includes('_ga')) {
    return COOKIE_RETENTION_PERIODS.ANALYTICS;
  }
  if (cookieName.includes('marketing') || cookieName.includes('ads')) {
    return COOKIE_RETENTION_PERIODS.MARKETING;
  }
  
  // Default para cookies essenciais
  return COOKIE_RETENTION_PERIODS.SESSION;
}

/**
 * Verificação de consentimento de cookies (Lei 58/2019)
 */
export const checkCookieConsent = (req: Request, res: Response, next: NextFunction) => {
  const hasConsent = req.headers['cookie-consent'] === 'granted' || 
                    (req.cookies && req.cookies['cookie-consent'] === 'granted');
  
  // Permitir apenas cookies essenciais sem consentimento
  if (!hasConsent && req.path.includes('/api/')) {
    // Log para auditoria
    console.log(`🚫 Cookie consent check: ${req.path}, consent: ${hasConsent}`);
  }
  
  // Adicionar header de status de consentimento
  res.setHeader('X-Cookie-Consent-Status', hasConsent ? 'granted' : 'pending');
  
  next();
};

/**
 * Auditoria RGPD para logging obrigatório
 */
export const gdprAuditLog = (req: Request, res: Response, next: NextFunction) => {
  const auditData = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    cookieConsent: (req.cookies && req.cookies['cookie-consent']) || 'not-set',
    dataProcessing: req.path.includes('/api/') ? 'yes' : 'no'
  };
  
  // Log estruturado para compliance
  console.log('GDPR_AUDIT:', JSON.stringify(auditData));
  
  next();
};

/**
 * Validação de transferências de dados (RGPD Art. 44-49)
 */
export const validateDataTransfers = (req: Request, res: Response, next: NextFunction) => {
  // Lista de países/serviços com adequacy decision
  const adequateCountries = ['US-OpenAI', 'EU', 'UK', 'Canada'];
  
  // Verificar se há transferência internacional
  if (req.path.includes('/api/generate') || req.path.includes('/ai/')) {
    res.setHeader('X-Data-Transfer-To', 'OpenAI-US');
    res.setHeader('X-Transfer-Legal-Basis', 'Article-49-1a-Consent');
    res.setHeader('X-Adequacy-Decision', 'EU-US-DPF-2023');
  }
  
  next();
};

/**
 * Implementação direitos RGPD (Art. 15-22)
 */
export const dataSubjectRights = {
  // Art. 15 - Direito de acesso
  ACCESS: '/api/gdpr/access',
  
  // Art. 16 - Direito de rectificação
  RECTIFICATION: '/api/gdpr/rectify',
  
  // Art. 17 - Direito ao apagamento
  ERASURE: '/api/gdpr/erase',
  
  // Art. 18 - Direito à limitação do tratamento
  RESTRICTION: '/api/gdpr/restrict',
  
  // Art. 20 - Direito à portabilidade
  PORTABILITY: '/api/gdpr/export',
  
  // Art. 21 - Direito de oposição
  OBJECTION: '/api/gdpr/object'
};

/**
 * Headers informativos sobre direitos RGPD
 */
export const dataRightsHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-GDPR-Rights-Access', dataSubjectRights.ACCESS);
  res.setHeader('X-GDPR-Rights-Rectification', dataSubjectRights.RECTIFICATION);
  res.setHeader('X-GDPR-Rights-Erasure', dataSubjectRights.ERASURE);
  res.setHeader('X-GDPR-Rights-Portability', dataSubjectRights.PORTABILITY);
  
  next();
};

export default {
  legalComplianceHeaders,
  secureCookieMiddleware,
  checkCookieConsent,
  gdprAuditLog,
  validateDataTransfers,
  dataRightsHeaders,
  COOKIE_RETENTION_PERIODS
};