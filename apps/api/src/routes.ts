import { Router } from "express";
import { z } from "zod";
import { analyzeScan } from "./services.js";
import { confirmScan, createScan, getScan } from "./store.js";

const gradingCompanySchema = z.enum(["PSA", "BGS", "CGC"]);

const analyzeSchema = z.object({
  imageBase64: z.string().min(1),
  userHints: z
    .object({
      gradingCompany: gradingCompanySchema.optional()
    })
    .optional()
});

const confirmSchema = z.object({
  cardCatalogId: z.string().min(1),
  gradingCompany: gradingCompanySchema,
  gradeNumeric: z.number().min(1).max(10)
});

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pokescan-api" });
});

router.post("/v1/scans/analyze", async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const analyzed = await analyzeScan(parsed.data);

    const stored = await createScan({
      identity: analyzed.identity,
      valuation: analyzed.valuation,
      needsUserConfirmation: analyzed.needsUserConfirmation,
      status: "analyzed"
    });

    return res.status(200).json({
      scanId: stored.scanId,
      identity: stored.identity,
      valuation: stored.valuation,
      needsUserConfirmation: stored.needsUserConfirmation
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to analyze scan",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/v1/scans/:scanId/confirm", async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const scan = await confirmScan(req.params.scanId);
  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  return res.status(200).json({
    scanId: scan.scanId,
    status: scan.status,
    valuation: scan.valuation
  });
});

router.get("/v1/scans/:scanId", async (req, res) => {
  const scan = await getScan(req.params.scanId);
  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  return res.status(200).json(scan);
});
