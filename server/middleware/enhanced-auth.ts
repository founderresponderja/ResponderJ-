/**
 * 🔒 MIDDLEWARE DE AUTENTICAÇÃO APRIMORADO
 * Sistema de autenticação robusto com logging e validação
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityLogService } from '../services/security-log-service';

/**
 * 🛡️ Middleware de autenticação com logging de segurança
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const endpoint = req.path;
  const userAgent = req.get('User-Agent') || 'unknown';
  const ip = req.ip || 'unknown';

  // Check if authenticated (casting to any to avoid TS issues if passport types are missing)
  if (!(req as any).isAuthenticated || !(req as any).isAuthenticated()) {
    SecurityLogService.addLog({
      level: 'warning',
      type: 'auth',
      ip,
      userAgent,
      endpoint,
      details: 'Tentativa de acesso não autenticado'
    });

    return res.status(401).json({ 
      message: "Autenticação necessária",
      code: "AUTH_REQUIRED"
    });
  }

  if (!req.user) {
    SecurityLogService.addLog({
      level: 'warning',
      type: 'auth',
      ip,
      userAgent,
      endpoint,
      details: 'Sessão inválida - utilizador não encontrado'
    });

    return res.status(401).json({ 
      message: "Sessão inválida",
      code: "INVALID_SESSION"
    });
  }

  // Log acesso bem-sucedido (apenas para endpoints sensíveis)
  if (endpoint.includes('/admin') || endpoint.includes('/api/users')) {
    SecurityLogService.addLog({
      level: 'info',
      type: 'auth',
      ip,
      userAgent,
      endpoint,
      details: `Acesso autorizado por utilizador: ${req.user.email}`,
      userId: req.user.id
    });
  }

  next();
};

/**
 * 👑 Middleware para verificar permissões de administrador
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
    SecurityLogService.addLog({
      level: 'warning',
      type: 'auth',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path,
      details: `Tentativa de acesso admin não autorizada por: ${req.user?.email}`,
      userId: req.user?.id
    });

    return res.status(403).json({ 
      message: "Permissões de administrador necessárias",
      code: "ADMIN_REQUIRED"
    });
  }

  next();
};

/**
 * ⚡ Middleware para verificar permissões de super administrador
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    SecurityLogService.addLog({
      level: 'critical',
      type: 'auth',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path,
      details: `Tentativa de acesso super admin não autorizada por: ${req.user?.email}`,
      userId: req.user?.id
    });

    return res.status(403).json({ 
      message: "Permissões de super administrador necessárias",
      code: "SUPER_ADMIN_REQUIRED"
    });
  }

  next();
};

/**
 * 💎 Middleware para verificar planos premium
 */
export const requirePremium = (req: Request, res: Response, next: NextFunction) => {
  const premiumPlans = ['pro', 'enterprise', 'premium_trial'];
  
  if (!req.user?.selectedPlan || !premiumPlans.includes(req.user.selectedPlan)) {
    return res.status(403).json({ 
      message: "Plano premium necessário para esta funcionalidade",
      code: "PREMIUM_REQUIRED",
      upgradeUrl: "/billing"
    });
  }

  next();
};

/**
 * 🔄 Helper para validar token CSRF em requests específicas
 */
export const validateCSRF = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    if (!token) {
      return res.status(403).json({ 
        message: "Token CSRF necessário",
        code: "CSRF_TOKEN_REQUIRED"
      });
    }
  }
  
  next();
};