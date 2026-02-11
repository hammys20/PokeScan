export type GradingCompany = "PSA" | "BGS" | "CGC";

export type CardIdentity = {
  name: string;
  setName: string;
  cardNumber: string;
};

export type AnalyzeResponse = {
  scanId: string;
  identity: {
    card: CardIdentity;
    gradingCompany: GradingCompany;
    gradeNumeric: number;
    certNumber: string | null;
    confidence: number;
    alternatives: CardIdentity[];
  };
  valuation: {
    currency: "USD";
    fairMarketValue: number;
    rangeLow: number;
    rangeHigh: number;
    sampleSize: number;
    windowDays: number;
  };
  needsUserConfirmation: boolean;
};
