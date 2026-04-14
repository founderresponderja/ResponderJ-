import { Router } from "express";

const router = Router();

router.post("/", (_req, res) => {
  res.status(200).json({ success: true, message: "Suggestion received." });
});

export default router;
