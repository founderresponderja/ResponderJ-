
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
   * Obtém reviews de uma conta conectada
   */
  static async fetchReviews(userExternalId: string, establishmentId?: number | null) {
    const [connection] = await db.select().from(socialPlatformConnections).where(and(
      eq(socialPlatformConnections.userExternalId, userExternalId),
      eq(socialPlatformConnections.platform, "google"),
      eq(socialPlatformConnections.establishmentId, establishmentId ?? null),
      eq(socialPlatformConnections.status, "connected"),
    ));
    if (!connection) return [];

    let accessToken: string;
    try {
      accessToken = await this.getValidAccessToken(connection.id);
    } catch (err) {
      console.error("[F8] fetchReviews token refresh failed:", err);
      return [];
    }

    const locations = await this.fetchLocations(accessToken);
    const allReviews: any[] = [];
    for (const location of locations) {
      const locationReviews = await this.fetchReviewsByLocation(location.name, accessToken);
      allReviews.push(...locationReviews.map((review: any) => ({ ...review, locationName: location.name })));
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

  private static async fetchLocations(accessToken: string) {
    const accountsResponse = await fetch(`${this.accountManagementUrl}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!accountsResponse.ok) return [];

    const accountsData = await accountsResponse.json() as { accounts?: Array<{ name: string }> };
    const locations: Array<{ name: string }> = [];
    for (const account of accountsData.accounts || []) {
      const response = await fetch(`${this.businessInfoUrl}/${account.name}/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) continue;
      const payload = await response.json() as { locations?: Array<{ name: string }> };
      locations.push(...(payload.locations || []));
    }
    return locations;
  }

  private static async fetchReviewsByLocation(locationName: string, accessToken: string) {
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const payload = await response.json() as { reviews?: any[] };
    return payload.reviews || [];
  }
}
