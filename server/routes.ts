import type { Express } from "express";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireSuperAdmin } from "./auth";
import { 
  applySecurity, 
  authRateLimit, 
  apiRateLimit, 
  adminRateLimit, 
  generateRateLimit 
} from "./middleware/security";
import { protectCSRF, getCSRFToken, addCSRFToken } from "./middleware/csrf";
import { protectDatabaseQueries } from "./middleware/sql-injection-protection";
import { 
  legalComplianceHeaders,
  updateCookieConsent, 
  getCookieConfigurations
} from "./middleware/gdpr-compliance";
import { trialRateLimit } from "./middleware/trial-rate-limiting";

// Import services dynamically to avoid circular dependencies issues on startup
import { emailService } from "./services/email-service";
import { onboardingEmailService } from "./services/onboarding-email";
import { trialService } from "./services/trial-service";
import { referralService } from "./services/referral-service";

// Route imports
import landingPageRoutes from "./routes/admin/landing-page";
import suggestionRoutes from "./routes/suggestions";
import { registerSecurityDashboardRoutes } from "./routes/security-dashboard";
import { registerSystemRoutes } from "./routes/system";
import { registerAdminLeadsRoutes } from "./routes/admin-leads";
import { registerAdminSystemRoutes } from "./routes/admin-system";
import { registerDownloadRoutes } from "./routes/downloads";
import { setupEmailSequenceRoutes } from './routes/email-sequence';
import reviewsRouter from "./routes/reviews";
import errorRoutes from "./routes/errors";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

import OpenAI from "openai";
import Stripe from "stripe";
import passport from "passport";
import crypto from "crypto";
import bcrypt from "bcrypt";
import process from "process";

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-openai-key"
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "your-stripe-secret-key", {
  apiVersion: "2025-07-30.basil" as any, // Cast to any to avoid version mismatch errors in some envs
});

// Setup ONLY authentication routes - called BEFORE Vite setup
export async function setupAuthRoutes(app: Express): Promise<void> {
  console.log('🔐 Setting up auth routes BEFORE Vite...');
  
  // Rate Limiting
  try {
    const { smartRateLimit } = await import('./middleware/rate-limiting');
    app.use(smartRateLimit);
  } catch (e) {
    console.warn("Middleware rate-limiting não encontrado, ignorando.");
  }
  
  // Auth middleware
  setupAuth(app);

  // Simple test endpoint without auth middleware
  app.get('/api/test', (req: any, res) => {
    res.json({
      message: "Test endpoint works",
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      user: req.user
    });
  });

  // ✅ ENDPOINT DE CORREÇÃO CRÉDITOS ADMINISTRADORES
  app.get('/api/admin/fix-admin-credits', requireAuth, requireSuperAdmin, async (req: any, res) => {
    try {
      const adminEmails = ['founder.responderja@gmail.com', 'lfpedrosa@gmail.com'];
      const results = [];
      
      const adminPromises = adminEmails.map(async (email) => {
        const user = await storage.getUserByEmail(email);
        if (user) {
          await storage.updateUser(user.id, { 
            credits: 0,
            selectedPlan: 'admin',
            subscriptionPlan: 'admin'
          });
          return { email, status: 'FIXED - 0 créditos' };
        }
        return { email, status: 'Não encontrado' };
      });
      
      const adminResults = await Promise.allSettled(adminPromises);
      results.push(...adminResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
      );
      
      res.json({ success: true, message: 'Admin credits fixed', results });
    } catch (error) {
      res.json({ success: false, error: (error as Error).message });
    }
  });

  // ✅ ENDPOINT DE RESET PASSWORD ADMIN
  app.get('/api/admin/reset-admin-password', requireAuth, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUserByEmail('lfpedrosa@gmail.com');
      if (user) {
        const hashedPassword = await bcrypt.hash('Teste123#', 12);
        await storage.updateUser(user.id, { password: hashedPassword });
        res.json({ success: true, message: 'Admin password reset to Teste123#' });
      } else {
        res.json({ success: false, message: 'Admin user not found' });
      }
    } catch (error) {
      res.json({ success: false, error: (error as Error).message });
    }
  });

  // ✅ ENDPOINT DE VERIFICAÇÃO DE UTILIZADORES DE TESTE
  app.get('/api/admin/verify-test-users', async (req: any, res) => {
    try {
      const testEmails = [
        'founder.responderja@gmail.com',
        'lfpedrosa@gmail.com', 
        'trial@amplia.com',
        'starter@amplia.com',
        'pro@amplia.com',
        'agencia@amplia.com'
      ];

      const userStatuses = [];

      for (const email of testEmails) {
        try {
          const user = await storage.getUserByEmail(email);
          if (user) {
            userStatuses.push({
              email: user.email,
              plan: user.selectedPlan || user.subscriptionPlan,
              credits: user.credits,
              isAdmin: user.isAdmin || false,
              isSuperAdmin: user.isSuperAdmin || false,
              // Cast to any for properties not in core User type
              isAgencyOwner: (user as any).isAgencyOwner || false,
              isTrialActive: (user as any).isTrialActive || false,
              emailVerified: (user as any).emailVerified || false,
              status: 'EXISTS'
            });
          } else {
            userStatuses.push({
              email: email,
              status: 'NOT_FOUND'
            });
          }
        } catch (error) {
          userStatuses.push({
            email: email,
            status: 'ERROR',
            error: (error as Error).message
          });
        }
      }

      res.json({
        success: true,
        message: "User verification completed",
        users: userStatuses
      });

    } catch (error) {
      console.error("❌ Error verifying test users:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying test users",
        error: (error as Error).message
      });
    }
  });

  // ✅ FUNÇÃO PARA CRIAR UTILIZADORES DE TESTE (executada automaticamente)
  async function createTestUsersOnStartup() {
    try {
      console.log("🔧 Iniciando criação de utilizadores de teste...");
      
      const testUsers = [
        {
          email: "founder.responderja@gmail.com",
          password: "SuperAdmin@170910",
          firstName: "CEO",
          lastName: "Responder Já",
          companyName: "Responder Já Founders",
          nif: "111222333",
          isSuperAdmin: true,
          isAdmin: true,
          selectedPlan: "admin",
          subscriptionPlan: "admin",
          credits: 0,
          emailVerified: true,
          isTrialActive: false,
        },
        {
          email: "lfpedrosa@gmail.com", 
          password: "Teste123#",
          firstName: "Luís",
          lastName: "Pedrosa",
          companyName: "Administração Responder Já",
          nif: "999888777",
          isAdmin: true,
          isSuperAdmin: false,
          selectedPlan: "admin",
          subscriptionPlan: "admin",
          credits: 0,
          emailVerified: true,
          isTrialActive: false,
        },
        {
          email: "trial@amplia.com",
          password: "Teste123#", 
          firstName: "Cliente",
          lastName: "Trial",
          companyName: "Empresa Trial Lda",
          nif: "555666777",
          isAdmin: false,
          isSuperAdmin: false,
          selectedPlan: "trial",
          subscriptionPlan: "trial",
          credits: 50,
          emailVerified: true,
          isTrialActive: true,
        }
      ];

      for (const userData of testUsers) {
        try {
          const existingUser = await storage.getUserByEmail(userData.email);
          if (existingUser) continue;

          const hashedPassword = await bcrypt.hash(userData.password, 12);
          await storage.createUser({
            ...userData,
            password: hashedPassword,
            phone: "", // Required fields default
            isActive: true,
            role: userData.isAdmin ? "admin" : "user"
          });

          console.log(`✅ Created test user: ${userData.email}`);
        } catch (error) {
          console.error(`❌ Error creating user ${userData.email}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ Erro ao criar utilizadores de teste:", error);
    }
  }

  // ✅ EXECUTAR AUTOMATICAMENTE DURANTE A INICIALIZAÇÃO
  await createTestUsersOnStartup();

  // Endpoint de login principal
  app.post('/api/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ message: "Erro interno" });
        
        res.json({ 
          message: "Login realizado com sucesso",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
            selectedPlan: user.selectedPlan
          }
        });
      });
    } catch (error) {
      console.error('❌ Erro no login:', error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Alias para /api/auth/login
  app.post('/api/auth/login', (req: any, res: any, next: any) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Erro interno do servidor" });
      if (!user) return res.status(401).json({ message: info?.message || "Email ou password incorretos" });

      req.login(user, (loginErr: any) => {
        if (loginErr) return res.status(500).json({ message: "Erro interno do servidor" });
        res.json({ user });
      });
    })(req, res, next);
  });

  // Endpoint de verificação de estado da sessão
  app.get('/api/session-status', (req: any, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user || null,
      sessionId: req.sessionID
    });
  });

  // Redirects
  app.get('/login', (req, res) => res.redirect(302, '/auth'));
  app.get('/register', (req, res) => res.redirect(302, '/auth'));
  app.get('/home', (req, res) => res.redirect(302, '/'));
}

export async function registerRoutes(app: Express): Promise<void> {
  // Segurança
  app.use(legalComplianceHeaders);
  app.use(protectDatabaseQueries);
  
  app.use((req, res, next) => {
    if (req.path === '/api/suggestions' && req.method === 'POST') return next();
    
    // Exception for test emails in development
    const authPaths = ['/api/auth/login', '/api/auth/register'];
    const testEmails = ['test@example.com', 'user@test.com', 'admin@test.com'];
    const requestEmail = req.body?.email || req.query?.email;
    
    if (authPaths.includes(req.path) && requestEmail && testEmails.includes(requestEmail)) {
      return next();
    }
    
    applySecurity(req, res, next);
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Acesso negado - Apenas administradores" });
    }
    next();
  };
  
  // Endpoints de segurança
  app.get('/api/csrf-token', addCSRFToken, getCSRFToken);
  app.post('/api/cookie-consent', updateCookieConsent);
  app.get('/api/cookie-configurations', getCookieConfigurations);
  
  // Contact form
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Campos obrigatórios em falta" });
      }

      // Mock email sending
      console.log('📧 Contacto recebido:', { name, email, message });
      
      res.status(200).json({
        message: "Mensagem enviada com sucesso",
        received: true
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin routes
  try {
    const landingPageRoutes = (await import('./routes/admin/landing-page')).default;
    app.use('/api/admin/landing-page', requireAuth, requireAdmin, landingPageRoutes);
  } catch (e) { console.warn("Landing page routes not found"); }

  // Fix User Roles Endpoint
  app.post('/api/debug/fix-user-roles', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const fixes = [
        { email: 'trial@amplia.com', plan: 'trial' },
        { email: 'starter@amplia.com', plan: 'starter' },
      ];
      const results = [];
      for (const fix of fixes) {
        const user = await storage.getUserByEmail(fix.email);
        if (user) {
          await storage.updateUser(user.id, { selectedPlan: fix.plan, subscriptionPlan: fix.plan });
          results.push(`✅ Updated ${fix.email}`);
        }
      }
      res.json({ message: "User roles update completed", results });
    } catch (error) {
      res.status(500).json({ error: "Failed to fix user roles" });
    }
  });

  // === INVITATION ROUTES ===
  app.get('/api/invitations/:token', async (req, res) => {
    try {
      const invite = await storage.getAgencyInvitationByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Convite inválido ou expirado" });
      res.json(invite);
    } catch (e) {
      res.status(500).json({ message: "Erro ao validar convite" });
    }
  });

  app.post('/api/invitations/:token/accept', requireAuth, async (req: any, res) => {
    try {
      await storage.acceptAgencyInvitation(req.params.token, req.user.id);
      res.json({ success: true, message: "Convite aceite com sucesso" });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Erro ao aceitar convite" });
    }
  });

  app.post('/api/invitations/:token/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      const invite = await storage.getAgencyInvitationByToken(req.params.token);
      
      if (!invite) return res.status(404).json({ message: "Convite inválido ou expirado" });
      if (invite.email !== email) return res.status(400).json({ message: "Email não corresponde ao convite" });

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) return res.status(409).json({ message: "Utilizador já existe" });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isActive: true,
        credits: 10 // Trial credits
      });

      await storage.acceptAgencyInvitation(req.params.token, user.id);
      
      // Auto login
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ message: "Erro no login automático" });
        res.json({ success: true, user });
      });

    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao registar conta" });
    }
  });

  // User Data
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const mappedUser = {
        ...user,
        isAdmin: user.isAdmin || false,
        isSuperAdmin: user.isSuperAdmin || false
      };
      res.json(mappedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User Stats
  app.get('/api/user/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const stats = {
        availableCredits: user.credits || 0,
        totalResponsesGenerated: 0,
        creditsUsedThisMonth: 0,
        lastActivityDate: new Date().toISOString(),
        planStatus: user.selectedPlan || 'free',
        isTrialActive: (user as any).isTrialActive || false
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // === TRIAL SYSTEM ENDPOINTS ===
  app.get('/api/trial/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const status = await trialService.getTrialStatus(userId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter status do trial' });
    }
  });

  app.post('/api/trial/start', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const success = await trialService.startTrial(userId);
      res.json({ success, message: success ? 'Trial iniciado!' : 'Erro' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao iniciar trial' });
    }
  });

  // Business Profile
  app.get('/api/business-profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const profile = await storage.getBusinessProfile(userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  app.post('/api/business-profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const profileData = { ...req.body, userId };
      const profile = await storage.createBusinessProfile(profileData);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to create business profile" });
    }
  });

  // Response Generation
  app.post('/api/generate-response', protectCSRF, requireAuth, trialRateLimit, generateRateLimit, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { platform, originalMessage, tone, businessProfileId, responseType } = req.body;

      const user = await storage.getUser(userId);
      if (!user || user.credits < 1) {
        return res.status(400).json({ message: "Créditos insuficientes" });
      }

      const businessProfile = businessProfileId ? await storage.getBusinessProfile(userId) : null;
      const { aiResponseService } = await import("./services/ai-response-service");

      const businessContext = {
        businessName: businessProfile?.businessName,
        businessType: businessProfile?.businessType,
        businessDescription: businessProfile?.description,
      };

      const aiResult = await aiResponseService.generateResponse({
        comment: originalMessage,
        platform: platform as any,
        tone: tone || "profissional",
        businessContext,
        responseType: responseType || "resposta"
      });

      const creditCost = aiResponseService.calculateCreditCost(aiResult.tokensUsed, platform);

      if (user.credits < creditCost) {
        return res.status(400).json({ message: "Créditos insuficientes" });
      }

      const responseData = {
        userId,
        businessProfileId,
        platform,
        originalMessage,
        generatedResponse: aiResult.response,
        tone: tone || "profissional",
        creditsUsed: creditCost,
        status: "generated",
        metadata: {
          detectedLanguage: aiResult.detectedLanguage.language,
          tokensUsed: aiResult.tokensUsed,
        }
      };

      const savedResponse = await storage.createAiResponse(responseData);
      await storage.updateUserCredits(userId, user.credits - creditCost);

      await storage.createCreditTransaction({
        userId,
        amount: -creditCost,
        type: "usage",
        description: `Resposta gerada (${platform})`,
        relatedResponseId: savedResponse.id
      });

      res.json({ ...savedResponse, tokensUsed: aiResult.tokensUsed });
    } catch (error) {
      console.error("Erro na geração:", error);
      res.status(500).json({ message: "Falha na geração da resposta" });
    }
  });

  // Analytics
  app.get('/api/analytics/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Credits
  app.get('/api/credits/balance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const balance = await storage.getUserCreditBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  // Stripe
  app.post('/api/get-or-create-subscription', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      let user = await storage.getUser(userId);

      if (!user) return res.status(404).json({ message: "User not found" });

      // If user is Stripe user, return subscription
      if ((user as any).stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve((user as any).stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });
        const latestInvoice = subscription.latest_invoice as any;
        res.json({
          subscriptionId: subscription.id,
          clientSecret: latestInvoice?.payment_intent?.client_secret || null,
        });
        return;
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.STRIPE_PRICE_ID || "price_123" }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Fixed: passed as object to match signature in storage.ts
      await storage.updateUserStripeInfo(userId, { customerId: customer.id, subscriptionId: subscription.id });
      
      const latestInvoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: latestInvoice?.payment_intent?.client_secret || null,
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ error: { message: (error as Error).message } });
    }
  });

  // Sentiment Analysis
  app.post("/api/sentiment/analyze", requireAuth, trialRateLimit, generateRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { text, platform } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Analyze sentiment JSON." },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      const sentimentData = {
        userId,
        platform,
        originalText: text,
        sentimentScore: analysis.sentimentScore?.toString() || "0",
        sentimentLabel: analysis.sentimentLabel || "neutral",
        emotions: analysis.emotions || {},
      };

      const savedAnalysis = await storage.createSentimentAnalysis(sentimentData);
      res.json(savedAnalysis);
    } catch (error) {
      res.status(500).json({ message: "Erro na análise de sentimento" });
    }
  });

  // Register optional/admin routes in try-catch to avoid hard crash if files missing
  try {
    registerSecurityDashboardRoutes(app);
    registerSystemRoutes(app);
    const adminSocialMediaRoutes = (await import("./routes/admin-social-media")).default;
    app.use("/api/admin/social-media", adminSocialMediaRoutes);
    const reportsRoutes = (await import("./routes/reports")).default;
    app.use("/api/admin/reports", reportsRoutes);
    
    // Additional features
    app.use("/api/reviews", reviewsRouter);
    app.use("/api/errors", errorRoutes);
  } catch (e) {
    console.log("Algumas rotas administrativas não foram carregadas.");
  }
}