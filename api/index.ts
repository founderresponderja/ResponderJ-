import express from "express";
import type { Request, Response } from "express";
import { registerRoutes, setupAuthRoutes } from "../server/routes";

const app = express();
let initialized = false;
let initializing: Promise<void> | null = null;

async function initApp() {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = (async () => {
    // Stripe webhook must receive raw body for signature validation.
    app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: false, limit: "1mb" }));

    await setupAuthRoutes(app);
    await registerRoutes(app);
    initialized = true;
  })();

  await initializing;
}

export default async function handler(req: Request, res: Response) {
  await initApp();
  return app(req, res);
}
