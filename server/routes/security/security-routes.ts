
import type { Express } from "express";
import { requireAuth, requireAdmin } from "../../auth";
import { adminRateLimit } from "../../middleware/security";
import { SecurityAuditService } from "../../services/security-audit-service";

/**
 * Configuração de rotas de segurança e auditoria
 * 
 * Inclui auditoria de segurança, métricas, logs e health checks.
 * Todas as rotas requerem permissões de administrador.
 */
export function setupSecurityRoutes(app: any): void {
  console.log('🔒 Configurando rotas de segurança...');

  // Headers de segurança básicos
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  });

  // Auditoria de Segurança - rotas protegidas
  app.post("/api/admin/security/audit", requireAuth, requireAdmin, adminRateLimit, async (req: any, res: any) => {
    try {
      console.log('🔍 Iniciando auditoria de segurança solicitada por admin:', req.user?.id);
      
      const audit = await SecurityAuditService.performFullAudit();
      
      console.log(`📊 Auditoria concluída - Score: ${audit.score}/100, Status: ${audit.overallStatus}`);
      
      if (audit.criticalIssues.length > 0) {
        console.warn(`⚠️ ${audit.criticalIssues.length} issues críticas detectadas!`);
      }
      
      res.json(audit);
    } catch (error) {
      console.error('❌ Erro na auditoria de segurança:', error);
      res.status(500).json({ 
        message: "Erro interno na auditoria de segurança",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  app.get("/api/admin/security/audit", requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const audit = await SecurityAuditService.performFullAudit();
      res.json(audit);
    } catch (error) {
      console.error('❌ Erro ao obter auditoria:', error);
      res.status(500).json({ message: "Erro ao obter dados de auditoria" });
    }
  });

  app.get("/api/admin/security/report", requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const audit = await SecurityAuditService.performFullAudit();
      const report = SecurityAuditService.generateAuditReport(audit);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="security-audit-${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(report);
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      res.status(500).json({ message: "Erro ao gerar relatório de segurança" });
    }
  });

  // Security health check endpoint
  app.get("/api/security/health", requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const quickCheck = {
        timestamp: new Date().toISOString(),
        encryptionKey: !!process.env.ENCRYPTION_KEY,
        sessionSecret: !!process.env.SESSION_SECRET,
        database: !!process.env.DATABASE_URL,
        criticalServices: {
          openai: !!process.env.OPENAI_API_KEY,
          stripe: !!process.env.STRIPE_SECRET_KEY,
          sendgrid: !!process.env.SENDGRID_API_KEY,
        }
      };
      
      const overallHealth = Object.values(quickCheck.criticalServices).every(Boolean) && 
                           quickCheck.encryptionKey && 
                           quickCheck.sessionSecret && 
                           quickCheck.database;
      
      res.json({
        status: overallHealth ? 'healthy' : 'warning',
        details: quickCheck
      });
    } catch (error) {
      console.error('❌ Erro no health check:', error);
      res.status(500).json({ message: "Erro no health check de segurança" });
    }
  });

  // Métricas de segurança
  app.get("/api/admin/security/metrics", requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
       // Assuming SecurityMetricsService exists or we mock it for now as it wasn't explicitly requested to change
       // But based on provided files, it exists in server/services/security-metrics-service.ts
       // However I don't want to add imports if not necessary.
       // The original file had a comment "// Métricas de segurança". I'll leave it empty or simple mock to match current state unless I should implement it.
       // The prompt only asked to "Create app... Security Audit Service". I implemented that service.
       // I'll leave this route placeholder if it was empty, or implement basic return.
       
       res.json({ status: "metrics endpoint placeholder" });
    } catch (error) {
       res.status(500).json({ message: "Error fetching metrics" });
    }
  });
  
  app.get("/api/admin/security/logs", requireAuth, requireAdmin, async (req: any, res: any) => {
      // Placeholder for logs
      res.json({ logs: [] });
  });
}
