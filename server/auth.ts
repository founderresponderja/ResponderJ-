import { Express, Request, Response, NextFunction } from "express";
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
  // Authentication is Clerk-only (RJ-1.2): no express-session, no passport.
  // requireAuth verifies the Clerk token on every request.
  // Necessário para req.ip / cookies seguros atrás do proxy da Vercel.
  app.set("trust proxy", 1);
}

// =====================================
// HELPERS & MIDDLEWARES
// =====================================

export function requireAuth(req: any, res: any, next: NextFunction) {
  const ensureAuth = async () => {
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
          if ((existing as any).isSandbox) {
            // Contas-sandbox nunca têm login próprio.
            console.warn(`[auth] refusing to link Clerk ${clerkUserId} to sandbox account ${email}.`);
            return false;
          }
          user = existing.clerkUserId ? existing : await storage.setUserClerkId(existing.id, clerkUserId);
        } else {
          // Trial a partir do primeiro login; duração e créditos vêm de shared/plans.ts (RJ-2.1).
          const { PLANS } = await import("../shared/plans.js");
          const TRIAL_DURATION_DAYS = PLANS.trial.trialDays ?? 7;
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
            credits: PLANS.trial.monthlyResponses,
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

      // Última atividade (usada no backoffice). No máximo uma escrita por hora por utilizador.
      const last = user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0;
      if (Date.now() - last > 60 * 60 * 1000) {
        storage.updateUser(user.id, { lastLoginAt: new Date() } as any).catch((error: any) =>
          console.warn("[auth] could not update lastLoginAt:", error?.message));
      }
      return true;
    } catch (error) {
      console.error("[auth] requireAuth failed:", (error as Error)?.message);
      return false;
    }
  };

  ensureAuth()
    .then(async (isAuthed) => {
      if (!isAuthed) {
        return res.status(401).json({ message: "Sessão expirada ou inválida." });
      }
      const blocked = await applyViewAs(req);
      if (blocked) return res.status(blocked.status).json({ message: blocked.message, code: blocked.code });
      const memberBlocked = await applyAgencyMembership(req);
      if (memberBlocked) return res.status(memberBlocked.status).json({ message: memberBlocked.message, code: memberBlocked.code });
      next();
    })
    .catch(() => res.status(401).json({ message: "Sessão expirada ou inválida." }));
}

// ---------------------------------------------------------------------------
// "Ver como cliente" (backoffice): um operador envia X-View-As: <id da sandbox>
// e o pedido corre como essa conta-sandbox. Nunca funciona com clientes reais.
// ---------------------------------------------------------------------------
const SANDBOX_BLOCKED: { method?: string; pattern: RegExp; what: string }[] = [
  { pattern: /^\/api\/billing\/(create-checkout-session|subscription|portal|cancel)/, what: "pagamentos" },
  { method: "POST", pattern: /^\/api\/platforms\/(connect|disconnect|sync)/, what: "ligações a plataformas reais" },
  { method: "GET", pattern: /^\/api\/platforms\/sync\//, what: "sincronização com plataformas reais" },
  { method: "POST", pattern: /^\/api\/inbox\/(sync|\d+\/publish|\d+\/unpublish)/, what: "sincronizar ou publicar nas plataformas" },
  { method: "POST", pattern: /^\/api\/agency\/(invite-member|delegate-admin)/, what: "envio de convites" },
  { method: "POST", pattern: /^\/api\/invitations\//, what: "convites" },
];
const SANDBOX_AI_PATHS = [/^\/api\/generate-response/, /^\/api\/responses\/\d+\/regenerate/, /^\/api\/reviews-ai\/generate/];

async function applyViewAs(req: any): Promise<{ status: number; message: string; code: string } | null> {
  const raw = req.headers?.["x-view-as"];
  if (!raw) return null;
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  if (path.startsWith("/api/backoffice")) return null; // o backoffice corre sempre como o próprio operador
  const operator = req.user;
  if (!(operator?.isAdmin || operator?.isSuperAdmin)) {
    return { status: 403, message: "Modo de teste reservado a operadores.", code: "VIEW_AS_FORBIDDEN" };
  }
  const target = await storage.getUser(Number(raw));
  if (!target || !(target as any).isSandbox) {
    return { status: 403, message: "Só é possível ver como contas-sandbox.", code: "VIEW_AS_NOT_SANDBOX" };
  }
  req.operator = operator;
  req.viewAsSandbox = true;
  req.user = target;

  const method = String(req.method || "GET").toUpperCase();
  const hit = SANDBOX_BLOCKED.find((rule) => (!rule.method || rule.method === method) && rule.pattern.test(path));
  if (hit) {
    return { status: 403, message: `Indisponível em modo de teste: ${hit.what}.`, code: "SANDBOX_BLOCKED" };
  }
  if (method === "POST" && SANDBOX_AI_PATHS.some((p) => p.test(path))) {
    const { sandboxGenerationsToday, SANDBOX_DAILY_AI_LIMIT } = await import("./services/sandbox.js");
    if ((await sandboxGenerationsToday()) >= SANDBOX_DAILY_AI_LIMIT) {
      return { status: 429, message: `Limite diário de ${SANDBOX_DAILY_AI_LIMIT} gerações de IA nas sandboxes atingido.`, code: "SANDBOX_AI_LIMIT" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// RJ-5.5: membros da equipa de uma agência trabalham na conta da agência.
// Um membro ativo (convidado e aceite) passa a ver e a trabalhar nos clientes,
// reviews e respostas da agência, e gasta os créditos do plano da agência.
// O pedido corre como o dono (req.user) e guarda quem o fez (req.member).
// Pagamentos e gestão da equipa ficam reservados ao dono (e a admins da equipa).
// ---------------------------------------------------------------------------
async function applyAgencyMembership(req: any): Promise<{ status: number; message: string; code: string } | null> {
  const user = req.user;
  if (!user?.agencyId || user.isAdmin || user.isSuperAdmin) return null;
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  const { memberKeepsOwnIdentity, memberBlockedReason } = await import("./middleware/member-rules.js");
  if (memberKeepsOwnIdentity(path)) return null;
  try {
    const { db } = await import("./db.js");
    const { agencies, agencyMembers } = await import("../shared/schema.js");
    const { and, eq } = await import("drizzle-orm");
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, Number(user.agencyId)));
    if (!agency || Number(agency.ownerId) === Number(user.id)) return null;
    const [membership] = await db.select().from(agencyMembers).where(and(
      eq(agencyMembers.agencyId, agency.id),
      eq(agencyMembers.userId, Number(user.id)),
      eq(agencyMembers.status, "active"),
    ));
    // Membro removido ou suspenso: volta a ser só a sua própria conta.
    if (!membership) return null;
    const owner = await storage.getUser(Number(agency.ownerId));
    if (!owner || !owner.isActive) return null;

    req.member = user;
    req.memberRole = membership.role || "member";
    req.agency = agency;
    req.user = owner;

    const reason = memberBlockedReason(req.method, path);
    if (reason) {
      return { status: 403, message: `Indisponível para membros da equipa: ${reason}.`, code: "AGENCY_MEMBER_BLOCKED" };
    }
  } catch (error: any) {
    console.warn("[auth] agency membership check failed:", error?.message);
  }
  return null;
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
    if (!req.user) {
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