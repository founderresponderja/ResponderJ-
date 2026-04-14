import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User, registerUserSchema, loginUserSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { emailSequenceService } from './services/email-sequence-service.js';
import { urlBuilder } from "./utils.js";

// Estende a tipagem do Express para incluir o User na Request
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string; // Adicionado para corrigir erro de acesso no login
      credits: number;
      companyName: string;
      isActive: boolean;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      selectedPlan?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

// =====================================
// FUNÇÕES DE HASHING E SEGURANÇA
// =====================================

async function hashPassword(password: string): Promise<string> {
  // 14 rounds é um excelente equilíbrio entre segurança e performance para 2025
  const saltRounds = 14;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

// =====================================
// CONFIGURAÇÃO DE AUTENTICAÇÃO
// =====================================

export function setupAuth(app: any) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.ENCRYPTION_KEY || "responderja-revolutionary-secret-2025",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // True apenas em HTTPS/Prod
      httpOnly: true, // Previne XSS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      sameSite: 'lax', // Melhor compatibilidade para fluxos de OAuth/Redirecionamento
      path: '/'
    },
  };

  // Necessário para cookies seguros funcionarem atrás de proxies (Replit, Nginx, Vercel)
  app.set("trust proxy", 1);
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // =====================================
  // ESTRATÉGIA LOCAL (EMAIL/PASS)
  // =====================================

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`🔐 Tentativa de login: ${email}`);
          
          const user = await storage.getUserByEmail(email.toLowerCase());
          
          if (!user) {
            console.log(`❌ Utilizador desconhecido: ${email}`);
            return done(null, false, { message: "Credenciais inválidas" });
          }

          if (!user.isActive) {
            console.log(`🚫 Conta suspensa: ${email}`);
            return done(null, false, { message: "Esta conta foi desativada." });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            console.log(`❌ Senha incorreta para: ${email}`);
            return done(null, false, { message: "Credenciais inválidas" });
          }

          console.log(`✅ Login autorizado: ${email}`);
          
          // Atualizar timestamp de login
          await storage.updateUser(user.id, { lastLoginAt: new Date() });
          
          // Auditoria
          await storage.createAuditLog({
            userId: user.id,
            action: "login",
            resourceType: "user",
            resourceId: user.id,
            details: { 
              message: "Login realizado com sucesso",
              severity: "info"
            },
          });

          return done(null, user as any);
        } catch (error) {
          console.error("💥 Erro crítico no login:", error);
          return done(error);
        }
      }
    )
  );

  // =====================================
  // SERIALIZAÇÃO
  // =====================================

  passport.serializeUser((user, done) => done(null, (user as any).id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      
      if (!user || !user.isActive) {
        console.warn(`⚠️ Sessão inválida para user ID: ${id}`);
        return done(null, false);
      }
      
      done(null, user as any);
    } catch (error) {
      console.error(`💥 Erro na deserialização do user ${id}:`, error);
      done(error, null);
    }
  });

  // =====================================
  // ROTAS DE API
  // =====================================

  // REGISTO
  app.post("/api/register", async (req: any, res: any, next: any) => {
    try {
      // Validação Zod
      const validationResult = registerUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const data = validationResult.data;

      // Check duplicidade
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já se encontra registado." });
      }

      // Criação
      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashedPassword,
        nif: data.nif || "",
      });

      console.log(`🚀 Novo utilizador registado: ${user.email}`);

      // Login automático pós-registo
      req.login(user as any, (err: any) => {
        if (err) return (next as any)(err);

        // Disparar sequência de emails (Async)
        emailSequenceService.createSequenceForUser(String(user.id)).catch(err => {
            console.error('❌ Falha na sequência de email:', err);
        });

        storage.createAuditLog({
          userId: user.id,
          action: "register",
          entity: "user",
          entityId: user.id,
          description: "Novo registo de conta",
          severity: "info",
        });

        res.status(201).json({
          message: "Conta criada com sucesso!",
          user: sanitizeUser(user)
        });
      });

    } catch (error) {
      console.error("💥 Erro no registo:", error);
      res.status(500).json({ message: "Erro ao processar registo." });
    }
  });

  // LOGIN
  app.post("/api/login", (req: any, res: any, next: any) => {
    const validationResult = loginUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Formato inválido",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return (next as any)(err);
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }

      req.logIn(user, (err: any) => {
        if (err) return (next as any)(err);

        console.log(`✅ Sessão iniciada: ${user.email} [${user.role}]`);
        
        res.json({
          message: "Bem-vindo de volta!",
          user: sanitizeUser(user),
        });
      });
    })(req, res, next);
  });

  // LOGOUT
  const handleLogout = (req: any, res: any, next: any) => {
    const user = req.user;
    req.logout((err: any) => {
      if (err) return (next as any)(err);
      
      if (user) {
        console.log(`👋 Logout: ${user.email}`);
      }
      
      // Se for pedido via API (AJAX), responde JSON. Se for navegação direta, redireciona.
      if (req.xhr || req.headers.accept?.indexOf('json')! > -1) {
          res.json({ message: "Sessão terminada" });
      } else {
          res.redirect("/");
      }
    });
  };

  app.post("/api/logout", handleLogout);
  app.get("/api/logout", handleLogout);

  // USER DATA
  app.get("/api/user", (req: any, res: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json(sanitizeUser(req.user));
  });
}

// =====================================
// HELPERS & MIDDLEWARES
// =====================================

/**
 * Remove dados sensíveis do objeto user antes de enviar para o frontend
 */
function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    credits: user.credits,
    companyName: user.companyName,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export function requireAuth(req: any, res: any, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Sessão expirada ou inválida." });
  }
  next();
}

/**
 * Middleware flexível para verificação de permissões.
 * Verifica tanto a role string quanto os flags booleanos de admin.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Autenticação necessária" });
    }

    const user = req.user;

    // Lógica Híbrida:
    // 1. Verifica se a role do user está na lista permitida (ex: "agency_owner")
    // 2. Verifica se o user é admin e se "admin" está na lista permitida
    // 3. Verifica se o user é super_admin (acesso universal se "super_admin" estiver na lista ou implícito)
    
    const hasRoleAccess = allowedRoles.includes(user.role);
    const hasAdminAccess = user.isAdmin && allowedRoles.includes("admin");
    const hasSuperAdminAccess = user.isSuperAdmin; // Super admin tem acesso a quase tudo, mas podemos restringir se necessário

    if (hasRoleAccess || hasAdminAccess || hasSuperAdminAccess) {
      return next();
    }

    return res.status(403).json({ message: "Não tem permissão para aceder a este recurso." });
  };
}

// Aliases para uso rápido
export const requireAdmin = requireRole(["admin", "super_admin"]);
export const requireSuperAdmin = requireRole(["super_admin"]);
export const requireAgencyOwner = requireRole(["agency_owner", "admin", "super_admin"]);