import { Router } from "express";
import { z } from "zod";
import { confirmScan, createScan, getScan } from "./store.js";
import { computeFmv, resolveIdentity } from "./services.js";

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

router.post("/v1/scans/analyze", (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const identity = resolveIdentity(parsed.data.imageBase64, parsed.data.userHints?.gradingCompany);
  const valuation = computeFmv({
    cardNumber: identity.card.cardNumber,
    gradeNumeric: identity.gradeNumeric,
    gradingCompany: identity.gradingCompany
  });

  const needsUserConfirmation = identity.confidence < 0.82;

  const stored = createScan({
    identity,
    valuation,
    needsUserConfirmation,
    status: "analyzed"
  });

  return res.status(200).json({
    scanId: stored.scanId,
    identity: stored.identity,
    valuation: stored.valuation,
    needsUserConfirmation: stored.needsUserConfirmation
  });
});

router.post("/v1/scans/:scanId/confirm", (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const scan = confirmScan(req.params.scanId);
  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  return res.status(200).json({
    scanId: scan.scanId,
    status: scan.status,
    valuation: scan.valuation
  });
});

router.get("/v1/scans/:scanId", (req, res) => {
  const scan = getScan(req.params.scanId);
  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  return res.status(200).json(scan);
});
