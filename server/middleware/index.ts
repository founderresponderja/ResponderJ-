/**
 * Middleware - Export central
 * 
 * Exporta todos os middlewares organizados por funcionalidade.
 */

// Auth Middleware
export {
  requireAuth,
  isAdminMiddleware,
  isSuperAdminMiddleware,
  isAgencyOwnerMiddleware
} from './auth';

// Security Middleware
export {
  applySecurity,
  authRateLimit,
  apiRateLimit,
  adminRateLimit,
  generateRateLimit,
  securityHeaders,
  csrfProtection
} from './security';

// CSRF Protection
export {
  protectCSRF,
  getCSRFToken,
  addCSRFToken
} from './csrf';

// Database Protection
export { protectDatabaseQueries } from './sql-injection-protection';

// GDPR Compliance
export {
  secureCookieMiddleware,
  checkCookieConsent,
  updateCookieConsent,
  getCookieConfigurations,
  gdprAuditLog,
  legalComplianceHeaders
} from './gdpr-compliance';

// Error Handling
export {
  globalErrorHandler,
  requestIdMiddleware,
  requestLoggerMiddleware,
  asyncHandler,
  notFoundHandler,
  validateSchema,
  AppError
} from './errorHandler';

// Trial Rate Limiting
export { trialRateLimit } from './trial-rate-limiting';

// Advanced Security
export { AdvancedThreatDetector } from './advanced-threat-detection';
export { GDPREnhancedCompliance } from './gdpr-enhanced-compliance';