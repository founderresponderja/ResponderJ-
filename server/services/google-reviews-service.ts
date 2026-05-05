
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { socialPlatformConnections } from "../../shared/schema.js";
import { decryptSensitiveData } from "../encryption.js";

// Serviço dedicado à gestão de reviews do Google Business Profile
export class GoogleReviewsService {
  private static accountManagementUrl = "https://mybusinessaccountmanagement.googleapis.com/v1";
  private static businessInfoUrl = "https://mybusinessbusinessinformation.googleapis.com/v1";

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
    if (!connection?.accessToken) return [];

    const accessToken = await decryptSensitiveData(connection.accessToken);
    if (!accessToken) return [];

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
    if (!connection?.accessToken) {
      throw new Error("Conta Google não encontrada.");
    }

    const accessToken = await decryptSensitiveData(connection.accessToken);
    if (!accessToken) {
      throw new Error("Google access token inválido.");
    }

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
    if (!connection?.accessToken) {
      throw new Error("Conta Google não encontrada.");
    }

    const accessToken = await decryptSensitiveData(connection.accessToken);
    if (!accessToken) {
      throw new Error("Google access token inválido.");
    }

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
