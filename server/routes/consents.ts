// RJ-7.2: registo de consentimentos com a versão de cada documento (termos, privacidade, cookies).
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { LEGAL_VERSIONS } from "../../shared/legal-versions.js";
import { acceptedRecords, cookieChoices, hashIp, pendingDocuments, type ConsentRow } from "../services/consent-logic.js";

const router = Router();

const clientIp = (req: any) => String(req.headers?.["x-forwarded-for"] || req.ip || "");
const userAgent = (req: any) => String(req.get?.("User-Agent") || "").slice(0, 300) || null;

async function rowsFor(userId: number): Promise<ConsentRow[]> {
  const { rows } = await db.execute(sql`
    SELECT kind, version, granted, created_at AS "createdAt"
    FROM consent_records WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 200`);
  return rows as any;
}

// O que falta aceitar na versão em vigor (a app mostra o pedido de aceitação se não estiver vazio).
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const rows = await rowsFor(Number(req.user.id));
    res.json({ versions: LEGAL_VERSIONS, pending: pendingDocuments(rows) });
  } catch (error: any) {
    console.error("[consents] status failed:", error?.message);
    // Nunca bloquear a app por falha do registo: devolve "nada pendente" e tenta de novo depois.
    res.json({ versions: LEGAL_VERSIONS, pending: [], unavailable: true });
  }
});

router.post("/accept", requireAuth, async (req: any, res) => {
  const records = acceptedRecords(req.body?.kinds);
  if (!records.length) return res.status(400).json({ message: "Indique os documentos aceites." });
  const ipHash = hashIp(clientIp(req));
  const ua = userAgent(req);
  for (const r of records) {
    await db.execute(sql`
      INSERT INTO consent_records (user_id, kind, version, granted, source, ip_hash, user_agent)
      VALUES (${Number(req.user.id)}, ${r.kind}, ${r.version}, true, 'app', ${ipHash}, ${ua})`);
  }
  const rows = await rowsFor(Number(req.user.id));
  res.json({ ok: true, pending: pendingDocuments(rows) });
});

// Escolhas de cookies: com sessão fica ligado à conta; sem sessão, a um identificador anónimo do navegador.
const optionalAuth = (req: any, res: any, next: any) => (req.headers?.authorization ? requireAuth(req, res, next) : next());
router.post("/cookies", optionalAuth, async (req: any, res) => {
  const userId = Number(req.user?.id) || null;
  const anonId = userId ? null : String(req.body?.anonId || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 64) || null;
  if (!userId && !anonId) return res.status(400).json({ message: "Identificador em falta." });
  const choices = cookieChoices(req.body);
  await db.execute(sql`
    INSERT INTO consent_records (user_id, anon_id, kind, version, granted, choices, source, ip_hash, user_agent)
    VALUES (${userId}, ${anonId}, 'cookies', ${LEGAL_VERSIONS.cookies}, true, ${JSON.stringify(choices)}::jsonb,
            'cookies_page', ${hashIp(clientIp(req))}, ${userAgent(req)})`);
  res.json({ ok: true, version: LEGAL_VERSIONS.cookies, choices });
});

// Histórico da própria pessoa (também sai na exportação de dados).
router.get("/mine", requireAuth, async (req: any, res) => {
  const { rows } = await db.execute(sql`
    SELECT kind, version, granted, choices, source, created_at
    FROM consent_records WHERE user_id = ${Number(req.user.id)} ORDER BY created_at DESC`);
  res.json(rows);
});

export default router;
