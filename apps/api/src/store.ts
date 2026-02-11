import { randomUUID } from "node:crypto";
import type { AnalyzeResponse } from "./types.js";

type ScanRecord = AnalyzeResponse & {
  status: "analyzed" | "confirmed";
  createdAt: string;
};

const scans = new Map<string, ScanRecord>();

export function createScan(payload: Omit<ScanRecord, "createdAt" | "scanId">) {
  const scanId = randomUUID();
  const scan: ScanRecord = {
    ...payload,
    scanId,
    createdAt: new Date().toISOString()
  };

  scans.set(scanId, scan);
  return scan;
}

export function getScan(scanId: string) {
  return scans.get(scanId) ?? null;
}

export function confirmScan(scanId: string) {
  const existing = scans.get(scanId);
  if (!existing) return null;
  const updated: ScanRecord = { ...existing, status: "confirmed" };
  scans.set(scanId, updated);
  return updated;
}
