/**
 * Papéis do backoffice.
 *  - Operador: gere a plataforma (backoffice, "ver como cliente").
 *  - Super administrador: tudo o que o operador faz + gerir operadores e transferir a função.
 * Os clientes nunca têm estes papéis.
 */
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db.js";
import { adminAuditLog } from "../../shared/schema.js";

export type PlatformRole = "super_admin" | "operator" | "customer";

export function platformRole(user: any): PlatformRole {
  if (!user) return "customer";
  if (user.isSuperAdmin) return "super_admin";
  if (user.isAdmin) return "operator";
  return "customer";
}

export function isOperator(user: any): boolean {
  return platformRole(user) !== "customer";
}

export function requireOperator(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Autenticação necessária." });
  if (!isOperator(req.user)) return res.status(403).json({ message: "Acesso reservado a operadores." });
  next();
}

export function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Autenticação necessária." });
  if (platformRole(req.user) !== "super_admin") {
    return res.status(403).json({ message: "Acesso reservado ao super administrador." });
  }
  next();
}

export async function recordAdminAction(
  req: any,
  action: string,
  opts: { targetUserId?: number | null; details?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(adminAuditLog).values({
      actorUserId: req.user?.id ?? null,
      action,
      targetUserId: opts.targetUserId ?? null,
      details: opts.details ?? null,
      ip: String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || null,
    });
  } catch (error: any) {
    // O registo nunca pode partir a ação; mas o erro tem de aparecer nos registos.
    console.error("[audit] failed to record admin action:", action, error?.message);
  }
}

/** Regista "backoffice_open" no máximo uma vez a cada 30 minutos por operador (= uma sessão). */
export async function recordBackofficeSession(req: any) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const [recent] = await db
    .select({ id: adminAuditLog.id })
    .from(adminAuditLog)
    .where(and(
      eq(adminAuditLog.actorUserId, req.user.id),
      eq(adminAuditLog.action, "backoffice_open"),
      gte(adminAuditLog.createdAt, since),
    ))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(1);
  if (!recent) await recordAdminAction(req, "backoffice_open");
}
