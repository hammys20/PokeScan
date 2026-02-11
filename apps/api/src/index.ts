import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { router } from "./routes.js";

const app = express();

app.use(
  cors({
    origin: config.allowedOrigin
  })
);
app.use(express.json({ limit: "10mb" }));

app.use(router);

async function start() {
  const migrated = await runMigrations();
  if (!migrated) {
    console.log("[pokescan-api] DATABASE_URL missing, using in-memory scan store");
  }

  app.listen(config.port, () => {
    console.log(`[pokescan-api] listening on port ${config.port}`);
  });
}

start().catch((error: unknown) => {
  console.error("[pokescan-api] failed to start", error);
  process.exit(1);
});
