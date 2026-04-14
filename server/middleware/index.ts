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
} from './auth.js';

// Security Middleware
export {
  applySecurity,
  authRateLimit,
  apiRateLimit,
  adminRateLimit,
  generateRateLimit,
  securityHeaders,
  csrfProtection
} from './security.js';

// CSRF Protection
export {
  protectCSRF,
  getCSRFToken,
  addCSRFToken
} from './csrf.js';

// Database Protection
export { protectDatabaseQueries } from './sql-injection-protection.js';

// GDPR Compliance
export {
  secureCookieMiddleware,
  checkCookieConsent,
  updateCookieConsent,
  getCookieConfigurations,
  gdprAuditLog,
  legalComplianceHeaders
} from './gdpr-compliance.js';

// Error Handling
export {
  globalErrorHandler,
  requestIdMiddleware,
  requestLoggerMiddleware,
  asyncHandler,
  notFoundHandler,
  validateSchema,
  AppError
} from './errorHandler.js';

// Trial Rate Limiting
export { trialRateLimit } from './trial-rate-limiting.js';

// Advanced Security
export { AdvancedThreatDetector } from './advanced-threat-detection.js';
export { GDPREnhancedCompliance } from './gdpr-enhanced-compliance.js';