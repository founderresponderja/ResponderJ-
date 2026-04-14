
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
import { 
  isAdminMiddleware,
  isSuperAdminMiddleware, 
  isAgencyOwnerMiddleware
} from './middleware/auth';

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
import { setupAdminManagementRoutes } from "./routes/admin-management";
import { registerDownloadRoutes } from "./routes/downloads";
import { setupTechnicalSpecsRoutes } from "./routes/admin/technical";
import { setupEmailSequenceRoutes } from './routes/email-sequence';
import { registerAnalyticsRoutes } from "./routes/analytics"; 
import { registerApiKeysGuideRoutes } from "./routes/api-keys-guide"; 
import { registerAutomationRoutes } from "./routes/automation"; 
import { registerBillingRoutes } from "./routes/billing"; 
import { registerDiscoveryRoutes } from "./routes/discovery"; 
import { registerContentRoutes } from "./routes/content"; 
import { registerCorporateSocialRoutes } from "./routes/corporate-social";
import { registerCriticalSystemsRoutes } from "./routes/critical-systems";
import reviewsRouter from "./routes/reviews";
import reviewsAiRouter from "./routes/reviews-ai"; 
import qualityFeedbackRouter from "./routes/quality-feedback";
import errorRoutes from "./routes/errors";
import sofiaChatRoutes from "./routes/ai-chat"; // NEW IMPORT
import platformIntegrationsRoutes from "./routes/platform-integrations";

import { db } from "./db";
import { users, establishments, reviews, responses, socialPlatformConnections } from "@shared/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import Stripe from "stripe";
import passport from "passport";
import crypto from "crypto";
import bcrypt from "bcrypt";
import process from "process";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "your-stripe-secret-key", {
  apiVersion: "2025-07-30.basil" as any, 
});

// Setup ONLY authentication routes - called BEFORE Vite setup
export async function setupAuthRoutes(app: any): Promise<void> {
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
  app.get('/api/test', (req: any, res: any) => {
    res.json({
      message: "Test endpoint works",
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      user: req.user
    });
  });

  // ✅ ENDPOINT DE CORREÇÃO CRÉDITOS ADMINISTRADORES
  app.get('/api/admin/fix-admin-credits', requireAuth, requireSuperAdmin, async (req: any, res: any) => {
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
  app.get('/api/admin/reset-admin-password', requireAuth, requireSuperAdmin, async (req: any, res: any) => {
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
  app.get('/api/admin/verify-test-users', async (req: any, res: any) => {
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

  // ✅ FUNÇÃO PARA CRIAR UTILIZADORES DE TESTE
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
            phone: "", 
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

  await createTestUsersOnStartup();

  app.post('/api/login', async (req: any, res: any) => {
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

  app.get('/api/session-status', (req: any, res: any) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user || null,
      sessionId: req.sessionID
    });
  });

  app.get('/login', (req: any, res: any) => res.redirect(302, '/auth'));
  app.get('/register', (req: any, res: any) => res.redirect(302, '/auth'));
  app.get('/home', (req: any, res: any) => res.redirect(302, '/'));
}

export async function registerRoutes(app: any): Promise<void> {
  app.use(legalComplianceHeaders);
  app.use(protectDatabaseQueries);
  
  // SOFIA AI CHAT ROUTE
  app.use("/api/ai", sofiaChatRoutes);
  app.use("/api/platforms", platformIntegrationsRoutes);
  
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/api/suggestions' && req.method === 'POST') return next();
    
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
  
  app.get('/api/csrf-token', addCSRFToken, getCSRFToken);
  app.post('/api/cookie-consent', updateCookieConsent);
  app.get('/api/cookie-configurations', getCookieConfigurations);
  
  app.post('/api/contact', async (req: any, res: any) => {
    try {
      const { name, email, message } = req.body;
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Campos obrigatórios em falta" });
      }

      console.log('📧 Contacto recebido:', { name, email, message });
      
      res.status(200).json({
        message: "Mensagem enviada com sucesso",
        received: true
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  try {
    const landingPageRoutes = (await import('./routes/admin/landing-page')).default;
    app.use('/api/admin/landing-page', requireAuth, requireAdmin, landingPageRoutes);
  } catch (e) { console.warn("Landing page routes not found"); }

  try {
    const adminContentRoutes = (await import("./routes/admin/content")).default;
    app.use("/api/admin/content", requireAuth, requireAdmin, adminContentRoutes);
  } catch (e) { console.warn("Admin content routes not found"); }

  app.post('/api/debug/fix-user-roles', requireAuth, requireSuperAdmin, async (req: any, res: any) => {
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

  // Invitation Routes
  app.get('/api/invitations/:token', async (req: any, res: any) => {
    try {
      const invite = await storage.getAgencyInvitationByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Convite inválido ou expirado" });
      res.json(invite);
    } catch (e) {
      res.status(500).json({ message: "Erro ao validar convite" });
    }
  });

  app.post('/api/invitations/:token/accept', requireAuth, async (req: any, res: any) => {
    try {
      await storage.acceptAgencyInvitation(req.params.token, req.user.id);
      res.json({ success: true, message: "Convite aceite com sucesso" });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Erro ao aceitar convite" });
    }
  });

  app.post('/api/invitations/:token/register', async (req: any, res: any) => {
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
        credits: 10 
      });

      await storage.acceptAgencyInvitation(req.params.token, user.id);
      
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ message: "Erro no login automático" });
        res.json({ success: true, user });
      });

    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao registar conta" });
    }
  });

  // Agency Management
  app.get('/api/agency/members', requireAuth, isAgencyOwnerMiddleware, async (req: any, res: any) => {
    try {
      const user = req.user;
      if (!user.agencyId) return res.status(400).json({ message: "Utilizador não pertence a uma agência" });
      
      const members = await storage.getAgencyMembers(user.agencyId);
      
      const invitationsResult = await db.execute(sql`
        SELECT * FROM agency_invitations 
        WHERE agency_id = ${user.agencyId} AND status = 'pending' AND expires_at > NOW()
      `);
      
      const invitations = invitationsResult.rows.map((inv: any) => ({
        id: `invite-${inv.id}`,
        email: inv.email,
        role: inv.role,
        status: 'pending',
        joinedAt: inv.created_at,
        user: null
      }));
      
      res.json([...members, ...invitations]);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao obter membros" });
    }
  });

  app.post('/api/agency/invite-member', requireAuth, isAgencyOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { email, role } = req.body;
      const user = req.user;
      if (!user.agencyId) return res.status(400).json({ message: "Utilizador não pertence a uma agência" });

      const counts = await storage.getAgencyMemberCount(user.agencyId);
      if (counts.total >= 5) return res.status(403).json({ message: "Limite de membros atingido" });

      const invite = await storage.inviteAgencyMember(user.agencyId, email, role, user.id);
      
      res.json({ message: "Convite enviado com sucesso", invite });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao enviar convite" });
    }
  });

  app.patch('/api/agency/members/:memberId', requireAuth, isAgencyOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { memberId } = req.params;
      const updates = req.body;
      
      const updatedMember = await storage.updateAgencyMember(memberId, updates);
      res.json(updatedMember);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao atualizar membro" });
    }
  });

  app.get('/api/agency/delegations', requireAuth, isAgencyOwnerMiddleware, async (req: any, res: any) => {
    try {
      const user = req.user;
      if (!user.agencyId) return res.status(400).json({ message: "Utilizador não pertence a uma agência" });
      
      const delegations = await storage.getAgencyDelegations(user.agencyId);
      res.json(delegations);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao obter delegações" });
    }
  });

  app.post('/api/agency/delegate-admin', requireAuth, isAgencyOwnerMiddleware, async (req: any, res: any) => {
    try {
      const user = req.user;
      const { userId, type, days } = req.body;
      
      if (!user.agencyId) return res.status(400).json({ message: "Utilizador não pertence a uma agência" });

      const delegation = await storage.createAgencyDelegation({
        agencyId: user.agencyId,
        delegatedBy: user.id,
        delegatedTo: userId,
        type,
        days: type === 'temporary' ? parseInt(days) : null,
        permissions: ['admin']
      });

      res.json(delegation);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao delegar administração" });
    }
  });

  app.get('/api/agency/clients', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.selectedPlan !== 'agency' && user.subscriptionPlan !== 'agency') {
        return res.status(403).json({ message: "Disponível apenas no plano Agência/Enterprise." });
      }

      const clients = await db.select().from(establishments)
        .where(eq(establishments.userId, userId))
        .orderBy(desc(establishments.createdAt))
        .limit(5);

      const withPlatforms = await Promise.all(clients.map(async (c) => {
        const connections = await db.select().from(socialPlatformConnections)
          .where(and(
            eq(socialPlatformConnections.userExternalId, String(req.user?.id)),
            eq(socialPlatformConnections.establishmentId, c.id),
            eq(socialPlatformConnections.status, "connected"),
          ));
        return {
          ...c,
          connectedPlatforms: connections.map((p) => p.platform),
        };
      }));

      res.json(withPlatforms);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar clientes de agência" });
    }
  });

  app.post('/api/agency/clients', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.selectedPlan !== 'agency' && user.subscriptionPlan !== 'agency') {
        return res.status(403).json({ message: "Disponível apenas no plano Agência/Enterprise." });
      }

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(establishments)
        .where(eq(establishments.userId, userId));
      if (Number(countResult[0]?.count || 0) >= 5) {
        return res.status(400).json({ message: "Limite de 5 negócios atingido." });
      }

      const payload = req.body || {};
      if (!payload.name?.trim()) return res.status(400).json({ message: "Nome do negócio é obrigatório." });

      const [created] = await db.insert(establishments).values({
        userId,
        name: payload.name.trim(),
        logoUrl: payload.logoUrl || null,
        type: payload.type || null,
        brandTone: payload.brandTone || "profissional",
        responseGuidelines: payload.responseGuidelines || null,
        platformIds: Array.isArray(payload.platformIds) ? payload.platformIds : [],
      }).returning();

      res.json(created);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar negócio da agência" });
    }
  });

  app.patch('/api/agency/clients/:clientId', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const clientId = Number(req.params.clientId);
      const payload = req.body || {};
      const [client] = await db.select().from(establishments).where(and(
        eq(establishments.id, clientId),
        eq(establishments.userId, userId),
      )).limit(1);
      if (!client) return res.status(404).json({ message: "Negócio não encontrado." });

      const [updated] = await db.update(establishments).set({
        name: payload.name ?? client.name,
        logoUrl: payload.logoUrl ?? client.logoUrl,
        type: payload.type ?? client.type,
        brandTone: payload.brandTone ?? client.brandTone,
        responseGuidelines: payload.responseGuidelines ?? client.responseGuidelines,
        platformIds: payload.platformIds ?? client.platformIds,
        updatedAt: new Date(),
      }).where(eq(establishments.id, clientId)).returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar negócio da agência" });
    }
  });

  app.get('/api/agency/overview', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const clients = await db.select().from(establishments).where(eq(establishments.userId, userId)).limit(5);
      const rows = await Promise.all(clients.map(async (client) => {
        const clientReviews = await db.select().from(reviews).where(eq(reviews.establishmentId, client.id));
        const pendingReviews = clientReviews.filter((r) => !r.sentiment || r.sentiment === 'neutral').length;
        const avgRating = clientReviews.length
          ? (clientReviews.reduce((acc, item) => acc + Number(item.rating || 0), 0) / clientReviews.length)
          : 0;

        const thisWeekResponses = await db.select().from(responses).where(and(
          eq(responses.userId, userId),
          gte(responses.createdAt, weekStart),
        ));
        const thisWeekCount = thisWeekResponses.filter((r) => {
          const rev = clientReviews.find((cr) => cr.id === r.reviewId);
          return !!rev;
        }).length;

        const connected = await db.select().from(socialPlatformConnections).where(and(
          eq(socialPlatformConnections.userExternalId, String(req.user?.id)),
          eq(socialPlatformConnections.establishmentId, client.id),
          eq(socialPlatformConnections.status, "connected"),
        ));

        return {
          clientId: client.id,
          clientName: client.name,
          logoUrl: client.logoUrl,
          pendingReviews,
          averageRating: Number(avgRating.toFixed(2)),
          responsesThisWeek: thisWeekCount,
          connectedPlatforms: connected.map((c) => c.platform),
        };
      }));

      res.json({
        month: monthStart.toISOString(),
        totalClients: clients.length,
        clients: rows,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar overview da agência" });
    }
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res: any) => {
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

  app.get('/api/user/stats', requireAuth, async (req: any, res: any) => {
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

  // Trial System
  app.get('/api/trial/status', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const status = await trialService.getTrialStatus(userId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter status do trial' });
    }
  });

  app.post('/api/trial/start', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const success = await trialService.startTrial(userId);
      res.json({ success, message: success ? 'Trial iniciado!' : 'Erro' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao iniciar trial' });
    }
  });

  // Business Profile
  app.get('/api/business-profile', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const establishmentId = req.query.establishmentId ? Number(req.query.establishmentId) : undefined;
      if (establishmentId) {
        const [profileById] = await db.select().from(establishments).where(and(
          eq(establishments.id, establishmentId),
          eq(establishments.userId, Number(userId)),
        )).limit(1);
        return res.json(profileById);
      }
      const profile = await storage.getBusinessProfile(userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  app.post('/api/business-profile', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const establishmentId = req.body?.establishmentId ? Number(req.body.establishmentId) : undefined;
      if (establishmentId) {
        const [existing] = await db.select().from(establishments).where(and(
          eq(establishments.id, establishmentId),
          eq(establishments.userId, Number(userId)),
        )).limit(1);
        if (!existing) return res.status(404).json({ message: "Negócio não encontrado." });
        const [updated] = await db.update(establishments).set({
          ...req.body,
          updatedAt: new Date(),
        }).where(eq(establishments.id, establishmentId)).returning();
        return res.json(updated);
      }
      const profileData = { ...req.body, userId: Number(userId) };
      const profile = await storage.createBusinessProfile(profileData as any);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to create business profile" });
    }
  });

  // Generate Response
  app.post('/api/generate-response', protectCSRF, requireAuth, trialRateLimit, generateRateLimit, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const { platform, originalMessage, tone, businessProfileId, responseType, extraInstructions } = req.body;
      const effectiveGeminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      console.log("[generate-response] request", {
        userId,
        platform,
        keyExists: !!process.env.GEMINI_API_KEY,
        hasFallbackApiKey: !!process.env.API_KEY,
        geminiModel: effectiveGeminiModel,
      });

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
        extraInstructions,
        businessContext,
        responseType: responseType || "resposta"
      });
      console.log("[generate-response] aiResult received", {
        hasResponse: !!aiResult?.response,
        sentiment: aiResult?.sentiment,
        tokensUsed: aiResult?.tokensUsed,
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
        responseText: aiResult.response,
        sentiment: aiResult.sentiment,
        keywords: aiResult.keywords,
        tone: tone || "profissional",
        creditsUsed: creditCost,
        status: "generated",
        metadata: {
          detectedLanguage: aiResult.detectedLanguage.language,
          tokensUsed: aiResult.tokensUsed,
          extraInstructions: extraInstructions
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
    } catch (error: any) {
      console.error("Erro na geração:", {
        message: error?.message,
        stack: error?.stack,
        raw: error,
      });
      res.status(500).json({
        message: "Falha na geração da resposta",
        error: error?.message || "unknown_error",
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
        debug: {
          keyExists: !!process.env.GEMINI_API_KEY,
          hasFallbackApiKey: !!process.env.API_KEY,
          geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        },
      });
    }
  });

  app.get('/api/analytics/stats', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/credits/balance', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const balance = await storage.getUserCreditBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  // Calendar productivity endpoints
  app.get('/api/calendar/posts', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const rows = await db.select().from(responses)
        .where(eq(responses.userId, userId))
        .orderBy(desc(responses.createdAt))
        .limit(200);

      const posts = rows.map((r) => ({
        id: String(r.id),
        title: r.customerName ? `Resposta para ${r.customerName}` : `Resposta ${r.id}`,
        platform: (r as any).platform || 'google',
        status: r.isPublished ? 'published' : (r.approvalStatus === 'approved' ? 'scheduled' : 'draft'),
        scheduledDate: r.publishedAt || r.createdAt,
        contentType: 'text',
        content: r.responseText,
        sourceType: 'review_response',
        reviewId: r.reviewId,
        responseId: r.id,
      }));

      res.json({ posts });
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar calendário" });
    }
  });

  app.post('/api/calendar/schedule-review-post', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const responseId = Number(req.body?.responseId);
      const scheduledFor = req.body?.scheduledFor ? new Date(req.body.scheduledFor) : null;
      if (!responseId || !scheduledFor) {
        return res.status(400).json({ message: "responseId e scheduledFor são obrigatórios." });
      }

      const [existing] = await db.select().from(responses).where(and(
        eq(responses.id, responseId),
        eq(responses.userId, userId),
      )).limit(1);
      if (!existing) return res.status(404).json({ message: "Resposta não encontrada." });

      const [updated] = await db.update(responses).set({
        approvalStatus: existing.approvalStatus === 'pending' ? 'approved' : existing.approvalStatus,
        publishedAt: scheduledFor,
      } as any).where(eq(responses.id, responseId)).returning();

      res.json({ success: true, scheduled: updated });
    } catch (error) {
      res.status(500).json({ message: "Erro ao agendar post da review" });
    }
  });

  app.get('/api/leads', requireAuth, async (req: any, res: any) => {
    try {
      const search = String(req.query.search || "").toLowerCase();
      const status = String(req.query.status || "");
      const all = await storage.getLeads(0, 500);
      let filtered = all;
      if (status) filtered = filtered.filter((l) => String(l.status).toLowerCase() === status.toLowerCase());
      if (search) {
        filtered = filtered.filter((l) =>
          String(l.companyName || "").toLowerCase().includes(search) ||
          String(l.contactName || "").toLowerCase().includes(search) ||
          String(l.email || "").toLowerCase().includes(search)
        );
      }
      res.json({ leads: filtered });
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar leads" });
    }
  });

  app.post('/api/leads', requireAuth, async (req: any, res: any) => {
    try {
      const payload = req.body || {};
      if (!payload.companyName?.trim()) return res.status(400).json({ message: "companyName obrigatório" });
      const lead = await storage.createLead({
        companyName: payload.companyName,
        contactName: payload.contactName || '',
        email: payload.email || '',
        phone: payload.phone || '',
        website: payload.website || '',
        industry: payload.industry || '',
        region: payload.region || '',
        businessType: payload.businessType || '',
        source: payload.source || 'review_followup',
        status: payload.status || 'novo',
        emailStatus: payload.emailStatus || 'pending',
      } as any);
      res.json({ lead });
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar lead" });
    }
  });

  app.patch('/api/leads/:id/status', requireAuth, async (req: any, res: any) => {
    try {
      const id = Number(req.params.id);
      const nextStatus = String(req.body?.status || 'novo');
      const updated = await storage.updateLead(id, { status: nextStatus } as any);
      res.json({ lead: updated });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar estado do lead" });
    }
  });

  app.get('/api/leads/suggestions/from-reviews', requireAuth, async (req: any, res: any) => {
    try {
      const userId = Number(req.user?.id);
      const positiveReviews = await db.select().from(reviews).where(and(
        eq(reviews.sentiment, 'positive'),
        gte(reviews.createdAt, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
      )).orderBy(desc(reviews.createdAt)).limit(100);

      const suggestions = positiveReviews
        .filter((r) => !!r.authorName && !!r.reviewText)
        .map((r) => {
          const hasBusinessSignal = /empresa|hotel|restaurante|equipa|ag[eê]ncia|clinic|store|business|team/i.test(r.reviewText || '');
          return {
            reviewId: r.id,
            contactName: r.authorName,
            companyName: `Lead de ${r.platform}`,
            reason: hasBusinessSignal
              ? "Review positiva com potencial comercial e sinal de negócio."
              : "Review positiva elegível para follow-up comercial.",
            suggestedStatus: 'novo',
          };
        })
        .slice(0, 20);

      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar sugestões de follow-up" });
    }
  });

  app.post('/api/get-or-create-subscription', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      let user = await storage.getUser(userId);

      if (!user) return res.status(404).json({ message: "User not found" });

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

  app.post("/api/sentiment/analyze", requireAuth, trialRateLimit, generateRateLimit, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const { text, platform } = req.body;
      
      const { aiResponseService } = await import("./services/ai-response-service");
      const analysis = await aiResponseService.analyzeSentiment(text);
      
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

  // Admin and Optional Routes
  try {
    registerSecurityDashboardRoutes(app);
    registerSystemRoutes(app);
    setupAdminManagementRoutes(app);
    setupTechnicalSpecsRoutes(app);
    const adminSocialMediaRoutes = (await import("./routes/admin-social-media")).default;
    app.use("/api/admin/social-media", adminSocialMediaRoutes);
    const reportsRoutes = (await import("./routes/reports")).default;
    app.use("/api/admin/reports", reportsRoutes);
    
    const aiTrainingRoutes = (await import("./routes/ai-training")).default;
    app.use("/api/ai-training", aiTrainingRoutes);

    app.use("/api/reviews", reviewsRouter);
    app.use("/api/reviews-ai", reviewsAiRouter); 
    app.use("/api/quality-feedback", qualityFeedbackRouter); // Register quality feedback route
    app.use("/api/errors", errorRoutes);

    registerAnalyticsRoutes(app);
    registerApiKeysGuideRoutes(app);
    registerAutomationRoutes(app);
    registerBillingRoutes(app);
    registerDiscoveryRoutes(app);
    registerContentRoutes(app);
    registerCorporateSocialRoutes(app);
    registerCriticalSystemsRoutes(app);

  } catch (e) {
    console.log("Algumas rotas administrativas não foram carregadas.");
  }
}
