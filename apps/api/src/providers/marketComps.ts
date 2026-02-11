import { config } from "../config.js";
import type { CardIdentity, GradingCompany } from "../types.js";

type SoldComp = {
  title: string;
  price: number;
  soldAt: Date;
};

type EbayTokenCache = {
  value: string;
  expiresAtEpochMs: number;
};

let ebayTokenCache: EbayTokenCache | null = null;

const BLOCKLIST_PATTERNS = [
  /\breprint\b/i,
  /\bproxy\b/i,
  /\bproxies\b/i,
  /\bcustom\b/i,
  /\bfan\s*art\b/i,
  /\borica\b/i,
  /\bworld\s*championship\b/i,
  /\bcelebration\s*proxy\b/i,
  /\blot\s*of\b/i,
  /\blot\b/i,
  /\bset\s*of\b/i,
  /\bpack\s*fresh\b/i,
  /\bdamaged\b/i,
  /\bcreased\b/i,
  /\bpoor\b/i,
  /\bplayed\b/i,
  /\bproxy\s*card\b/i,
  /\bnot\s*graded\b/i,
  /\braw\b/i
];

async function getEbayAccessToken(): Promise<string | null> {
  if (!config.ebayClientId || !config.ebayClientSecret) return null;

  if (ebayTokenCache && ebayTokenCache.expiresAtEpochMs > Date.now() + 30_000) {
    return ebayTokenCache.value;
  }

  const auth = Buffer.from(`${config.ebayClientId}:${config.ebayClientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope"
  });

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`
    },
    body
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { access_token: string; expires_in: number };

  ebayTokenCache = {
    value: payload.access_token,
    expiresAtEpochMs: Date.now() + payload.expires_in * 1000
  };

  return payload.access_token;
}

function removeOutliers(prices: number[]): number[] {
  if (prices.length < 6) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const min = q1 - iqr * 1.5;
  const max = q3 + iqr * 1.5;
  return sorted.filter((p) => p >= min && p <= max);
}

function weightedPercentile(points: Array<{ price: number; weight: number }>, p: number): number {
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((sum, x) => sum + x.weight, 0);
  const target = totalWeight * p;

  let cumulative = 0;
  for (const point of sorted) {
    cumulative += point.weight;
    if (cumulative >= target) return point.price;
  }

  return sorted[sorted.length - 1]?.price ?? 0;
}

function computeWeightedBand(comps: SoldComp[]) {
  const now = Date.now();
  const cleanedPrices = removeOutliers(comps.map((comp) => comp.price));
  const cleanedSet = new Set(cleanedPrices);

  const weighted = comps
    .filter((comp) => cleanedSet.has(comp.price))
    .map((comp) => {
      const ageDays = Math.max(1, (now - comp.soldAt.getTime()) / (1000 * 60 * 60 * 24));
      const weight = Math.exp(-ageDays / 45);
      return { price: comp.price, weight };
    });

  if (!weighted.length) {
    return { mid: 0, low: 0, high: 0 };
  }

  return {
    low: Math.round(weightedPercentile(weighted, 0.25)),
    mid: Math.round(weightedPercentile(weighted, 0.5)),
    high: Math.round(weightedPercentile(weighted, 0.75))
  };
}

function normalizeToken(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();
}

function formatGradeTokens(gradeNumeric: number): string[] {
  const grade = String(gradeNumeric);
  const compact = grade.replace(".0", "");
  const tokens = new Set<string>([grade, compact, `grade ${compact}`, `${compact} `]);

  if (compact.endsWith(".5")) {
    const asX5 = compact.replace(".5", " 5");
    tokens.add(asX5);
  }

  return [...tokens].map((token) => normalizeToken(token));
}

function shouldRejectByTitleBlocklist(title: string): boolean {
  return BLOCKLIST_PATTERNS.some((pattern) => pattern.test(title));
}

function listingMatchesIdentity(
  title: string,
  identity: { card: CardIdentity; gradeNumeric: number; gradingCompany: GradingCompany }
): boolean {
  const normalizedTitle = normalizeToken(title);
  const cardNameTokens = normalizeToken(identity.card.name).split(" ").filter(Boolean);
  const cardNumberToken = normalizeToken(identity.card.cardNumber);
  const setNameTokens = normalizeToken(identity.card.setName).split(" ").filter(Boolean);
  const gradeTokens = formatGradeTokens(identity.gradeNumeric);

  const hasCardName = cardNameTokens.some((token) => normalizedTitle.includes(token));
  const hasCardNumber = !!cardNumberToken && normalizedTitle.includes(cardNumberToken);
  const hasCompany = normalizedTitle.includes(normalizeToken(identity.gradingCompany));
  const hasGrade = gradeTokens.some((token) => token && normalizedTitle.includes(token));
  const hasSetHint = setNameTokens.some((token) => normalizedTitle.includes(token));

  const strictMatch = hasCardName && hasCardNumber && hasCompany && hasGrade;
  const softMatch = hasCardName && hasCardNumber && hasCompany && hasSetHint;

  return strictMatch || softMatch;
}

async function fetchEbaySoldComps(query: string): Promise<SoldComp[]> {
  const token = await getEbayAccessToken();
  if (!token) return [];

  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  url.searchParams.set("OPERATION-NAME", "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "");
  url.searchParams.set("keywords", query);
  url.searchParams.set("itemFilter(0).name", "SoldItemsOnly");
  url.searchParams.set("itemFilter(0).value", "true");
  url.searchParams.set("itemFilter(1).name", "LocatedIn");
  url.searchParams.set("itemFilter(1).value", "US");
  url.searchParams.set("paginationInput.entriesPerPage", "100");

  const response = await fetch(url, {
    headers: {
      "X-EBAY-SOA-SECURITY-APPNAME": config.ebayClientId,
      "X-EBAY-SOA-GLOBAL-ID": config.ebayMarketplaceId,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as {
    findCompletedItemsResponse?: Array<{
      searchResult?: Array<{
        item?: Array<{
          title?: string[];
          sellingStatus?: Array<{
            currentPrice?: Array<{ __value__?: string }>;
          }>;
          listingInfo?: Array<{
            endTime?: string[];
          }>;
        }>;
      }>;
    }>;
  };

  const items = payload.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

  return items
    .map((item) => {
      const title = item.title?.[0] ?? "";
      const priceStr = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__;
      const soldAt = item.listingInfo?.[0]?.endTime?.[0];
      if (!priceStr || !soldAt || !title) return null;

      const price = Number(priceStr);
      const soldAtDate = new Date(soldAt);
      if (Number.isNaN(price) || Number.isNaN(soldAtDate.getTime())) return null;

      return { title, price, soldAt: soldAtDate };
    })
    .filter((value): value is SoldComp => value !== null);
}

function fallbackComps(identity: {
  card: CardIdentity;
  gradeNumeric: number;
  gradingCompany: GradingCompany;
}) {
  const base = identity.card.cardNumber === "4/102" ? 880 : identity.card.cardNumber === "2/102" ? 440 : 360;
  const gradeMultiplier = identity.gradeNumeric === 10 ? 2.25 : identity.gradeNumeric === 9 ? 1.12 : 0.87;
  const companyMultiplier = identity.gradingCompany === "PSA" ? 1 : identity.gradingCompany === "BGS" ? 0.97 : 0.95;
  const mid = Math.round(base * gradeMultiplier * companyMultiplier);
  return {
    fairMarketValue: mid,
    rangeLow: Math.round(mid * 0.93),
    rangeHigh: Math.round(mid * 1.08),
    sampleSize: 0,
    windowDays: 90
  };
}

export async function computeFmvFromComps(identity: {
  card: CardIdentity;
  gradeNumeric: number;
  gradingCompany: GradingCompany;
}) {
  const query = `${identity.card.name} ${identity.card.cardNumber} ${identity.card.setName} ${identity.gradingCompany} ${identity.gradeNumeric} -reprint -proxy -lot`;

  try {
    const rawComps = await fetchEbaySoldComps(query);
    const filteredComps = rawComps
      .filter((comp) => !shouldRejectByTitleBlocklist(comp.title))
      .filter((comp) => listingMatchesIdentity(comp.title, identity));

    if (!filteredComps.length) {
      return {
        currency: "USD" as const,
        ...fallbackComps(identity)
      };
    }

    const { low, mid, high } = computeWeightedBand(filteredComps);

    return {
      currency: "USD" as const,
      fairMarketValue: mid,
      rangeLow: low,
      rangeHigh: high,
      sampleSize: filteredComps.length,
      windowDays: 90
    };
  } catch {
    return {
      currency: "USD" as const,
      ...fallbackComps(identity)
    };
  }
}
