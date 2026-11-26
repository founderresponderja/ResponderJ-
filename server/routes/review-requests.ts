// RJ-16.3: pedidos de avaliação por QR code e WhatsApp.
// GET  /api/review-requests?establishmentId=  -> página pública, ligações e mensagem (cria o código na 1.ª vez)
// PUT  /api/review-requests                    -> guarda ligações e mensagem
// GET  /api/review-requests/public/:token      -> dados da página pública (sem sessão)

import { Router } from "express";
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { establishments } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { REVIEW_PLATFORMS, cleanReviewLink, defaultReviewMessage, type ReviewPlatform } from "../../shared/review-requests.js";

const router = Router();
const baseUrl = () => process.env.APP_BASE_URL || "https://www.responderja.pt";
const newToken = () => Array.from(randomBytes(10), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

async function ownedEstablishment(userId: number, requested: unknown) {
  const rows = await db.select().from(establishments).where(eq(establishments.userId, userId));
  const id = requested ? Number(requested) : rows[0]?.id;
  return rows.find((r) => r.id === id) ?? null;
}

async function ensureToken(est: typeof establishments.$inferSelect): Promise<string> {
  if (est.reviewPageToken) return est.reviewPageToken;
  for (let i = 0; i < 3; i++) {
    try {
      const [u] = await db.update(establishments).set({ reviewPageToken: newToken() })
        .where(and(eq(establishments.id, est.id), sql`${establishments.reviewPageToken} IS NULL`))
        .returning({ token: establishments.reviewPageToken });
      if (u?.token) return u.token;
      const [again] = await db.select({ token: establishments.reviewPageToken }).from(establishments).where(eq(establishments.id, est.id));
      if (again?.token) return again.token;
    } catch {
      // código repetido: tenta outro
    }
  }
  throw new Error("Não foi possível criar a página.");
}

router.get("/public/:token", async (req, res) => {
  const token = String(req.params.token || "").toLowerCase();
  if (!/^[a-z0-9]{8,40}$/.test(token)) return res.status(404).json({ message: "Página não encontrada." });
  const [est] = await db.select({ name: establishments.name, logoUrl: establishments.logoUrl, links: establishments.reviewLinks })
    .from(establishments).where(eq(establishments.reviewPageToken, token));
  if (!est) return res.status(404).json({ message: "Página não encontrada." });
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ name: est.name, logoUrl: est.logoUrl, links: est.links || {} });
});

router.get("/", requireAuth, async (req: any, res) => {
  const est = await ownedEstablishment(Number(req.user.id), req.query.establishmentId);
  if (!est) return res.status(404).json({ message: "Crie primeiro o perfil do negócio." });
  try {
    const token = await ensureToken(est);
    res.json({
      establishmentId: est.id,
      businessName: est.name,
      pageUrl: `${baseUrl()}/avaliar/${token}`,
      links: est.reviewLinks || {},
      message: est.reviewMessage || defaultReviewMessage(est.name),
    });
  } catch (error: any) {
    console.error("[review-requests] get failed:", error?.message);
    res.status(500).json({ message: "Não foi possível preparar a página. Tente novamente." });
  }
});

router.put("/", requireAuth, async (req: any, res) => {
  const est = await ownedEstablishment(Number(req.user.id), req.body?.establishmentId);
  if (!est) return res.status(404).json({ message: "Negócio não encontrado." });
  const links: Partial<Record<ReviewPlatform, string>> = {};
  for (const platform of REVIEW_PLATFORMS) {
    const { url, error } = cleanReviewLink(platform, req.body?.links?.[platform]);
    if (error) return res.status(400).json({ message: error });
    if (url) links[platform] = url;
  }
  const message = String(req.body?.message ?? "").trim();
  if (message.length > 600) return res.status(400).json({ message: "A mensagem pode ter no máximo 600 caracteres." });
  await db.update(establishments)
    .set({ reviewLinks: links, reviewMessage: message || null, updatedAt: new Date() })
    .where(eq(establishments.id, est.id));
  res.json({ links, message: message || defaultReviewMessage(est.name) });
});

export default router;
