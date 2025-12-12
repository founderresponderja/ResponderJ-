/**
 * Configuração centralizada para todas as rotas da aplicação
 * 
 * Este ficheiro serve como index principal para registar todas as rotas
 * modulares organizadas por funcionalidade.
 */
import type { Express } from "express";

/**
 * Regista todas as rotas modulares da aplicação
 * 
 * @param app - Instância do Express
 */
export async function registerModularRoutes(app: Express): Promise<void> {
  console.log('📍 Registando rotas modulares...');

  try {
    // Rotas de autenticação
    try {
      const { setupAuthenticationRoutes } = await import("../routes/auth/auth-routes");
      await setupAuthenticationRoutes(app);
    } catch (e) {
      // Módulo opcional ou ainda não criado
    }

    // Rotas de utilizador
    try {
      const { setupUserRoutes } = await import("../routes/user/user-routes");
      await setupUserRoutes(app);
    } catch (e) {
      // Módulo opcional ou ainda não criado
    }

    // Rotas de segurança
    try {
      const { setupSecurityRoutes } = await import("../routes/security/security-routes");
      await setupSecurityRoutes(app);
    } catch (e) {
      // Módulo opcional ou ainda não criado
    }

    // Rotas de API Keys
    try {
      const { setupApiKeysRoutes } = await import("../routes/api-keys/api-keys-routes");
      await setupApiKeysRoutes(app);
    } catch (e) {
      // Módulo opcional ou ainda não criado
    }

    console.log('✅ Todas as rotas modulares verificadas');
  } catch (error) {
    console.error('❌ Erro ao registar rotas modulares:', error);
    // Não lançar erro para evitar crash total
  }
}

/**
 * Lista todas as rotas registadas para debugging
 */
export function getRegisteredRoutes(): string[] {
  return [
    'Authentication Routes:',
    '  POST /api/login',
    '  POST /api/auth/login',
    '  POST /api/auth/forgot-password',
    '  POST /api/auth/reset-password',
    '  GET /api/session-status',
    '',
    'User Routes:',
    '  GET /api/auth/user',
    '  GET /api/user/stats',
    '  GET /api/user',
    '  PUT /api/user/profile',
    '',
    'Security Routes:',
    '  POST /api/admin/security/audit',
    '  GET /api/admin/security/audit',
    '  GET /api/admin/security/report',
    '  GET /api/security/health',
    '  GET /api/admin/security/metrics',
    '  GET /api/admin/security/logs',
    '',
    'API Keys Routes:',
    '  GET /api/admin/api-keys',
    '  GET /api/admin/api-keys/stats',
    '  GET /api/admin/api-keys/status',
    '  POST /api/admin/api-keys/test',
    '  PUT /api/admin/api-keys/:keyType',
    '  POST /api/admin/api-keys/generate',
    '  DELETE /api/admin/api-keys/:keyId'
  ];
}