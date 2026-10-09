import express from "express";
import { documentsRouter } from "./routes/documents.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use("/api", healthRouter);
app.use("/api", documentsRouter);

// Unknown API routes return JSON instead of an HTML error page.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

import path from "node:path";
import { fileURLToPath } from "node:url";

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(PORT, () => {
  console.log(`Doc2PPT server running on http://localhost:${PORT}`);
});
