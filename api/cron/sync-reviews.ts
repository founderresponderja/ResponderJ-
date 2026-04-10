import type { Request, Response } from "express";
import { reviewSyncService } from "../../server/services/review-sync-service";

export default async function handler(req: Request, res: Response) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (cronSecret && bearerToken !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized cron call." });
  }

  try {
    await reviewSyncService.syncAllConnectedPlatforms();
    return res.json({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || "Sync failed" });
  }
}
