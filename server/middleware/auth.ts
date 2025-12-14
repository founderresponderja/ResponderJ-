// =====================================
// RESPONDER JÁ - MIDDLEWARE DE AUTENTICAÇÃO
// =====================================
// Middleware para verificação de autenticação e autorização
// =====================================

import type { Request, Response, NextFunction } from "express";

// Middleware para verificar se o utilizador está autenticado
export function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  next();
}

// Middleware para verificar se o utilizador é administrador
export function isAdminMiddleware(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  
  if (!req.user.isAdmin && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  
  next();
}

// Middleware para verificar se o utilizador é super administrador
export function isSuperAdminMiddleware(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas super administradores.' });
  }
  
  next();
}

// Middleware para verificar se o utilizador é proprietário da agência
export function isAgencyOwnerMiddleware(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  
  if (!req.user.isAgencyOwner && !req.user.isAdmin && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas proprietários de agência.' });
  }
  
  next();
}