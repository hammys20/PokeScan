import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDbPool } from "./client.js";

export async function runMigrations() {
  const pool = getDbPool();
  if (!pool) {
    return false;
  }

  const migrationPath = resolve(process.cwd(), "apps/api/sql/001_init.sql");
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
  return true;
}
