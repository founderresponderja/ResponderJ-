import { Router } from "express";
import { requireAuth, requireAdmin } from "../auth";
import { emailSequenceService } from "../services/email-sequence-service";

const router = Router();

export function setupEmailSequenceRoutes(app: any) {
    // Route to manually trigger sequence processing (Admin only)
    // Used by Cron Jobs or manual admin triggers
    app.post("/api/admin/email-sequence/process", requireAuth, requireAdmin, async (req: any, res: any) => {
        try {
            const result = await emailSequenceService.processPendingSequences();
            res.json({ success: true, ...result });
        } catch (error: any) {
            console.error("Error processing email sequence:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Route to trigger specific user sequence (debug/admin)
    app.post("/api/admin/email-sequence/trigger/:userId", requireAuth, requireAdmin, async (req: any, res: any) => {
        try {
            const { userId } = req.params;
            await emailSequenceService.createSequenceForUser(userId);
            res.json({ success: true, message: `Sequence triggered for user ${userId}` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
}