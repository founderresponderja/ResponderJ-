/**
 * /api/reviews — leitura das reviews guardadas (RJ-4.7).
 *
 * Antes: misturava o histórico de gerações com uma busca "ao vivo" ao Google através de contas
 * corporativas (de outra funcionalidade), convertia 1-2 estrelas em 3 e devolvia quase sempre
 * vazio. Agora lê da base de dados, só dos estabelecimentos do utilizador, com a resposta mais
 * recente de cada review. É também o endpoint de leitura para as futuras apps móveis (RJ-11).
 */
import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { establishments, responses } from "../../shared/schema.js";
import { requireAuth } from "../auth.js";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = Number(req.user?.id);
    const owned = await db.select({ id: establishments.id }).from(establishments).where(eq(establishments.userId, userId));
    const requested = req.query.establishmentId ? Number(req.query.establishmentId) : null;
    if (requested !== null && !owned.some((e) => e.id === requested)) {
      return res.status(403).json({ message: "Estabelecimento inválido." });
    }
    const estIds = requested !== null ? [requested] : owned.map((e) => e.id);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    if (estIds.length === 0) return res.json({ items: [], total: 0, limit, offset });

    const status = String(req.query.status || "");
    const statusCond =
      status === "pending" ? sql`AND COALESCE(resp.is_published, false) = false AND r.external_response_text IS NULL`
        : status === "responded" ? sql`AND (resp.is_published = true OR r.external_response_text IS NOT NULL)`
          : sql``;
    const inEst = sql`r.establishment_id IN (${sql.join(estIds.map((id) => sql`${id}`), sql`, `)})`;

    const { rows } = await db.execute(sql`
      SELECT r.id, r.establishment_id, r.platform, r.external_id, r.author_name, r.rating, r.review_text,
             r.language, r.sentiment, r.review_date, r.external_response_text, r.external_response_at,
             resp.id AS response_id, resp.response_text, resp.approval_status, resp.is_published, resp.published_at
      FROM reviews r
      LEFT JOIN LATERAL (
        SELECT id, response_text, approval_status, is_published, published_at
        FROM responses WHERE review_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1
      ) resp ON true
      WHERE ${inEst} ${statusCond}
      ORDER BY r.review_date DESC NULLS LAST, r.id DESC
      LIMIT ${limit} OFFSET ${offset}`);
    const { rows: countRows } = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM reviews r
      LEFT JOIN LATERAL (SELECT is_published FROM responses WHERE review_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) resp ON true
      WHERE ${inEst} ${statusCond}`);

    res.json({ items: rows, total: Number((countRows[0] as any)?.total ?? 0), limit, offset });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Editar o texto de uma resposta. Só o dono da resposta (RJ-1.7: antes qualquer utilizador podia editar qualquer resposta).
router.patch("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user?.id);
    const [existing] = await db.select().from(responses).where(and(eq(responses.id, id), eq(responses.userId, userId)));
    if (!existing) return res.status(404).json({ message: "Resposta não encontrada." });

    const responseText = typeof req.body?.responseText === "string" ? req.body.responseText.trim() : "";
    if (responseText.length === 0 || responseText.length > 5000) {
      return res.status(400).json({ message: "Texto da resposta inválido." });
    }
    const [updated] = await db.update(responses).set({
      responseText,
      originalResponseText: existing.originalResponseText ?? existing.responseText,
      editCount: sql`coalesce(${responses.editCount}, 0) + 1`,
      approvalStatus: "edited",
    }).where(eq(responses.id, id)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Error updating review" });
  }
});

export default router;
