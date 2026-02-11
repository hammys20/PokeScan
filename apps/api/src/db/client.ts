import { Pool } from "pg";
import { config } from "../config.js";

let pool: Pool | null = null;

export function getDbPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}
