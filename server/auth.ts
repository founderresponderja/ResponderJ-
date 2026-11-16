import passport from "passport";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { storage } from "./storage.js";
import { User } from "../shared/schema.js";
import { PLAN_CAPABILITIES, normalizePlan } from "../shared/planCapabilities.js";
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
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkClient = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

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

}

// =====================================
// HELPERS & MIDDLEWARES
// =====================================

export function requireAuth(req: any, res: any, next: NextFunction) {
  const ensureAuth = async () => {
    if (req.isAuthenticated()) {
      return true;
    }

    const authHeader = req.headers.authorization as string | undefined;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const cookieHeader = String(req.headers.cookie || "");
    const sessionCookie = cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("__session="))
      ?.split("=")[1];

    const clerkToken = bearerToken || sessionCookie;
    if (!clerkToken || !clerkSecretKey) {
      return false;
    }

    try {
      const payload = await verifyToken(clerkToken, { secretKey: clerkSecretKey });
      const claims = payload as Record<string, any>;
      const clerkUserId = typeof claims.sub === "string" ? claims.sub : "";
      if (!clerkUserId) {
        return false;
      }
      req.clerkUserId = clerkUserId;

      // 1. Fast path: the Clerk id is already linked to a user row (RJ-1.1).
      let user = await storage.getUserByClerkId(clerkUserId);

      if (!user) {
        // 2. First login after RJ-1.1 (or a brand new user): resolve the email from Clerk.
        //    Only a VERIFIED primary email may be used to link to an existing row,
        //    otherwise anyone could claim an account by adding an unverified address.
        if (!clerkClient) {
          return false;
        }
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const primary = clerkUser.primaryEmailAddress;
        const email = primary?.emailAddress?.toLowerCase();
        if (!email || primary?.verification?.status !== "verified") {
          console.warn(`[auth] Clerk user ${clerkUserId} has no verified primary email; refusing.`);
          return false;
        }

        const existing = await storage.getUserByEmail(email);
        if (existing) {
          if (existing.clerkUserId && existing.clerkUserId !== clerkUserId) {
            // The row is already linked to a different Clerk account. Never merge accounts.
            console.warn(`[auth] Email ${email} is linked to another Clerk id; refusing ${clerkUserId}.`);
            return false;
          }
          user = existing.clerkUserId ? existing : await storage.setUserClerkId(existing.id, clerkUserId);
        } else {
          // Trial dura 7 dias a partir do primeiro login.
          const TRIAL_DURATION_DAYS = 7;
          const now = new Date();
          const trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

          user = await storage.createUser({
            clerkUserId,
            email,
            password: "clerk_oauth_user",
            firstName: clerkUser.firstName || "",
            lastName: clerkUser.lastName || "",
            role: "user",
            isActive: true,
            credits: 10,
            selectedPlan: "trial",
            subscriptionPlan: "trial",
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            creditsUsedThisPeriod: 0,
          } as any);
        }
      }

      if (!user || !user.isActive) {
        return false;
      }

      req.user = user;
      return true;
    } catch (error) {
      console.error("[auth] requireAuth failed:", (error as Error)?.message);
      return false;
    }
  };

  ensureAuth()
    .then((isAuthed) => {
      if (!isAuthed) {
        return res.status(401).json({ message: "Sessão expirada ou inválida." });
      }
      next();
    })
    .catch(() => res.status(401).json({ message: "Sessão expirada ou inválida." }));
}

export function requireFeature(feature: keyof (typeof PLAN_CAPABILITIES)["trial"]) {
  return (req: any, res: any, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Autenticação necessária." });
    }

    if (user.isAdmin || user.isSuperAdmin) {
      return next();
    }

    const plan = normalizePlan(user.selectedPlan || user.subscriptionPlan);
    const capabilities = PLAN_CAPABILITIES[plan];

    if (!capabilities[feature]) {
      return res.status(403).json({
        message: "Funcionalidade indisponível no plano atual.",
        code: "FEATURE_UPGRADE_REQUIRED",
        feature,
        plan
      });
    }

    next();
  };
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