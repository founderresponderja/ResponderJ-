// RJ-4.7: regras da ligação ao Facebook sem rede nem base de dados (testadas em
// tests/facebook-logic.test.ts). As chamadas à Graph API estão em facebook-reviews-service.ts.

import crypto from "node:crypto";

export type FacebookEnv = Record<string, string | undefined>;

export function facebookAppCredentials(env: FacebookEnv) {
  const appId = env.FACEBOOK_APP_ID || env.FACEBOOK_CLIENT_ID || "";
  const appSecret = env.FACEBOOK_APP_SECRET || env.FACEBOOK_CLIENT_SECRET || "";
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}

/**
 * Quem pode ligar o Facebook.
 * - Antes da aprovação da Meta: só os emails em FACEBOOK_TEST_EMAILS (contas com papel na app
 *   da Meta, que funciona em "modo de desenvolvimento" só para essas pessoas).
 * - Depois da aprovação: toda a gente, com FACEBOOK_REVIEWS_ENABLED=true.
 * Sem App ID e App Secret configurados, ninguém.
 */
export function facebookAvailableFor(email: string | null | undefined, env: FacebookEnv): boolean {
  if (!facebookAppCredentials(env).configured) return false;
  if (String(env.FACEBOOK_REVIEWS_ENABLED || "").toLowerCase() === "true") return true;
  const allowed = String(env.FACEBOOK_TEST_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(String(email).trim().toLowerCase());
}

/** Permissões pedidas: listar páginas, ler as recomendações e responder como a página. */
export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_engagement",
];

export interface FacebookRating {
  created_time?: string;
  recommendation_type?: "positive" | "negative" | string;
  review_text?: string;
  rating?: number;
  has_rating?: boolean;
  reviewer?: { id?: string; name?: string };
  open_graph_story?: { id?: string };
}

/**
 * Converte uma recomendação do Facebook numa review da app.
 * O Facebook usa "recomendo / não recomendo" em vez de estrelas: o sentimento vem daí e a
 * classificação só é preenchida se a página ainda tiver estrelas antigas (1-5).
 * Sem o id da história não é possível responder, por isso fica de fora (devolve null).
 */
export function mapFacebookRating(item: FacebookRating) {
  const storyId = item.open_graph_story?.id;
  if (!storyId) return null;
  const rating = Number.isInteger(item.rating) && (item.rating as number) >= 1 && (item.rating as number) <= 5
    ? (item.rating as number)
    : null;
  const sentiment =
    item.recommendation_type === "positive" ? "positive"
    : item.recommendation_type === "negative" ? "negative"
    : rating !== null ? (rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative")
    : null;
  const date = item.created_time ? new Date(item.created_time) : new Date();
  return {
    platform: "facebook" as const,
    externalId: storyId,
    authorName: item.reviewer?.name || "Cliente Facebook",
    rating,
    reviewText: item.review_text || "",
    sentiment,
    reviewDate: Number.isFinite(date.getTime()) ? date : new Date(),
  };
}

/**
 * Pedido de apagamento de dados enviado pela Meta (exigido para a aprovação da app).
 * Verifica a assinatura HMAC-SHA256 com o App Secret e devolve o id do utilizador do Facebook.
 */
export function parseSignedRequest(signedRequest: string, appSecret: string): { user_id?: string } | null {
  if (!signedRequest || !appSecret || !signedRequest.includes(".")) return null;
  const [encodedSig, payload] = signedRequest.split(".", 2);
  const fromB64Url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = crypto.createHmac("sha256", appSecret).update(payload).digest();
  const given = fromB64Url(encodedSig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(fromB64Url(payload).toString("utf8"));
    if (String(data.algorithm || "").toUpperCase() !== "HMAC-SHA256") return null;
    return data;
  } catch {
    return null;
  }
}
