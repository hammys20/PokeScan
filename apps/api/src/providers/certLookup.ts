import type { CardIdentity, GradingCompany } from "../types.js";

export type CertLookupResult = {
  matched: boolean;
  card?: CardIdentity;
  gradingCompany?: GradingCompany;
  gradeNumeric?: number;
  rawLabelText?: string;
  sourceUrl?: string;
};

type ParsedFields = {
  rawLabelText: string;
  gradeNumeric?: number;
  cardNumber?: string;
  cardName?: string;
  setName?: string;
};

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function parseGrade(text: string): number | undefined {
  const patterns = [
    /(?:grade|final\s*grade|assessment)\s*[:#-]?\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1(?:\.5)?)/i,
    /\b(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1(?:\.5)?)\s*(?:gem\s*mint|mint|near\s*mint|nm|mt)?\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1]);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }

  return undefined;
}

function parseCardNumber(text: string): string | undefined {
  const numberedMatch = text.match(/\b\d{1,3}\s*\/\s*\d{1,3}\b/);
  if (numberedMatch?.[0]) {
    return numberedMatch[0].replace(/\s+/g, "");
  }

  const hashMatch = text.match(/(?:card\s*#|#)\s*([A-Z0-9-]{1,12})/i);
  if (hashMatch?.[1]) {
    return hashMatch[1].toUpperCase();
  }

  return undefined;
}

function parseCardName(text: string): string | undefined {
  const knownNames = [
    "Charizard",
    "Blastoise",
    "Venusaur",
    "Pikachu",
    "Mew",
    "Mewtwo",
    "Lugia",
    "Gengar",
    "Umbreon",
    "Rayquaza"
  ];

  const lower = text.toLowerCase();
  const found = knownNames.find((name) => lower.includes(name.toLowerCase()));
  return found;
}

function parseSetName(text: string): string | undefined {
  const knownSets = [
    "Base Set",
    "Jungle",
    "Fossil",
    "Team Rocket",
    "Neo Genesis",
    "Skyridge",
    "Evolving Skies"
  ];

  const lower = text.toLowerCase();
  const found = knownSets.find((setName) => lower.includes(setName.toLowerCase()));
  return found;
}

function buildCardIdentity(fields: ParsedFields): CardIdentity | undefined {
  if (!fields.cardName || !fields.cardNumber) {
    return undefined;
  }

  return {
    name: fields.cardName,
    cardNumber: fields.cardNumber,
    setName: fields.setName ?? "Unknown Set"
  };
}

function parseHtmlForFields(html: string): ParsedFields {
  const text = normalizeText(html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "));
  return {
    rawLabelText: text,
    gradeNumeric: parseGrade(text),
    cardNumber: parseCardNumber(text),
    cardName: parseCardName(text),
    setName: parseSetName(text)
  };
}

async function lookupPsa(certNumber: string): Promise<CertLookupResult> {
  const sourceUrl = `https://www.psacard.com/cert/${encodeURIComponent(certNumber)}`;
  const response = await fetch(sourceUrl, { method: "GET" });
  if (!response.ok) {
    return { matched: false, sourceUrl };
  }

  const html = await response.text();
  const parsed = parseHtmlForFields(html);
  const matched = /psa|cert\s*verification/i.test(parsed.rawLabelText);

  return {
    matched,
    gradingCompany: matched ? "PSA" : undefined,
    gradeNumeric: parsed.gradeNumeric,
    card: buildCardIdentity(parsed),
    rawLabelText: parsed.rawLabelText,
    sourceUrl
  };
}

async function lookupBgs(certNumber: string): Promise<CertLookupResult> {
  const sourceUrl = `https://www.beckett.com/grading/card-lookup?item_type=BGS&item_id=${encodeURIComponent(certNumber)}`;
  const response = await fetch(sourceUrl, { method: "GET" });
  if (!response.ok) {
    return { matched: false, sourceUrl };
  }

  const html = await response.text();
  const parsed = parseHtmlForFields(html);
  const matched = /beckett|bgs|grading/i.test(parsed.rawLabelText);

  return {
    matched,
    gradingCompany: matched ? "BGS" : undefined,
    gradeNumeric: parsed.gradeNumeric,
    card: buildCardIdentity(parsed),
    rawLabelText: parsed.rawLabelText,
    sourceUrl
  };
}

async function lookupCgc(certNumber: string): Promise<CertLookupResult> {
  const sourceUrl = `https://www.cgccards.com/certlookup/${encodeURIComponent(certNumber)}/`;
  const response = await fetch(sourceUrl, { method: "GET" });
  if (!response.ok) {
    return { matched: false, sourceUrl };
  }

  const html = await response.text();
  const parsed = parseHtmlForFields(html);
  const matched = /cgc|cert\s*lookup|grading/i.test(parsed.rawLabelText);

  return {
    matched,
    gradingCompany: matched ? "CGC" : undefined,
    gradeNumeric: parsed.gradeNumeric,
    card: buildCardIdentity(parsed),
    rawLabelText: parsed.rawLabelText,
    sourceUrl
  };
}

export async function lookupCertNumber(
  certNumber: string | null,
  gradingCompany: GradingCompany
): Promise<CertLookupResult> {
  if (!certNumber) {
    return { matched: false };
  }

  try {
    if (gradingCompany === "PSA") {
      return await lookupPsa(certNumber);
    }

    if (gradingCompany === "BGS") {
      return await lookupBgs(certNumber);
    }

    return await lookupCgc(certNumber);
  } catch {
    return { matched: false };
  }
}
