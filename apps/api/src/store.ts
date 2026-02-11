import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDbPool } from "./db/client.js";
import type { AnalyzeResponse, ScanRecord } from "./types.js";

type DbRow = QueryResultRow & {
  scan_id: string;
  status: ScanRecord["status"];
  identity: AnalyzeResponse["identity"];
  valuation: AnalyzeResponse["valuation"];
  needs_user_confirmation: boolean;
  created_at: Date;
  updated_at: Date;
};

const memoryStore = new Map<string, ScanRecord>();

function mapRow(row: DbRow): ScanRecord {
  return {
    scanId: row.scan_id,
    status: row.status,
    identity: row.identity,
    valuation: row.valuation,
    needsUserConfirmation: row.needs_user_confirmation,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function createScan(payload: Omit<ScanRecord, "createdAt" | "updatedAt" | "scanId">) {
  const scanId = randomUUID();
  const pool = getDbPool();

  if (!pool) {
    const now = new Date().toISOString();
    const scan: ScanRecord = { ...payload, scanId, createdAt: now, updatedAt: now };
    memoryStore.set(scanId, scan);
    return scan;
  }

  const result = await pool.query<DbRow>(
    `
      INSERT INTO scan_events (scan_id, status, identity, valuation, needs_user_confirmation)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
      RETURNING scan_id, status, identity, valuation, needs_user_confirmation, created_at, updated_at
    `,
    [scanId, payload.status, payload.identity, payload.valuation, payload.needsUserConfirmation]
  );

  return mapRow(result.rows[0]);
}

export async function getScan(scanId: string) {
  const pool = getDbPool();

  if (!pool) {
    return memoryStore.get(scanId) ?? null;
  }

  const result = await pool.query<DbRow>(
    `
      SELECT scan_id, status, identity, valuation, needs_user_confirmation, created_at, updated_at
      FROM scan_events
      WHERE scan_id = $1
    `,
    [scanId]
  );

  if (!result.rows[0]) return null;
  return mapRow(result.rows[0]);
}

export async function confirmScan(scanId: string) {
  const pool = getDbPool();

  if (!pool) {
    const existing = memoryStore.get(scanId);
    if (!existing) return null;
    const updated: ScanRecord = {
      ...existing,
      status: "confirmed",
      updatedAt: new Date().toISOString()
    };
    memoryStore.set(scanId, updated);
    return updated;
  }

  const result = await pool.query<DbRow>(
    `
      UPDATE scan_events
      SET status = 'confirmed', updated_at = NOW()
      WHERE scan_id = $1
      RETURNING scan_id, status, identity, valuation, needs_user_confirmation, created_at, updated_at
    `,
    [scanId]
  );

  if (!result.rows[0]) return null;
  return mapRow(result.rows[0]);
}
