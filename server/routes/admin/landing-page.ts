import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, message: "Landing page admin route placeholder." });
});

export default router;
