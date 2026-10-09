import { Router } from "express";

export const healthRouter = Router();

// GET /api/health -> { "status": "ok" }
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
