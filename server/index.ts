
import express, { type Request, Response, NextFunction, type RequestHandler } from "express";
import { createServer } from "http";
import { registerRoutes, setupAuthRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Middlewares de Segurança e Compliance
import { securityHeaders, csrfProtection } from "./middleware/security";
import { legalComplianceHeaders, secureCookieMiddleware, gdprAuditLog } from "./middleware/gdpr-compliance";
import { AdvancedThreatDetector } from "./middleware/advanced-threat-detection";
import { GDPREnhancedCompliance } from "./middleware/gdpr-enhanced-compliance";

// Serviços e Configuração
import { domainManager } from "./config/domains";
import { emailScheduler } from './services/email-scheduler';
import { cronService } from "./services/cron-service";
import { wsNotificationService } from "./services/websocket-notification-service";

const app = express();

// ==========================================
// 1. MIDDLEWARES GLOBAIS DE SEGURANÇA
// ==========================================

// Configuração de CORS Dinâmica e Robusta
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Obter domínios permitidos (com fallback seguro)
  const allowedOrigins = domainManager?.getAllowedOrigins() || [];
  const primaryDomain = domainManager?.getPrimaryDomain() || '*';
  
  if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, permitir origem da requisição ou *
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Em produção, verificar whitelist rigorosa
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', primaryDomain);
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Headers de Segurança Base
app.use(securityHeaders as RequestHandler);
app.use(legalComplianceHeaders as RequestHandler);

// Sistema Avançado de Detecção de Ameaças (Se disponível)
if (AdvancedThreatDetector?.middleware) {
  app.use(AdvancedThreatDetector.middleware as any);
}

// ==========================================
// 2. PARSING E COMPLIANCE DADOS
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middlewares de Privacidade (GDPR)
app.use(secureCookieMiddleware as any);
app.use(gdprAuditLog as any);

if (GDPREnhancedCompliance?.complianceMiddleware) {
  app.use(GDPREnhancedCompliance.complianceMiddleware as any);
}

// Proteção CSRF Global
app.use(csrfProtection as any);

// ==========================================
// 3. LOGGING E MONITORIZAÇÃO
// ==========================================

app.use(((req: any, res: any, next: any) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    // Cast res to any to avoid type checking issues with headersSent on some Response types
    if (!(res as any).headersSent) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    }
    return res;
  };

  (res as any).on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
}) as any);

// ==========================================
// 4. SETUP DO SERVIDOR
// ==========================================

(async () => {
  const server = createServer(app);

  // Inicializar Serviço de WebSocket
  wsNotificationService.initialize(server);

  try {
    console.log('🔧 A registar rotas de autenticação...');
    await setupAuthRoutes(app);
    
    console.log('🔧 A registar rotas da API...');
    await registerRoutes(app);
  } catch (error) {
    console.error("❌ Erro crítico na configuração das rotas:", error);
    (process as any).exit(1);
  }

  // Tratamento de Erros Centralizado
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Erro Interno do Servidor";

    if (!(res as any).headersSent) {
      (res as any).status(status).json({ message });
    }
    console.error('🚨 Erro na aplicação:', err);
  });

  // Configuração do Frontend (Vite)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Arranque
  const PORT = parseInt(process.env.PORT || '5000', 10);
  
  server.listen(PORT, "0.0.0.0", async () => {
    log(`🚀 Servidor a escutar na porta ${PORT}`);
    
    // Inicialização de Serviços de Background
    try {
      // Import dinâmico para evitar dependências circulares ou bloqueio no startup
      const { creditUpsellService } = await import('./services/credit-upsell-service').catch(() => ({ creditUpsellService: null }));
      
      if (creditUpsellService) {
        await creditUpsellService.initializeDefaultPackages();
        console.log('💰 Pacotes de créditos inicializados');
      }

      if (emailScheduler) {
        emailScheduler.start();
        console.log('📧 Agendador de emails iniciado');
      }

    } catch (error) {
      console.error('⚠️ Erro não-bloqueante na inicialização de serviços:', error);
    }
  });

  // Graceful Shutdown
  const gracefulShutdown = () => {
    console.log('🛑 A encerrar servidor...');
    server.close(() => {
      console.log('✅ Servidor parado com sucesso.');
      (process as any).exit(0);
    });
  };

  (process as any).on('SIGTERM', gracefulShutdown);
  (process as any).on('SIGINT', gracefulShutdown);

})();
