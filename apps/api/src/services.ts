import { lookupCertNumber } from "./providers/certLookup.js";
import { computeFmvFromComps } from "./providers/marketComps.js";
import { identifyCardFromImage } from "./providers/openaiVision.js";
import type { AnalyzeRequest, AnalyzeResponse } from "./types.js";

const CONFIDENCE_THRESHOLD = 0.82;

export async function analyzeScan(payload: AnalyzeRequest): Promise<Omit<AnalyzeResponse, "scanId">> {
  const identity = await identifyCardFromImage(payload.imageBase64, payload.userHints?.gradingCompany);

  const certResolution = await lookupCertNumber(identity.certNumber, identity.gradingCompany);
  const certBoost = certResolution.matched ? 0.1 : 0;
  const resolvedIdentity = {
    ...identity,
    card: certResolution.card ?? identity.card,
    gradingCompany: certResolution.gradingCompany ?? identity.gradingCompany,
    gradeNumeric: certResolution.gradeNumeric ?? identity.gradeNumeric,
    rawLabelText: identity.rawLabelText || certResolution.rawLabelText || ""
  };

  const boostedConfidence = Math.min(0.99, resolvedIdentity.confidence + certBoost);

  const valuation = await computeFmvFromComps({
    card: resolvedIdentity.card,
    gradeNumeric: resolvedIdentity.gradeNumeric,
    gradingCompany: resolvedIdentity.gradingCompany
  });

  return {
    identity: {
      ...resolvedIdentity,
      confidence: boostedConfidence
    },
    valuation,
    needsUserConfirmation: boostedConfidence < CONFIDENCE_THRESHOLD
  };
}
