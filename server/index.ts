import express, { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import compression from "compression"; // Added for performance
import { createServer } from "http";
import { registerRoutes, setupAuthRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

import { securityHeaders, csrfProtection } from "./middleware/security";
import { legalComplianceHeaders, secureCookieMiddleware, gdprAuditLog } from "./middleware/gdpr-compliance";
import { domainManager } from "./config/domains";
import { wsNotificationService } from "./services/websocket-notification-service";

const app = express();

// 🚀 Performance: Enable Gzip Compression for all responses
// Fix: Added any cast to bypass type mismatch errors with middleware overloads in some environments
(app as any).use(compression());

// 1. Security Middlewares
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const allowedOrigins = domainManager?.getAllowedOrigins() || [];
  const primaryDomain = domainManager?.getPrimaryDomain() || '*';
  
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', primaryDomain);
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(securityHeaders);
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(legalComplianceHeaders);

// 2. Body Parsing & GDPR
// Stripe webhook needs raw body for signature validation.
(app as any).use('/api/billing/webhook', express.raw({ type: 'application/json' }));
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(express.json({ limit: '1mb' })); // Limit body size for performance
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(express.urlencoded({ extended: false, limit: '1mb' }));
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(secureCookieMiddleware as RequestHandler);
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(gdprAuditLog as RequestHandler);
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(csrfProtection as RequestHandler);

// 3. Logger optimized for production
// Fix: Added any cast to bypass type mismatch errors with middleware overloads
(app as any).use(((req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
}) as RequestHandler);

(async () => {
  const server = createServer(app);
  wsNotificationService.initialize(server);

  try {
    await setupAuthRoutes(app);
    await registerRoutes(app);
  } catch (error) {
    console.error("❌ Startup error:", error);
  }

  // Error Handler
  // Fix: Use any for parameters and cast app to resolve property access errors on Response and type mismatch on use()
  (app as any).use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) res.status(status).json({ message });
  });

  // 🚀 Frontend setup with caching
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve static files with 1 year cache for hashed assets
    // Fix: Added any cast to bypass type mismatch errors with middleware overloads
    (app as any).use(express.static('public', {
      maxAge: '1y',
      immutable: true
    }));
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Responder Já Server active on port ${PORT}`);
  });
})();
