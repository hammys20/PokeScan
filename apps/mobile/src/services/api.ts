export type AnalyzeResult = {
  scanId: string;
  identity: {
    card: {
      name: string;
      setName: string;
      cardNumber: string;
    };
    gradingCompany: "PSA" | "BGS" | "CGC";
    gradeNumeric: number;
    certNumber: string | null;
    confidence: number;
    alternatives: Array<{
      name: string;
      setName: string;
      cardNumber: string;
    }>;
    rawLabelText?: string;
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function analyzeCard(imageBase64: string): Promise<AnalyzeResult> {
  const response = await fetch(`${API_BASE_URL}/v1/scans/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ imageBase64 })
  });

  if (!response.ok) {
    throw new Error(`Analyze failed with status ${response.status}`);
  }

  return (await response.json()) as AnalyzeResult;
}
