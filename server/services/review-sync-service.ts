import { db } from "../db.js";
import { reviews, socialPlatformConnections } from "../../shared/schema.js";
import { and, eq } from "drizzle-orm";
import { GoogleReviewsService } from "./google-reviews-service.js";

type PlatformName = "google" | "tripadvisor" | "booking" | "facebook";

export const reviewSyncService = {
  async syncAllConnectedPlatforms(): Promise<{ total: number }> {
    const rows = await db.select().from(socialPlatformConnections).where(eq(socialPlatformConnections.status, "connected"));
    const grouped: Record<PlatformName, typeof rows> = {
      google: [],
      tripadvisor: [],
      booking: [],
      facebook: [],
    };

    for (const row of rows) {
      const platform = row.platform as PlatformName;
      if (grouped[platform]) grouped[platform].push(row);
    }

    const googleCount = await this.syncGoogle(grouped.google);
    await this.syncTripAdvisor(grouped.tripadvisor);
    await this.syncBooking(grouped.booking);
    await this.syncFacebook(grouped.facebook);
    return { total: googleCount };
  },

  async syncGoogle(connections: any[]): Promise<number> {
    let totalInserted = 0;
    for (const connection of connections) {
      let inserted = 0;
      try {
        const googleReviews = await GoogleReviewsService.fetchReviews(
          connection.userExternalId,
          connection.establishmentId ?? null,
        );
        for (const review of googleReviews) {
          const reviewExternalId = String(review.reviewId || review.name || "");
          if (!reviewExternalId) continue;

          const [existing] = await db.select().from(reviews).where(and(
            eq(reviews.platform, "google"),
            eq(reviews.externalId, reviewExternalId),
            eq(reviews.establishmentId, connection.establishmentId ?? null),
          ));
          if (existing) continue;

          const ratingMap: Record<string, number> = {
            ONE: 1,
            TWO: 2,
            THREE: 3,
            FOUR: 4,
            FIVE: 5,
          };
          await db.insert(reviews).values({
            establishmentId: connection.establishmentId ?? null,
            platform: "google",
            externalId: reviewExternalId,
            authorName: review.reviewer?.displayName || "Cliente Google",
            rating: ratingMap[String(review.starRating || "").toUpperCase()] ?? null,
            reviewText: review.comment || "",
            language: "pt",
            sentiment: null,
            reviewDate: review.createTime ? new Date(review.createTime) : new Date(),
          });
          inserted++;
        }

        await this.markSynced(connection.id, {
          provider: "google",
          ok: true,
          imported: inserted,
        });
      } catch (error: any) {
        await this.markSynced(connection.id, {
          provider: "google",
          ok: false,
          error: error?.message || "sync_failed",
        });
      }
      totalInserted += inserted;
    }
    return totalInserted;
  },

  async syncTripAdvisor(connections: any[]) {
    for (const connection of connections) {
      // Placeholder for API/scraping strategy.
      await this.markSynced(connection.id, { provider: "tripadvisor", ok: true, mode: "scraper_or_api" });
    }
  },

  async syncBooking(connections: any[]) {
    for (const connection of connections) {
      // Placeholder for API/scraping strategy.
      await this.markSynced(connection.id, { provider: "booking", ok: true, mode: "scraper_or_api" });
    }
  },

  async syncFacebook(connections: any[]) {
    for (const connection of connections) {
      // Placeholder for Graph API polling.
      await this.markSynced(connection.id, { provider: "facebook", ok: true });
    }
  },

  async markSynced(connectionId: number, meta: Record<string, any>) {
    await db.update(socialPlatformConnections)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
        meta,
      })
      .where(eq(socialPlatformConnections.id, connectionId));
  },
};
