
import { Router } from "express";
import { requireAuth, requireAdmin } from "../auth.js";
import { QualityFeedbackService } from "../services/quality-feedback-service.js";

const router = Router();

// Submit new feedback
router.post("/submit", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    await QualityFeedbackService.submitFeedback({
      ...req.body,
      userId: userId.toString()
    });

    res.json({ success: true, message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Error submitting feedback" });
  }
});

// Get metrics (Admin or own data)
router.get("/metrics", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const targetUserId = isAdmin && req.query.userId ? req.query.userId as string : userId.toString();
    const timeframe = (req.query.timeframe as '7d' | '30d' | '90d') || '30d';

    const metrics = await QualityFeedbackService.getQualityMetrics(targetUserId, timeframe);
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching quality metrics:", error);
    res.status(500).json({ message: "Error fetching quality metrics" });
  }
});

// Get trends
router.get("/trends", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    const trends = await QualityFeedbackService.getQualityTrends(userId.toString());
    res.json(trends);
  } catch (error) {
    console.error("Error fetching quality trends:", error);
    res.status(500).json({ message: "Error fetching quality trends" });
  }
});

// Generate report
router.get("/report", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    const report = await QualityFeedbackService.generateQualityReport(userId.toString());
    res.json(report);
  } catch (error) {
    console.error("Error generating quality report:", error);
    res.status(500).json({ message: "Error generating quality report" });
  }
});

export default router;
