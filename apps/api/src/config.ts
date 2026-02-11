import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "*",
  databaseUrl: process.env.DATABASE_URL ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  ebayClientId: process.env.EBAY_CLIENT_ID ?? "",
  ebayClientSecret: process.env.EBAY_CLIENT_SECRET ?? "",
  ebayMarketplaceId: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US"
};
