
import { Router } from "express";
import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { establishments, responses, reviews, socialPlatformConnections } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";
import { protectCSRF } from "../middleware/csrf.js";
import { GoogleReviewsService } from "../services/google-reviews-service.js";
import { reviewSyncService } from "../services/review-sync-service.js";

const router = Router();

function resolveUserId(req: any): number | null {
  const raw = req.user?.id;
  const maybe = Number(raw);
  if (Number.isFinite(maybe) && maybe > 0) return maybe;
  return null;
}

async function getGoogleConnectionExternalId(establishmentId: number): Promise<string | null> {
  const [conn] = await db
    .select({ userExternalId: socialPlatformConnections.userExternalId })
    .from(socialPlatformConnections)
    .where(and(
      eq(socialPlatformConnections.establishmentId, establishmentId),
      eq(socialPlatformConnections.platform, "google"),
      eq(socialPlatformConnections.status, "connected"),
    ))
    .limit(1);
  return conn?.userExternalId ?? null;
}

// GET /api/inbox
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [establishment] = await db
      .select({ id: establishments.id })
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);
    if (!establishment) return res.json({ items: [], page: 1, pageSize: 25, total: 0 });

    const estId = establishment.id;
    const statusFilter = (req.query.status as string | undefined) ?? "";
    const platformFilter = (req.query.platform as string | undefined) ?? "";
    const ratingFilter = req.query.rating ? Number(req.query.rating) : 0;
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const platformCond = platformFilter ? sql`AND r.platform = ${platformFilter}` : sql``;
    const ratingCond = ratingFilter ? sql`AND r.rating = ${ratingFilter}` : sql``;
    const statusCond =
      statusFilter === "responded"
        ? sql`AND (resp.is_published = true OR r.external_response_text IS NOT NULL)`
        : statusFilter === "pending"
          ? sql`AND (COALESCE(resp.is_published, false) = false AND r.external_response_text IS NULL)`
          : sql``;

    const lateralJoin = sql`
      LEFT JOIN LATERAL (
        SELECT id, response_text, is_published, published_at, approval_status, tone, language
        FROM responses
        WHERE review_id = r.id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) resp ON true`;

    const whereCond = sql`
      WHERE r.establishment_id = ${estId}
      ${platformCond}
      ${ratingCond}
      ${statusCond}`;

    const { rows } = await db.execute(sql`
      SELECT
        r.id, r.platform, r.external_id, r.author_name, r.rating,
        r.review_text, r.language, r.sentiment, r.review_date,
        r.external_response_text, r.external_response_at, r.created_at,
        resp.id              AS response_id,
        resp.response_text   AS response_text,
        resp.is_published    AS is_published,
        resp.published_at    AS published_at,
        resp.approval_status AS approval_status,
        resp.tone            AS response_tone,
        resp.language        AS response_language
      FROM reviews r
      ${lateralJoin}
      ${whereCond}
      ORDER BY r.review_date DESC NULLS LAST, r.id DESC
      LIMIT ${pageSize} OFFSET ${offset}`);

    const { rows: countRows } = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM reviews r
      ${lateralJoin}
      ${whereCond}`);

    res.json({
      items: rows,
      page,
      pageSize,
      total: Number((countRows[0] as any)?.total ?? 0),
    });
  } catch (error) {
    console.error("Inbox fetch error:", error);
    res.status(500).json({ message: "Erro ao obter inbox" });
  }
});

// POST /api/inbox/sync
router.post("/sync", requireAuth, protectCSRF, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await reviewSyncService.syncAllConnectedPlatforms();
    res.json({ ok: true });
  } catch (error: any) {
    console.error("Inbox sync error:", error);
    res.status(500).json({ message: "Erro ao sincronizar", detail: error?.message });
  }
});

// POST /api/inbox/manual — registar review manualmente (sem sync)
router.post("/manual", requireAuth, protectCSRF, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      platform,
      authorName,
      rating,
      reviewText,
      reviewDate,
      externalResponseText,
      externalResponseAt,
    } = req.body ?? {};

    const allowedPlatforms = ["google", "booking", "tripadvisor", "facebook", "instagram"];
    if (!platform || typeof platform !== "string" || !allowedPlatforms.includes(platform)) {
      return res.status(400).json({ message: "Plataforma inválida" });
    }

    if (!reviewText || typeof reviewText !== "string" || !reviewText.trim()) {
      return res.status(400).json({ message: "Texto da review é obrigatório" });
    }
    if (reviewText.length > 5000) {
      return res.status(400).json({ message: "Texto da review excede 5000 caracteres" });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Classificação deve ser um inteiro entre 1 e 5" });
    }

    // External response: ambos os campos andam juntos
    const hasExternalReply =
      typeof externalResponseText === "string" && externalResponseText.trim().length > 0;
    if (hasExternalReply && externalResponseText.length > 5000) {
      return res.status(400).json({ message: "Texto da resposta externa excede 5000 caracteres" });
    }

    // Resolver establishment via userId (padrão do ficheiro)
    const [establishment] = await db
      .select({ id: establishments.id })
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);
    if (!establishment) {
      return res.status(404).json({ message: "Estabelecimento não encontrado" });
    }

    // Datas: aceitar ISO string OU "YYYY-MM-DD"; se for só data, fixar meio-dia local
    const parseDateInput = (raw: unknown): Date | null => {
      if (typeof raw !== "string" || !raw.trim()) return null;
      // YYYY-MM-DD → meio-dia local (evita drift de fuso para dia anterior)
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(raw + "T12:00:00");
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const now = new Date();
    const reviewDateParsed = reviewDate ? parseDateInput(reviewDate) : now;
    if (reviewDate && !reviewDateParsed) {
      return res.status(400).json({ message: "Data da review inválida" });
    }

    const externalResponseAtParsed = hasExternalReply
      ? (externalResponseAt ? parseDateInput(externalResponseAt) : now)
      : null;
    if (hasExternalReply && externalResponseAt && !externalResponseAtParsed) {
      return res.status(400).json({ message: "Data da resposta externa inválida" });
    }

    const externalId = `manual:${crypto.randomUUID()}`;

    const [created] = await db
      .insert(reviews)
      .values({
        establishmentId: establishment.id,
        platform,
        externalId,
        authorName: typeof authorName === "string" && authorName.trim() ? authorName.trim() : null,
        rating: ratingNum,
        reviewText: reviewText.trim(),
        reviewDate: reviewDateParsed,
        externalResponseText: hasExternalReply ? externalResponseText.trim() : null,
        externalResponseAt: externalResponseAtParsed,
      })
      .returning();

    res.json({ ok: true, review: created });
  } catch (error: any) {
    console.error("Inbox manual create error:", error);
    res.status(500).json({ message: "Erro ao criar review manual", detail: error?.message });
  }
});

// POST /api/inbox/:reviewId/publish
router.post("/:reviewId/publish", requireAuth, protectCSRF, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reviewId = Number(req.params.reviewId);
    const responseId = Number(req.body?.responseId);
    if (!reviewId || !responseId) {
      return res.status(400).json({ message: "reviewId e responseId são obrigatórios" });
    }

    const [establishment] = await db
      .select({ id: establishments.id })
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);
    if (!establishment) return res.status(404).json({ message: "Estabelecimento não encontrado" });

    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.establishmentId, establishment.id)))
      .limit(1);
    if (!review) return res.status(404).json({ message: "Review não encontrada" });

    if (!review.externalId) {
      return res.status(400).json({ message: "Review sem ID externo — não pode ser publicada via API" });
    }

    const [response] = await db
      .select()
      .from(responses)
      .where(and(
        eq(responses.id, responseId),
        eq(responses.reviewId, reviewId),
        eq(responses.userId, userId),
      ))
      .limit(1);
    if (!response) return res.status(404).json({ message: "Resposta não encontrada" });
    if (response.approvalStatus !== "approved" && response.approvalStatus !== "edited") {
      return res.status(400).json({ message: "Resposta ainda não aprovada" });
    }
    if (response.isPublished) {
      return res.status(409).json({ message: "Resposta já publicada" });
    }

    const userExternalId = await getGoogleConnectionExternalId(establishment.id);
    if (!userExternalId) {
      return res.status(409).json({
        message: "Plataforma Google não conectada para este estabelecimento",
      });
    }

    try {
      await GoogleReviewsService.replyToReview(
        userExternalId,
        review.externalId,
        response.responseText,
        establishment.id,
      );
    } catch (error: any) {
      return res.status(502).json({
        ok: false,
        error: "google_api_failed",
        detail: error?.message,
      });
    }

    const publishedAt = new Date();
    await db
      .update(responses)
      .set({ isPublished: true, publishedAt })
      .where(eq(responses.id, responseId));

    res.json({ ok: true, publishedAt });
  } catch (error) {
    console.error("Inbox publish error:", error);
    res.status(500).json({ message: "Erro ao publicar resposta" });
  }
});

// POST /api/inbox/:reviewId/unpublish
router.post("/:reviewId/unpublish", requireAuth, protectCSRF, async (req: any, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reviewId = Number(req.params.reviewId);
    const responseId = Number(req.body?.responseId);
    if (!reviewId || !responseId) {
      return res.status(400).json({ message: "reviewId e responseId são obrigatórios" });
    }

    const [establishment] = await db
      .select({ id: establishments.id })
      .from(establishments)
      .where(eq(establishments.userId, userId))
      .limit(1);
    if (!establishment) return res.status(404).json({ message: "Estabelecimento não encontrado" });

    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.establishmentId, establishment.id)))
      .limit(1);
    if (!review) return res.status(404).json({ message: "Review não encontrada" });

    if (!review.externalId) {
      return res.status(400).json({ message: "Review sem ID externo — não pode ser despublicada via API" });
    }

    const [response] = await db
      .select()
      .from(responses)
      .where(and(
        eq(responses.id, responseId),
        eq(responses.reviewId, reviewId),
        eq(responses.userId, userId),
      ))
      .limit(1);
    if (!response) return res.status(404).json({ message: "Resposta não encontrada" });
    if (!response.isPublished) {
      return res.status(409).json({ message: "Resposta não está publicada" });
    }

    const userExternalId = await getGoogleConnectionExternalId(establishment.id);
    if (!userExternalId) {
      return res.status(409).json({
        message: "Plataforma Google não conectada para este estabelecimento",
      });
    }

    try {
      await GoogleReviewsService.deleteReply(
        userExternalId,
        review.externalId,
        establishment.id,
      );
    } catch (error: any) {
      return res.status(502).json({
        ok: false,
        error: "google_api_failed",
        detail: error?.message,
      });
    }

    await db
      .update(responses)
      .set({ isPublished: false, publishedAt: null })
      .where(eq(responses.id, responseId));

    return res.json({ ok: true });
  } catch (error) {
    console.error("Inbox unpublish error:", error);
    res.status(500).json({ message: "Erro ao cancelar publicação" });
  }
});

export default router;
