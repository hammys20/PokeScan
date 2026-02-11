import OpenAI from "openai";
import { config } from "../config.js";
import type { CardIdentity, GradingCompany } from "../types.js";

type VisionIdentity = {
  card: CardIdentity;
  gradingCompany: GradingCompany;
  gradeNumeric: number;
  certNumber: string | null;
  confidence: number;
  alternatives: CardIdentity[];
  rawLabelText: string;
};

const demoCards: CardIdentity[] = [
  { name: "Charizard", setName: "Base Set", cardNumber: "4/102" },
  { name: "Blastoise", setName: "Base Set", cardNumber: "2/102" },
  { name: "Venusaur", setName: "Base Set", cardNumber: "15/102" }
];

const openai = config.openAiApiKey
  ? new OpenAI({
      apiKey: config.openAiApiKey
    })
  : null;

function pseudoRandom(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackIdentity(imageBase64: string, gradingCompanyHint?: GradingCompany): VisionIdentity {
  const seed = pseudoRandom(imageBase64.slice(0, 120));
  const card = demoCards[seed % demoCards.length];
  const gradeNumeric = [8, 9, 10][seed % 3];
  const confidence = 0.72 + (seed % 20) / 100;

  return {
    card,
    gradingCompany: gradingCompanyHint ?? "PSA",
    gradeNumeric,
    certNumber: null,
    confidence: Math.min(confidence, 0.92),
    alternatives: demoCards.filter((c) => c.cardNumber !== card.cardNumber).slice(0, 2),
    rawLabelText: ""
  };
}

function normalizeCompany(input?: string | null): GradingCompany {
  const value = (input ?? "").toUpperCase();
  if (value.includes("BGS") || value.includes("BECKETT")) return "BGS";
  if (value.includes("CGC")) return "CGC";
  return "PSA";
}

export async function identifyCardFromImage(
  imageBase64: string,
  gradingCompanyHint?: GradingCompany
): Promise<VisionIdentity> {
  if (!openai) {
    return fallbackIdentity(imageBase64, gradingCompanyHint);
  }

  try {
    const response = await openai.responses.create({
      model: config.openAiModel,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "You are identifying a graded Pokemon card slab from a single image. Return strict JSON with keys: cardName, setName, cardNumber, gradingCompany, gradeNumeric, certNumber, confidence, alternatives, rawLabelText. alternatives should be up to 2 objects with cardName, setName, cardNumber. confidence is 0.0-1.0."
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "auto"
            }
          ]
        }
      ]
    });

    const outputText = response.output_text;
    const parsed = JSON.parse(outputText) as {
      cardName: string;
      setName: string;
      cardNumber: string;
      gradingCompany?: string;
      gradeNumeric?: number;
      certNumber?: string | null;
      confidence?: number;
      alternatives?: Array<{ cardName: string; setName: string; cardNumber: string }>;
      rawLabelText?: string;
    };

    const alternatives = (parsed.alternatives ?? []).slice(0, 2).map((alt) => ({
      name: alt.cardName,
      setName: alt.setName,
      cardNumber: alt.cardNumber
    }));

    return {
      card: {
        name: parsed.cardName,
        setName: parsed.setName,
        cardNumber: parsed.cardNumber
      },
      gradingCompany: gradingCompanyHint ?? normalizeCompany(parsed.gradingCompany),
      gradeNumeric: Math.max(1, Math.min(10, Number(parsed.gradeNumeric ?? 9))),
      certNumber: parsed.certNumber ?? null,
      confidence: Math.max(0.01, Math.min(0.99, Number(parsed.confidence ?? 0.7))),
      alternatives,
      rawLabelText: parsed.rawLabelText ?? ""
    };
  } catch {
    return fallbackIdentity(imageBase64, gradingCompanyHint);
  }
}
