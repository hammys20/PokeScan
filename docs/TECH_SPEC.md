# PokeScan Technical Specification (MVP)

## 1. Product Goal

Enable users to scan graded Pokemon cards using a mobile device and return a fair market value (FMV) with confidence.

Primary user outcome:
- "I scanned my slab and can see what it is and what it is worth right now."

## 2. MVP Scope

Included:
- Camera scan flow for graded cards.
- OCR of slab label and optional cert number extraction.
- AI-assisted card identity resolution from image + OCR text.
- FMV calculation from recent sold comps.
- Confidence score and confidence-gated user confirmation.
- Scan history.

Not included in MVP:
- Full portfolio analytics.
- Automated alerts.
- Social marketplace features.
- In-app buying/selling.

## 3. System Architecture

### 3.1 Components

- Mobile App (`apps/mobile`)
  - Capture or upload card/slab photos.
  - Display identified card details, FMV range, and confidence.
  - Allow user correction when confidence is low.

- API Service (`apps/api`)
  - Orchestrates OCR, identity resolution, and FMV valuation.
  - Exposes public endpoints for scan analysis and valuation retrieval.
  - Stores scans and valuation results.

- Data Sources
  - Card metadata source (set, number, rarity, language, variants).
  - Grading cert verification source (e.g., PSA when available).
  - Market comps source (sold transaction data).

### 3.2 High-Level Flow

1. User submits slab image.
2. OCR extracts text from label area.
3. Identity resolver combines:
   - OCR tokens (name, set, card number, grade, cert number)
   - Vision model output from card image
4. Resolver returns `best_match` + `alternatives` + `confidence`.
5. If confidence < threshold (e.g., 0.82), app asks user to confirm.
6. FMV engine queries normalized sold comps for exact card + grade.
7. FMV output includes point estimate + low/high band + sample size.

## 4. Data Model

### 4.1 Core Entities

`card_catalog`
- `id` (uuid)
- `name`
- `set_name`
- `set_code`
- `card_number`
- `language`
- `printing` (1st edition, unlimited, etc.)
- `variant` (holo/reverse holo/etc.)
- `image_ref`
- `created_at`

`graded_card_instance`
- `id` (uuid)
- `card_catalog_id` (fk)
- `grading_company` (PSA/BGS/CGC)
- `grade_numeric` (float)
- `cert_number` (nullable)
- `label_text_raw`
- `created_at`

`market_comp`
- `id` (uuid)
- `card_catalog_id` (fk)
- `grading_company`
- `grade_numeric`
- `sold_price`
- `currency`
- `sold_at`
- `source`
- `source_listing_id`
- `confidence` (source parsing confidence)
- `created_at`

`scan_event`
- `id` (uuid)
- `user_id` (nullable for guest)
- `input_image_uri`
- `ocr_text`
- `model_card_candidate`
- `model_grade_candidate`
- `identity_confidence`
- `resolved_card_catalog_id` (nullable)
- `resolved_grading_company` (nullable)
- `resolved_grade_numeric` (nullable)
- `fmv_mid`
- `fmv_low`
- `fmv_high`
- `currency`
- `status`
- `created_at`

## 5. API Contract

### 5.1 `POST /v1/scans/analyze`

Request:
```json
{
  "imageBase64": "...",
  "userHints": {
    "gradingCompany": "PSA"
  }
}
```

Response:
```json
{
  "scanId": "uuid",
  "identity": {
    "card": {
      "name": "Charizard",
      "setName": "Base Set",
      "cardNumber": "4/102"
    },
    "gradingCompany": "PSA",
    "gradeNumeric": 9,
    "certNumber": "12345678",
    "confidence": 0.9,
    "alternatives": []
  },
  "valuation": {
    "currency": "USD",
    "fairMarketValue": 975,
    "rangeLow": 920,
    "rangeHigh": 1040,
    "sampleSize": 14,
    "windowDays": 90
  },
  "needsUserConfirmation": false
}
```

### 5.2 `POST /v1/scans/:scanId/confirm`

Request:
```json
{
  "cardCatalogId": "uuid",
  "gradingCompany": "PSA",
  "gradeNumeric": 9
}
```

Response:
```json
{
  "scanId": "uuid",
  "status": "confirmed",
  "valuation": {
    "currency": "USD",
    "fairMarketValue": 975,
    "rangeLow": 920,
    "rangeHigh": 1040
  }
}
```

### 5.3 `GET /v1/scans/:scanId`

Returns persisted scan result and current valuation metadata.

## 6. AI Identification Pipeline

### 6.1 OCR Stage

Input:
- Full slab image.
- Optional crop hints (label region).

Output:
- Detected text blocks.
- Candidate cert number.
- Candidate grade string.

### 6.2 Cert Resolution Stage

If `cert_number` detected:
- Query cert verification source.
- If exact match returned, boost confidence heavily.

### 6.3 Vision Resolution Stage

Model prompt context:
- OCR tokens.
- Card art crop.
- Candidate set and number list from catalog fuzzy search.

Output:
- Top-N candidates with confidence.

### 6.4 Confidence Gating

- Auto-accept when confidence >= 0.82 and no conflicting fields.
- Require user confirmation otherwise.

## 7. FMV Calculation

### 7.1 Inputs

- Exact identity tuple:
  - `card_catalog_id`
  - `grading_company`
  - `grade_numeric`

- Comps window:
  - Last 90 days preferred.
  - Fallback to 180 days when sample size < minimum.

### 7.2 Filtering

- Only sold transactions.
- Remove obvious outliers (IQR-based).
- Drop low-confidence parsed records.

### 7.3 Formula (MVP)

1. Compute weighted median sold price.
2. Weight by recency using exponential decay.
3. FMV mid = weighted median.
4. Low/high band from weighted 25th/75th percentile.
5. Require minimum sample size threshold; otherwise return low-confidence valuation state.

## 8. Security and Compliance

- Do not store raw images indefinitely by default.
- Encrypt sensitive user data at rest.
- Use signed upload URLs when moving to production object storage.
- Respect marketplace API and data licensing terms.

## 9. Observability

Track:
- OCR success rate.
- Identity top-1 accuracy.
- User correction rate.
- Valuation coverage rate.
- Median API latency.

## 10. Roadmap After MVP

- Active learning loop from corrected scans.
- Better variance estimates for thinly traded cards.
- Portfolio and watchlist features.
- On-device pre-classification for faster UX.
