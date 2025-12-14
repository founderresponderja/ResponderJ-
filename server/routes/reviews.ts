
import { Router } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";

const router = Router();

// List generated responses (reviews)
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const responses = await storage.getUserAiResponses(userId, limit);
    res.json(responses);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Update a response (e.g. edited text)
router.patch("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { generatedResponse, isFavorite } = req.body;
    
    // Validate ownership logic should be in storage or here
    // For now assuming storage handles it or we rely on user isolation in query
    
    const updated = await storage.updateAiResponse(id, {
      generatedResponse,
      isFavorite
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Error updating review" });
  }
});

export default router;
