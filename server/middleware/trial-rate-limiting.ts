import { Request, Response, NextFunction } from 'express';

// Cache para rate limiting de trial (1 crédito/30s)
const trialRateCache = new Map<string, number>();

export function trialRateLimit(req: any, res: any, next: any) {
  const user = req.user;
  
  // Se não há usuário ou não está em trial, prosseguir normalmente
  // Verifica selectedPlan ou subscriptionPlan (compatibilidade)
  const plan = user?.selectedPlan || (user as any)?.subscriptionPlan;

  if (!user || !user.id || plan !== 'trial') {
    return next();
  }

  const userId = user.id;
  const now = Date.now();
  const lastUsage = trialRateCache.get(userId);

  // Se é a primeira vez ou passou mais de 30 segundos
  if (!lastUsage || now - lastUsage >= 30000) {
    trialRateCache.set(userId, now);
    return next();
  }

  // Rate limit atingido
  const remainingTime = Math.ceil((30000 - (now - lastUsage)) / 1000);
  return res.status(429).json({
    error: 'Rate limit atingido',
    message: `Aguarde ${remainingTime} segundos antes de gerar outra resposta (limitação de trial: 1 crédito/30s)`,
    remainingTime,
    retryAfter: remainingTime
  });
}

// Limpar cache antigo periodicamente (entradas > 1 hora)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  const entriesToDelete: string[] = [];
  
  trialRateCache.forEach((timestamp, userId) => {
    if (timestamp < oneHourAgo) {
      entriesToDelete.push(userId);
    }
  });
  
  entriesToDelete.forEach(userId => trialRateCache.delete(userId));
}, 300000); // Limpar a cada 5 minutos