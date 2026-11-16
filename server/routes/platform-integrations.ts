import { Router } from "express";
import crypto from "crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "../db.js";
import { establishments, socialPlatformConnections } from "../../shared/schema.js";
import { encryptSensitiveData } from "../encryption.js";
import { reviewSyncService } from "../services/review-sync-service.js";
import { storage } from "../storage.js";
import { requireAuth } from "../auth.js";

const router = Router();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const GOOGLE_CALLBACK_URL = "https://responderja.pt/api/platforms/callback/google";
const FACEBOOK_CALLBACK_URL = `${APP_BASE_URL}/api/platforms/callback/facebook`;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const PLAN_PLATFORM_LIMITS: Record<string, number> = {
  free: 1,
  trial: 1,
  starter: 2,
  regular: 2,
  pro: 5,
  agency: Number.POSITIVE_INFINITY,
};

function normalizePlanId(planId: string | undefined) {
  return String(planId || "free").toLowerCase();
}

function getPlanLimit(planId: string | undefined) {
  const normalized = normalizePlanId(planId);
  return PLAN_PLATFORM_LIMITS[normalized] ?? PLAN_PLATFORM_LIMITS.free;
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
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || "",
    redirect_uri: FACEBOOK_CALLBACK_URL,
    response_type: "code",
    state,
    scope: "pages_show_list,pages_read_engagement",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
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
    inArray(socialPlatformConnections.platform, ["thefork", "airbnb"]),
    eq(socialPlatformConnections.status, "connected"),
  ));

  const rows = await db.select().from(socialPlatformConnections)
    .where(and(
      eq(socialPlatformConnections.userId, userId),
      eq(socialPlatformConnections.establishmentId, establishmentId),
    ));

  const map: Record<string, any> = {};
  for (const row of rows) {
    if (["thefork", "airbnb"].includes(row.platform)) {
      continue;
    }
    // Prefer a connected row if duplicates exist for the same platform.
    if (map[row.platform]?.connected && row.status !== "connected") continue;
    map[row.platform] = {
      connected: row.status === "connected",
      status: row.status,
      lastSyncAt: row.lastSyncAt,
    };
  }

  res.json({
    google: map.google || { connected: false, status: "disconnected" },
    tripadvisor: map.tripadvisor || { connected: false, status: "disconnected" },
    booking: map.booking || { connected: false, status: "disconnected" },
    facebook: map.facebook || { connected: false, status: "disconnected" },
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

  if (platform === "tripadvisor" || platform === "booking") {
    await upsertConnection({
      userId,
      clerkUserId,
      establishmentId,
      platform,
      status: "connected",
      meta: { mode: "scraper_or_api", connectedAt: new Date().toISOString() },
    });
    return res.json({ connected: true, mode: "scraper_or_api" });
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
    accessToken = `oauth_code_${code}`;
    refreshToken = `refresh_${code}`;
    meta = { oauthConnectedAt: new Date().toISOString(), mode: "mock_oauth" };
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
  const providedSecret = String(req.body?.secret || "");
  if (providedSecret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  await reviewSyncService.syncAllConnectedPlatforms();
  return res.json({ ok: true, syncedAt: new Date().toISOString() });
});

export default router;
