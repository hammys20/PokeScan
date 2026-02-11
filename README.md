# PokeScan

Mobile + API starter for scanning graded Pokemon cards and estimating fair market value.

## Monorepo Layout

- `apps/api`: Node.js + TypeScript API scaffold.
- `apps/mobile`: Expo React Native scaffold.
- `docs/TECH_SPEC.md`: Product and technical specification.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start API (port 4000):
```bash
npm run dev:api
```

3. Start mobile app:
```bash
npm run dev:mobile
```

## Environment

Create `apps/api/.env` from `apps/api/.env.example`.

For local mobile API access, set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` (or app config) to your machine's reachable address, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:4000
```
