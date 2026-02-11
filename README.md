# PokeScan

Mobile + API starter for scanning graded Pokemon cards and estimating fair market value.

## Monorepo Layout

- `apps/api`: Node.js + TypeScript API scaffold.
- `apps/mobile`: Expo React Native scaffold.
- `docs/TECH_SPEC.md`: Product and technical specification.
- `docs/APP_STORE_RELEASE.md`: iOS + Android release workflow (EAS build/submit).

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure API env:
```bash
cp apps/api/.env.example apps/api/.env
```

3. Start Postgres locally (example with Docker):
```bash
docker run --name pokescan-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pokescan -p 5432:5432 -d postgres:16
```

4. Start API (port 4000):
```bash
npm run dev:api
```

5. Configure mobile env:
```bash
cp apps/mobile/.env.example apps/mobile/.env
```

6. Start mobile app:
```bash
npm run dev:mobile
```

## One-Command Local API + Postgres

Start both backend services with Docker Compose:
```bash
docker compose up --build
```

This starts:
- Postgres on `localhost:5432`
- API on `localhost:4000`

Stop services:
```bash
docker compose down
```

## App Store Availability

The mobile app is configured for both platforms:
- iOS App Store: `apps/mobile/app.config.ts` (`ios.bundleIdentifier`, `buildNumber`)
- Google Play: `apps/mobile/app.config.ts` (`android.package`, `versionCode`)
- EAS build/submit profiles: `eas.json`

To publish, follow `docs/APP_STORE_RELEASE.md`.

## Environment

Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` to your machine's reachable address, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:4000
```

### AI and Pricing Providers

- `OPENAI_API_KEY` is used for OCR + visual identity parsing.
- `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` are used for sold-comp pulls.
- Cert lookup parsers are implemented for PSA/BGS/CGC (best-effort HTML parsing).
- Sold comp filtering rejects likely bad comps (`reprint`, `proxy`, `lot`, `raw`, etc.) before FMV.
- If provider values are missing, the API falls back to deterministic demo inference and pricing.
