import type { AnalyzeResponse, CardIdentity, GradingCompany } from "./types.js";

const demoCards: CardIdentity[] = [
  { name: "Charizard", setName: "Base Set", cardNumber: "4/102" },
  { name: "Blastoise", setName: "Base Set", cardNumber: "2/102" },
  { name: "Venusaur", setName: "Base Set", cardNumber: "15/102" }
];

function pseudoRandom(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveIdentity(imageBase64: string, gradingCompanyHint?: GradingCompany) {
  const seed = pseudoRandom(imageBase64.slice(0, 120));
  const card = demoCards[seed % demoCards.length];
  const gradeNumeric = [8, 9, 10][seed % 3];
  const confidence = 0.72 + (seed % 25) / 100;
  const gradingCompany = gradingCompanyHint ?? "PSA";

  return {
    card,
    gradingCompany,
    gradeNumeric,
    certNumber: null,
    confidence: Math.min(confidence, 0.97),
    alternatives: demoCards.filter((c) => c.cardNumber !== card.cardNumber).slice(0, 2)
  };
}

export function computeFmv(identity: {
  cardNumber: string;
  gradeNumeric: number;
  gradingCompany: GradingCompany;
}): AnalyzeResponse["valuation"] {
  const base =
    identity.cardNumber === "4/102" ? 900 : identity.cardNumber === "2/102" ? 450 : 380;
  const gradeMultiplier = identity.gradeNumeric === 10 ? 2.25 : identity.gradeNumeric === 9 ? 1.1 : 0.85;
  const companyMultiplier = identity.gradingCompany === "PSA" ? 1.0 : identity.gradingCompany === "BGS" ? 0.97 : 0.95;

  const fairMarketValue = Math.round(base * gradeMultiplier * companyMultiplier);
  const rangeLow = Math.round(fairMarketValue * 0.93);
  const rangeHigh = Math.round(fairMarketValue * 1.08);

  return {
    currency: "USD",
    fairMarketValue,
    rangeLow,
    rangeHigh,
    sampleSize: 12,
    windowDays: 90
  };
}
