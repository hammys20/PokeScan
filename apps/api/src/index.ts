import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { router } from "./routes.js";

const app = express();

app.use(
  cors({
    origin: config.allowedOrigin
  })
);
app.use(express.json({ limit: "10mb" }));

app.use(router);

app.listen(config.port, () => {
  console.log(`[pokescan-api] listening on port ${config.port}`);
});
