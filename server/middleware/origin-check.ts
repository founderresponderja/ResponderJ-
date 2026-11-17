/**
 * RJ-1.6 — Proteção contra pedidos forjados (CSRF) por verificação de origem.
 *
 * Substitui o antigo sistema de tokens CSRF, que não protegia nada: qualquer
 * pessoa podia pedir um token válido a /api/csrf-token, porque o token não
 * estava ligado ao utilizador. Ao mesmo tempo, bloqueava os ecrãs que não o
 * enviavam (CRM, perfil do negócio, regras de automação, convites de agência).
 *
 * Regra (OWASP "Fetch Metadata" + verificação de Origin):
 *  - Só se aplica a métodos que alteram dados (POST, PUT, PATCH, DELETE).
 *  - Se o navegador enviar Sec-Fetch-Site, só aceita same-origin, same-site ou none.
 *  - Senão, se houver Origin, tem de corresponder ao próprio servidor ou a um domínio permitido.
 *  - Pedidos sem nenhum destes cabeçalhos (Stripe, cron, curl, apps móveis) passam:
 *    não vêm de um navegador, por isso não podem aproveitar os cookies de um utilizador.
 */
import type { Request, Response, NextFunction } from "express";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

const STATIC_ALLOWED_HOSTS = new Set([
  "www.responderja.pt",
  "responderja.pt",
  "responder-ja.vercel.app",
]);

function extraAllowedHosts(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS || "";
  const hosts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).host;
      } catch {
        return value;
      }
    });
  return new Set(hosts);
}

function requestHost(req: Request): string {
  const forwarded = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  return (forwarded || String(req.headers.host || "")).toLowerCase();
}

export function isAllowedOrigin(origin: string, req: Request): boolean {
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  if (host === requestHost(req)) return true;
  if (STATIC_ALLOWED_HOSTS.has(host)) return true;
  if (extraAllowedHosts().has(host)) return true;
  if (process.env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;
  return false;
}

export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (!STATE_CHANGING.has(req.method)) return next();

  const fetchSite = String(req.headers["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite) {
    if (ALLOWED_FETCH_SITES.has(fetchSite)) return next();
    return reject(req, res, `sec-fetch-site=${fetchSite}`);
  }

  const origin = String(req.headers.origin || "");
  if (origin && origin !== "null") {
    if (isAllowedOrigin(origin, req)) return next();
    return reject(req, res, `origin=${origin}`);
  }
  if (origin === "null") return reject(req, res, "origin=null");

  return next();
}

function reject(req: Request, res: Response, reason: string) {
  console.warn(`[origin-check] blocked ${req.method} ${req.path} (${reason})`);
  return res.status(403).json({
    error: "Pedido de origem não autorizada",
    code: "CROSS_ORIGIN_BLOCKED",
  });
}
