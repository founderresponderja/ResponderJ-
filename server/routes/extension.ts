// RJ-13.3: extensão de Chrome para gerar respostas dentro do Booking, Tripadvisor e Google.
// Na app (sessão normal):
//   GET    /api/extension/keys          -> chaves ativas (só os 4 últimos caracteres)
//   POST   /api/extension/keys          -> cria uma chave (mostrada uma única vez)
//   DELETE /api/extension/keys/:id      -> desliga uma chave
// Na extensão (Authorization: Bearer rjx_...):
//   GET    /api/extension/me            -> conta, créditos e negócios
//   POST   /api/extension/generate      -> 3 respostas para o texto da avaliação (1 crédito)

import { Router } from "express";
import { randomBytes } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "../db.js";
import { establishments, extensionKeys } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { generateRateLimit } from "../middleware/security.js";
import {
  MAX_ACTIVE_KEYS, extensionKeyFromHeader, hashExtensionKey, newExtensionKey,
} from "../services/extension-key-logic.js";

const router = Router();

// ---- Chaves (na app) -------------------------------------------------------

router.get("/keys", requireAuth, async (req: any, res) => {
  const rows = await db.select({
    id: extensionKeys.id, label: extensionKeys.label, lastFour: extensionKeys.lastFour,
    createdAt: extensionKeys.createdAt, lastUsedAt: extensionKeys.lastUsedAt,
  }).from(extensionKeys)
    .where(and(eq(extensionKeys.userId, Number(req.user.id)), isNull(extensionKeys.revokedAt)));
  res.json({ items: rows });
});

router.post("/keys", requireAuth, async (req: any, res) => {
  const userId = Number(req.user.id);
  if (req.viewAsSandbox) return res.status(403).json({ message: "Indisponível em modo de teste." });
  const [{ n }] = await db.select({ n: count() }).from(extensionKeys)
    .where(and(eq(extensionKeys.userId, userId), isNull(extensionKeys.revokedAt)));
  if (Number(n) >= MAX_ACTIVE_KEYS) return res.status(400).json({ message: `Pode ter no máximo ${MAX_ACTIVE_KEYS} chaves ativas. Desligue uma antes.` });
  const key = newExtensionKey((len) => randomBytes(len));
  const label = String(req.body?.label || "Chrome").trim().slice(0, 60) || "Chrome";
  const [row] = await db.insert(extensionKeys)
    .values({ userId, keyHash: hashExtensionKey(key), label, lastFour: key.slice(-4) })
    .returning({ id: extensionKeys.id });
  res.json({ id: row.id, key, label });
});

router.delete("/keys/:id", requireAuth, async (req: any, res) => {
  const [row] = await db.update(extensionKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(extensionKeys.id, Number(req.params.id)), eq(extensionKeys.userId, Number(req.user.id)), isNull(extensionKeys.revokedAt)))
    .returning({ id: extensionKeys.id });
  if (!row) return res.status(404).json({ message: "Chave não encontrada." });
  res.json({ ok: true });
});

// ---- Pedidos da extensão ---------------------------------------------------

async function requireExtensionKey(req: any, res: any, next: any) {
  const key = extensionKeyFromHeader(req.headers?.authorization);
  if (!key) return res.status(401).json({ message: "Ligue a extensão com uma chave criada na app (Definições → Extensão de Chrome)." });
  const [row] = await db.select().from(extensionKeys)
    .where(and(eq(extensionKeys.keyHash, hashExtensionKey(key)), isNull(extensionKeys.revokedAt)));
  if (!row) return res.status(401).json({ message: "Esta chave já não é válida. Crie uma nova na app." });
  const user = await storage.getUserById(row.userId);
  if (!user || (user as any).isActive === false) return res.status(401).json({ message: "Conta indisponível." });
  req.user = user;
  req.extensionKeyId = row.id;
  db.update(extensionKeys).set({ lastUsedAt: new Date() }).where(eq(extensionKeys.id, row.id)).catch(() => {});
  next();
}

router.get("/me", requireExtensionKey, async (req: any, res) => {
  const ests = await db.select({ id: establishments.id, name: establishments.name })
    .from(establishments).where(eq(establishments.userId, Number(req.user.id)));
  res.json({ email: req.user.email, credits: Number(req.user.credits ?? 0), establishments: ests });
});

router.post("/generate", requireExtensionKey, generateRateLimit, async (req: any, res) => {
  const userId = Number(req.user.id);
  const reviewText = String(req.body?.reviewText || "").trim();
  if (reviewText.length < 3) return res.status(400).json({ message: "Selecione o texto da avaliação." });
  if (reviewText.length > 5000) return res.status(400).json({ message: "O texto é demasiado longo (máximo 5000 caracteres)." });
  if (Number(req.user.credits ?? 0) < 1) return res.status(400).json({ message: "Créditos insuficientes" });

  const ests = await db.select().from(establishments).where(eq(establishments.userId, userId));
  const requested = req.body?.establishmentId ? Number(req.body.establishmentId) : ests[0]?.id;
  const est = ests.find((e) => e.id === requested) ?? null;
  if (requested && !est) return res.status(403).json({ message: "Negócio inválido." });
  const platform = ["google_maps", "booking", "tripadvisor", "facebook"].includes(String(req.body?.platform)) ? String(req.body.platform) : "google_maps";

  try {
    const { aiResponseService } = await import("../services/ai-response-service.js");
    const variations = await aiResponseService.generateReviewResponses({
      userId,
      reviewText,
      platform,
      tone: est?.brandTone || "profissional",
      language: typeof req.body?.language === "string" ? req.body.language : undefined,
      localSeoKeywords: [est?.name, est?.type].filter(Boolean) as string[],
      establishmentContext: est ? { name: est.name, type: est.type ?? undefined, responseGuidelines: est.responseGuidelines ?? undefined } : undefined,
    });
    if (!variations?.length) return res.status(502).json({ message: "A IA não devolveu respostas. Tente novamente." });
    // Na extensão não se sabe se a resposta é publicada: cobra-se 1 crédito por geração.
    const charge = await storage.deductUserCreditsAtomic(userId, 1);
    if (!charge.ok) return res.status(400).json({ message: "Créditos insuficientes" });
    res.json({
      language: variations[0].language,
      variations: variations.map((v) => ({ type: v.responseType, text: v.responseText })),
      creditsRemaining: charge.creditsRemaining,
    });
  } catch (error: any) {
    console.error("[extension] generate failed:", error?.message);
    res.status(500).json({ message: "Não foi possível gerar. Tente novamente." });
  }
});

export default router;
