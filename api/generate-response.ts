import type { Request, Response } from "express";
import handler from "./index.js";

// Dedicated serverless entrypoint for /api/generate-response.
// Actual implementation and middleware are handled by api/index + server routes.
export default async function generateResponseHandler(req: Request, res: Response) {
  return handler(req, res);
}
