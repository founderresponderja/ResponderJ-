
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { socialPlatformConnections } from "../../shared/schema.js";
import { decryptSensitiveData, encryptSensitiveData } from "../encryption.js";

// Serviço dedicado à gestão de reviews do Google Business Profile
export class GoogleReviewsService {
  private static accountManagementUrl = "https://mybusinessaccountmanagement.googleapis.com/v1";
  private static businessInfoUrl = "https://mybusinessbusinessinformation.googleapis.com/v1";

  /**
   * Returns a valid Google access token for the given connection.
   * If the stored access token is expired (or near expiry), refreshes
   * it via the OAuth refresh_token grant. On invalid_grant (refresh
   * token revoked or expired), marks the connection as 'expired' and
   * throws.
   */
  static async getValidAccessToken(connectionId: number): Promise<string> {
    const [conn] = await db
      .select()
      .from(socialPlatformConnections)
      .where(eq(socialPlatformConnections.id, connectionId))
      .limit(1);

    if (!conn) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    if (conn.status === "expired") {
      throw new Error(`Connection ${connectionId} is expired — user must reconnect`);
    }
    if (!conn.accessToken || !conn.refreshToken) {
      throw new Error(`Connection ${connectionId} missing tokens`);
    }

    const now = Date.now();
    const expiresAtMs = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
    const SAFETY_MARGIN_MS = 60_000;

    if (expiresAtMs > now + SAFETY_MARGIN_MS) {
      return await decryptSensitiveData(conn.accessToken);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials missing in env");
    }

    const refreshTokenPlain = await decryptSensitiveData(conn.refreshToken);
    if (!refreshTokenPlain) {
      throw new Error(`Connection ${connectionId} refresh_token failed to decrypt`);
    }

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshTokenPlain,
      }),
    });

    if (!refreshRes.ok) {
      let errorBody: any = {};
      try {
        errorBody = await refreshRes.json();
      } catch {
        // ignore parse error
      }
      const errorCode = errorBody?.error;

      if (errorCode === "invalid_grant") {
        console.error(
          `[F8] Connection ${connectionId} got invalid_grant from Google — marking as expired`
        );
        await db
          .update(socialPlatformConnections)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(socialPlatformConnections.id, connectionId));
        throw new Error(
          `Connection ${connectionId} refresh_token expired or revoked — user must reconnect`
        );
      }

      throw new Error(
        `Google token refresh failed (${refreshRes.status}): ${JSON.stringify(errorBody)}`
      );
    }

    const refreshData = (await refreshRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const newAccessToken = refreshData.access_token;
    const newExpiresIn = refreshData.expires_in;
    if (!newAccessToken || !newExpiresIn) {
      throw new Error(`Google token refresh response missing access_token or expires_in`);
    }

    const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);
    const newAccessEncrypted = await encryptSensitiveData(newAccessToken);

    await db
      .update(socialPlatformConnections)
      .set({
        accessToken: newAccessEncrypted,
        tokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(socialPlatformConnections.id, connectionId));

    console.log(`[F8] Connection ${connectionId} refreshed, expires at ${newExpiresAt.toISOString()}`);
    return newAccessToken;
  }

  /**
   * Converte o starRating da API do Google (ONE..FIVE, ou STAR_RATING_UNSPECIFIED) em 1..5.
   * RJ-4.2: antes, ONE e TWO eram tratados como 3 em /api/reviews, escondendo reviews más.
   */
  static starRatingToNumber(starRating: unknown): number | null {
    const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    if (typeof starRating === "number" && starRating >= 1 && starRating <= 5) return Math.round(starRating);
    return map[String(starRating ?? "").trim().toUpperCase()] ?? null;
  }

  /**
   * Obtém reviews de uma ligação Google concreta (pelo id da linha em social_platform_connections).
   */
  static async fetchReviewsForConnection(connectionId: number) {
    // Sem token válido não há nada a fazer; o erro sobe para a sincronização o registar (meta.lastSync).
    const accessToken = await this.getValidAccessToken(connectionId);

    const locations = await this.fetchLocations(accessToken);
    const allReviews: any[] = [];
    for (const location of locations) {
      const locationReviews = await this.fetchReviewsByLocation(location.reviewsParent, accessToken);
      allReviews.push(...locationReviews.map((review: any) => ({ ...review, locationName: location.reviewsParent, locationTitle: location.title })));
    }
    return allReviews;
  }

  /**
   * Publica uma resposta a uma review no Google
   */
  static async replyToReview(userExternalId: string, reviewName: string, replyText: string, establishmentId?: number | null) {
    const [connection] = await db.select().from(socialPlatformConnections).where(and(
      eq(socialPlatformConnections.userExternalId, userExternalId),
      eq(socialPlatformConnections.platform, "google"),
      eq(socialPlatformConnections.establishmentId, establishmentId ?? null),
      eq(socialPlatformConnections.status, "connected"),
    ));
    if (!connection) {
      throw new Error("Conta Google não encontrada.");
    }

    const accessToken = await this.getValidAccessToken(connection.id);

    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google reply failed (${response.status}): ${errText}`);
    }

    return response.json();
  }

  /**
   * Remove a resposta a uma review no Google (DELETE)
   */
  static async deleteReply(userExternalId: string, reviewName: string, establishmentId?: number | null): Promise<void> {
    const [connection] = await db.select().from(socialPlatformConnections).where(and(
      eq(socialPlatformConnections.userExternalId, userExternalId),
      eq(socialPlatformConnections.platform, "google"),
      eq(socialPlatformConnections.establishmentId, establishmentId ?? null),
      eq(socialPlatformConnections.status, "connected"),
    ));
    if (!connection) {
      throw new Error("Conta Google não encontrada.");
    }

    const accessToken = await this.getValidAccessToken(connection.id);

    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200 || response.status === 204) {
      return;
    }
    if (response.status === 404) {
      console.log("deleteReply: reply not found, treating as already deleted");
      return;
    }
    const errText = await response.text();
    throw new Error(`Google delete reply failed (${response.status}): ${errText}`);
  }

  /** GET paginado: segue nextPageToken até ao fim (ou até maxPages, por segurança). */
  private static async fetchAllPages<T>(
    baseUrl: string,
    itemsKey: string,
    accessToken: string,
    label: string,
    maxPages = 20,
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken = "";
    for (let page = 0; page < maxPages; page++) {
      const url = new URL(baseUrl);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 300);
        // RJ-4.1: antes os erros eram engolidos e a sincronização dizia "OK, 0 reviews".
        throw new Error(`Google ${label} ${response.status}: ${body}`);
      }
      const payload = (await response.json()) as Record<string, any>;
      items.push(...((payload[itemsKey] as T[]) || []));
      pageToken = payload.nextPageToken || "";
      if (!pageToken) return items;
    }
    console.warn(`[google] ${label}: stopped after ${maxPages} pages`);
    return items;
  }

  /**
   * Contas e locais do utilizador.
   * RJ-4.1: a Business Information API devolve "locations/{id}", mas a API de reviews (v4)
   * precisa de "accounts/{a}/locations/{l}". Antes juntava-se só "locations/{id}/reviews",
   * que nunca devolvia nada; e faltava o readMask, obrigatório na listagem de locais.
   */
  private static async fetchLocations(accessToken: string) {
    const accounts = await this.fetchAllPages<{ name: string }>(
      `${this.accountManagementUrl}/accounts?pageSize=20`, "accounts", accessToken, "accounts", 10,
    );
    const locations: Array<{ name: string; title: string; reviewsParent: string }> = [];
    for (const account of accounts) {
      const accountLocations = await this.fetchAllPages<{ name: string; title?: string }>(
        `${this.businessInfoUrl}/${account.name}/locations?readMask=name,title&pageSize=100`,
        "locations", accessToken, `locations of ${account.name}`, 10,
      );
      for (const loc of accountLocations) {
        const reviewsParent = loc.name.startsWith("accounts/") ? loc.name : `${account.name}/${loc.name}`;
        locations.push({ name: loc.name, title: loc.title || "", reviewsParent });
      }
    }
    return locations;
  }

  /** Todas as reviews de um local (50 por página, mais recentes primeiro). */
  private static async fetchReviewsByLocation(reviewsParent: string, accessToken: string) {
    return this.fetchAllPages<any>(
      `https://mybusiness.googleapis.com/v4/${reviewsParent}/reviews?pageSize=50&orderBy=updateTime%20desc`,
      "reviews", accessToken, `reviews of ${reviewsParent}`, 20,
    );
  }
}
