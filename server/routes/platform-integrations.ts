import { Router } from "express";
import { PLANS, normalizePlan } from "../../shared/plans.js";
import crypto from "crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db.js";
import { establishments, socialPlatformConnections } from "../../shared/schema.js";
import { encryptSensitiveData, decryptSensitiveData } from "../encryption.js";
import { FacebookReviewsService } from "../services/facebook-reviews-service.js";
import { FACEBOOK_SCOPES, facebookAppCredentials, facebookAvailableFor, parseSignedRequest } from "../services/facebook-logic.js";
import { reviewSyncService } from "../services/review-sync-service.js";
import { storage } from "../storage.js";
import { requireAuth } from "../auth.js";

const router = Router();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const GOOGLE_CALLBACK_URL = "https://responderja.pt/api/platforms/callback/google";
const FACEBOOK_CALLBACK_URL = `${APP_BASE_URL}/api/platforms/callback/facebook`;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// RJ-2.1: limites de plataformas vêm de shared/plans.ts.
const PLAN_PLATFORM_LIMITS: Record<string, number> = Object.fromEntries(
  Object.values(PLANS).map((p) => [p.key, p.maxPlatforms === -1 ? Number.POSITIVE_INFINITY : p.maxPlatforms]),
);

function normalizePlanId(planId: string | undefined) {
  return String(planId || "free").toLowerCase();
}

function getPlanLimit(planId: string | undefined) {
  return PLAN_PLATFORM_LIMITS[normalizePlan(planId)] ?? PLAN_PLATFORM_LIMITS.trial;
}

// Identity comes only from the verified Clerk token (set by requireAuth).
// Never trust a clerkUserId sent in the request body or query string.
function resolveExternalUserId(req: any) {
  return String(req.clerkUserId || "").trim();
}

// Plan comes from the authenticated user record, never from the client.
function resolveUserPlanId(req: any) {
  return normalizePlanId(req.user?.subscriptionPlan || req.user?.selectedPlan || "free");
}

async function countConnectedPlatforms(userId: number, establishmentId: number) {
  const rows = await db.select().from(socialPlatformConnections).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.establishmentId, establishmentId),
    eq(socialPlatformConnections.status, "connected"),
  ));
  return rows.length;
}

function resolveUserId(req: any): number | null {
  const id = Number(req.user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// Every connection belongs to a real establishment of the authenticated user (RJ-1.1).
// - If the client names an establishment (agency mode), it must belong to this user.
// - Otherwise use the user's first establishment, creating one if needed.
// Returns null when the requested establishment is not the user's.
async function resolveEstablishmentId(req: any, userId: number): Promise<number | null> {
  const raw = req.body?.establishmentId ?? req.query?.establishmentId;
  const requested = raw !== undefined && raw !== null && raw !== "" ? Number(raw) : null;
  if (requested !== null && Number.isFinite(requested)) {
    const [owned] = await db.select({ id: establishments.id }).from(establishments).where(and(
      eq(establishments.id, requested),
      eq(establishments.userId, userId),
    ));
    return owned ? owned.id : null;
  }
  const establishment = await storage.ensureEstablishmentForUser(userId);
  return establishment.id;
}

async function exchangeGoogleCodeForTokens(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>;
}

function buildGoogleOAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    throw new Error("Google OAuth credentials are not configured.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/business.manage",
    state,
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function buildFacebookOAuthUrl(state: string) {
  // RJ-4.7: permissões para ler as recomendações da página e responder como a página.
  return FacebookReviewsService.buildOAuthUrl(state, FACEBOOK_CALLBACK_URL, FACEBOOK_SCOPES);
}

/** Email de quem está a usar a app (o membro da equipa, se for o caso). */
function actorEmail(req: any): string {
  return String(req.member?.email || req.user?.email || "");
}

async function upsertConnection(input: {
  userId: number;
  clerkUserId: string;
  establishmentId: number;
  platform: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  status?: string;
  meta?: Record<string, any>;
}) {
  const [existing] = await db.select().from(socialPlatformConnections).where(and(
    eq(socialPlatformConnections.userId, input.userId),
    eq(socialPlatformConnections.platform, input.platform),
    eq(socialPlatformConnections.establishmentId, input.establishmentId),
  ));

  const encryptedAccessToken = input.accessToken ? await encryptSensitiveData(input.accessToken) : null;
  const encryptedRefreshToken = input.refreshToken ? await encryptSensitiveData(input.refreshToken) : null;

  if (existing) {
    await db.update(socialPlatformConnections).set({
      status: input.status || "connected",
      accessToken: encryptedAccessToken ?? existing.accessToken,
      refreshToken: encryptedRefreshToken ?? existing.refreshToken,
      tokenExpiresAt: input.tokenExpiresAt ?? existing.tokenExpiresAt,
      meta: input.meta ?? existing.meta,
      updatedAt: new Date(),
    }).where(eq(socialPlatformConnections.id, existing.id));
    return;
  }

  await db.insert(socialPlatformConnections).values({
    userId: input.userId,
    userExternalId: input.clerkUserId,
    establishmentId: input.establishmentId,
    platform: input.platform,
    status: input.status || "connected",
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    tokenExpiresAt: input.tokenExpiresAt ?? null,
    meta: input.meta ?? {},
  });
}

router.get("/status", requireAuth, async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Autenticação necessária." });
  const establishmentId = await resolveEstablishmentId(req, userId);
  if (establishmentId === null) return res.status(403).json({ error: "Estabelecimento inválido." });

  await db.update(socialPlatformConnections).set({
    status: "disconnected",
    updatedAt: new Date(),
  }).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.establishmentId, establishmentId),
    ne(socialPlatformConnections.platform, "google"),
    ne(socialPlatformConnections.platform, "facebook"),
    eq(socialPlatformConnections.status, "connected"),
  ));

  const rows = await db.select().from(socialPlatformConnections)
    .where(and(
      eq(socialPlatformConnections.userId, userId),
      eq(socialPlatformConnections.establishmentId, establishmentId),
    ));

  const map: Record<string, any> = {};
  for (const row of rows) {
    if (row.platform !== "google" && row.platform !== "facebook") {
      continue;
    }
    // Prefer a connected row if duplicates exist for the same platform.
    if (map[row.platform]?.connected && row.status !== "connected") continue;
    const meta = (row.meta || {}) as any;
    map[row.platform] = {
      connected: row.status === "connected",
      status: row.status,
      lastSyncAt: row.lastSyncAt,
      // RJ-4.7: página do Facebook ligada, ou páginas por escolher.
      ...(row.platform === "facebook" ? {
        pageName: meta.pageName || null,
        pages: row.status === "pending_page" ? (meta.pages || []) : undefined,
      } : {}),
    };
  }

  res.json({
    google: map.google || { connected: false, status: "disconnected" },
    tripadvisor: map.tripadvisor || { connected: false, status: "disconnected" },
    booking: map.booking || { connected: false, status: "disconnected" },
    facebook: {
      ...(map.facebook || { connected: false, status: "disconnected" }),
      available: facebookAvailableFor(actorEmail(req), process.env),
    },
  });
});

router.post("/connect/:platform", requireAuth, async (req, res) => {
  const platform = String(req.params.platform || "").toLowerCase();
  const clerkUserId = resolveExternalUserId(req);
  const userId = resolveUserId(req);
  if (!clerkUserId || !userId) return res.status(401).json({ error: "Autenticação necessária." });
  const establishmentId = await resolveEstablishmentId(req, userId);
  if (establishmentId === null) return res.status(403).json({ error: "Estabelecimento inválido." });
  const planId = resolveUserPlanId(req);

  const [alreadyConnected] = await db.select().from(socialPlatformConnections).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.platform, platform),
    eq(socialPlatformConnections.establishmentId, establishmentId),
    ne(socialPlatformConnections.status, "disconnected"),
  ));
  if (!alreadyConnected) {
    const currentCount = await countConnectedPlatforms(userId, establishmentId);
    const planLimit = getPlanLimit(planId);
    if (currentCount >= planLimit) {
      return res.status(402).json({
        error: "Platform limit reached for current plan.",
        code: "PLAN_PLATFORM_LIMIT_REACHED",
        planId,
        currentCount,
        allowed: Number.isFinite(planLimit) ? planLimit : "unlimited",
      });
    }
  }

  // RJ-4.5: só o Google tem ligação real (OAuth + sincronização de reviews). Antes TripAdvisor e
  // Booking ficavam "ligados" sem fazer nada (e gastavam o limite de plataformas do plano), e o
  // Facebook pedia autorização mas nunca importava reviews.
  const facebookOk = platform === "facebook" && facebookAvailableFor(actorEmail(req), process.env);
  if (platform !== "google" && !facebookOk) {
    return res.status(400).json({
      error: "A ligação direta a esta plataforma ainda não está disponível. Pode adicionar as reviews à mão na Caixa de entrada.",
      code: "PLATFORM_NOT_AVAILABLE",
    });
  }

  if (platform === "google" || platform === "facebook") {
    const state = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    storage.cleanupExpiredOAuthStates().catch((e) => {
      console.warn("[oauth] cleanupExpiredOAuthStates failed:", e);
    });

    await storage.createOAuthState({
      state,
      userExternalId: clerkUserId,
      userId,
      platform,
      establishmentId,
      meta: {},
      expiresAt,
    });

    const oauthUrl = platform === "google" ? buildGoogleOAuthUrl(state) : buildFacebookOAuthUrl(state);
    return res.json({ oauthUrl });
  }

  return res.status(400).json({ error: "Plataforma não suportada." });
});

router.get("/callback/:platform", async (req, res) => {
  const platform = String(req.params.platform || "").toLowerCase();
  const state = String(req.query.state || "");
  const code = String(req.query.code || "");
  const error = String(req.query.error || "");

  if (error) {
    return res.redirect(`${APP_BASE_URL}/?platformConnect=${platform}&status=error`);
  }

  const stateEntry = await storage.getOAuthState(state);
  if (
    !stateEntry ||
    stateEntry.platform !== platform ||
    stateEntry.expiresAt < new Date() ||
    !code ||
    !stateEntry.userId ||
    !stateEntry.establishmentId
  ) {
    if (stateEntry) {
      await storage.deleteOAuthState(state).catch(() => {});
    }
    return res.redirect(`${APP_BASE_URL}/?platformConnect=${platform}&status=invalid_state`);
  }

  await storage.deleteOAuthState(state);

  let accessToken = "";
  let refreshToken = "";
  let tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  let meta: Record<string, any> = { oauthConnectedAt: new Date().toISOString(), mode: "oauth_api" };

  if (platform === "google") {
    try {
      const tokenData = await exchangeGoogleCodeForTokens(code);
      if (!tokenData.access_token) {
        return res.redirect(`${APP_BASE_URL}/?platformConnect=${platform}&status=token_exchange_failed`);
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || "";
      tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
      meta = {
        oauthConnectedAt: new Date().toISOString(),
        mode: "oauth_api",
        scope: tokenData.scope || "",
        tokenType: tokenData.token_type || "Bearer",
      };
    } catch (error) {
      console.error("Google OAuth token exchange failed:", error);
      return res.redirect(`${APP_BASE_URL}/?platformConnect=${platform}&status=token_exchange_failed`);
    }
  } else if (platform === "facebook") {
    // RJ-4.7: código -> token de utilizador longo -> páginas que a pessoa gere.
    try {
      const { userToken, expiresAt } = await FacebookReviewsService.exchangeCode(code, FACEBOOK_CALLBACK_URL);
      const me = await FacebookReviewsService.me(userToken);
      const pages = await FacebookReviewsService.listPages(userToken);
      if (pages.length === 0) {
        return res.redirect(`${APP_BASE_URL}/?platformConnect=facebook&status=no_pages`);
      }
      const base = { oauthConnectedAt: new Date().toISOString(), mode: "oauth_api", facebookUserId: me.id, graphVersion: FacebookReviewsService.graphVersion };
      if (pages.length === 1) {
        await upsertConnection({
          userId: stateEntry.userId, clerkUserId: stateEntry.userExternalId, establishmentId: stateEntry.establishmentId,
          platform, accessToken: pages[0].access_token, tokenExpiresAt: null, status: "connected",
          meta: { ...base, pageId: pages[0].id, pageName: pages[0].name },
        });
        return res.redirect(`${APP_BASE_URL}/?platformConnect=facebook&status=connected`);
      }
      // Várias páginas: guarda o token de utilizador (cifrado) e pede à pessoa que escolha.
      await upsertConnection({
        userId: stateEntry.userId, clerkUserId: stateEntry.userExternalId, establishmentId: stateEntry.establishmentId,
        platform, accessToken: userToken, tokenExpiresAt: expiresAt, status: "pending_page",
        meta: { ...base, pages: pages.map((p) => ({ id: p.id, name: p.name })) },
      });
      return res.redirect(`${APP_BASE_URL}/?platformConnect=facebook&status=choose_page`);
    } catch (error: any) {
      console.error("[facebook] OAuth failed:", error?.message);
      return res.redirect(`${APP_BASE_URL}/?platformConnect=facebook&status=token_exchange_failed`);
    }
  }

  await upsertConnection({
    userId: stateEntry.userId,
    clerkUserId: stateEntry.userExternalId,
    establishmentId: stateEntry.establishmentId,
    platform,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    status: "connected",
    meta,
  });

  return res.redirect(`${APP_BASE_URL}/?platformConnect=${platform}&status=connected`);
});

// RJ-4.7: escolher a página do Facebook quando a pessoa gere mais do que uma.
router.post("/facebook/select-page", requireAuth, async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Autenticação necessária." });
  const establishmentId = await resolveEstablishmentId(req, userId);
  if (establishmentId === null) return res.status(403).json({ error: "Estabelecimento inválido." });
  const pageId = String(req.body?.pageId || "");
  if (!pageId) return res.status(400).json({ error: "Página em falta." });

  const [conn] = await db.select().from(socialPlatformConnections).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.establishmentId, establishmentId),
    eq(socialPlatformConnections.platform, "facebook"),
    eq(socialPlatformConnections.status, "pending_page"),
  ));
  if (!conn?.accessToken) return res.status(404).json({ error: "Não há nenhuma ligação do Facebook à espera de página." });

  try {
    const userToken = await decryptSensitiveData(conn.accessToken);
    const page = (await FacebookReviewsService.listPages(userToken)).find((p) => p.id === pageId);
    if (!page) return res.status(404).json({ error: "Essa página já não está disponível nesta conta do Facebook." });
    const meta = { ...((conn.meta || {}) as any), pageId: page.id, pageName: page.name };
    delete (meta as any).pages;
    await db.update(socialPlatformConnections).set({
      accessToken: await encryptSensitiveData(page.access_token),
      tokenExpiresAt: null,
      status: "connected",
      meta,
      updatedAt: new Date(),
    }).where(eq(socialPlatformConnections.id, conn.id));
    return res.json({ connected: true, pageName: page.name });
  } catch (error: any) {
    console.error("[facebook] select-page failed:", error?.message);
    return res.status(502).json({ error: "Não foi possível ligar a página. Volte a ligar o Facebook." });
  }
});

// RJ-4.7: pedido de apagamento de dados da Meta (obrigatório para a aprovação da app).
// A Meta envia signed_request quando alguém remove a app nas definições do Facebook.
router.post("/facebook/data-deletion", async (req, res) => {
  const { appSecret } = facebookAppCredentials(process.env);
  const data = parseSignedRequest(String(req.body?.signed_request || ""), appSecret);
  if (!data?.user_id) return res.status(400).json({ error: "Pedido inválido." });
  const code = crypto.randomBytes(8).toString("hex");
  await db.update(socialPlatformConnections).set({
    status: "disconnected",
    accessToken: null,
    refreshToken: null,
    meta: sql`coalesce(${socialPlatformConnections.meta}, '{}'::jsonb) || ${JSON.stringify({ dataDeletion: { code, at: new Date().toISOString() } })}::jsonb`,
    updatedAt: new Date(),
  }).where(and(
    eq(socialPlatformConnections.platform, "facebook"),
    sql`${socialPlatformConnections.meta}->>'facebookUserId' = ${String(data.user_id)}`,
  ));
  return res.json({ url: `${APP_BASE_URL}/api/platforms/facebook/data-deletion?code=${code}`, confirmation_code: code });
});

router.get("/facebook/data-deletion", async (req, res) => {
  const code = String(req.query.code || "").replace(/[^a-f0-9]/g, "").slice(0, 32);
  res.type("text/plain").send(code
    ? `Pedido ${code}: a ligação ao Facebook foi desligada e os tokens de acesso foram apagados.`
    : "Indique o código do pedido.");
});

router.get("/sync/google", requireAuth, async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Autenticação necessária." });
  const establishmentId = await resolveEstablishmentId(req, userId);
  if (establishmentId === null) return res.status(403).json({ error: "Estabelecimento inválido." });

  const rows = await db.select().from(socialPlatformConnections).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.platform, "google"),
    eq(socialPlatformConnections.status, "connected"),
    eq(socialPlatformConnections.establishmentId, establishmentId),
  ));

  if (rows.length === 0) {
    return res.status(404).json({ error: "Nenhuma ligação Google ativa encontrada." });
  }

  const imported = await reviewSyncService.syncGoogle(rows);
  return res.json({ ok: true, syncedConnections: rows.length, imported, syncedAt: new Date().toISOString() });
});

router.post("/disconnect/:platform", requireAuth, async (req, res) => {
  const platform = String(req.params.platform || "").toLowerCase();
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Autenticação necessária." });
  const establishmentId = await resolveEstablishmentId(req, userId);
  if (establishmentId === null) return res.status(403).json({ error: "Estabelecimento inválido." });

  // Disconnect every active row for this platform (there may be legacy duplicates).
  await db.update(socialPlatformConnections).set({
    status: "disconnected",
    updatedAt: new Date(),
  }).where(and(
    eq(socialPlatformConnections.userId, userId),
    eq(socialPlatformConnections.platform, platform),
    eq(socialPlatformConnections.establishmentId, establishmentId),
  ));

  return res.json({ disconnected: true });
});

router.post("/sync-now", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ error: "Sync not configured." });
  }
  // RJ-3.5: o segredo vem no cabeçalho Authorization (como no agendamento), nunca no corpo,
  // e é comparado em tempo constante.
  const authHeader = String(req.headers.authorization || "");
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const a = Buffer.from(providedSecret);
  const b = Buffer.from(cronSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  await reviewSyncService.syncAllConnectedPlatforms();
  return res.json({ ok: true, syncedAt: new Date().toISOString() });
});

export default router;
