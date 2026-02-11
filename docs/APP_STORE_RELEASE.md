# App Store + Google Play Release Guide

This project is configured to ship to both Apple App Store and Google Play using Expo EAS.

## 1. One-time setup

1. Create Apple Developer and Google Play Console accounts.
2. Create the app records in both stores.
3. Install and log in to EAS CLI:
```bash
npm i -g eas-cli
eas login
```
4. Set the real app IDs in `apps/mobile/app.config.ts`:
- `ios.bundleIdentifier`
- `android.package`
5. Replace placeholders:
- `apps/mobile/app.config.ts` -> `extra.eas.projectId`
- `eas.json` -> `submit.production.ios.ascAppId`

## 2. Build production binaries

From repo root:
```bash
eas build -p ios --profile production
eas build -p android --profile production
```

Outputs:
- iOS: `.ipa`
- Android: `.aab`

## 3. Submit to stores

```bash
eas submit -p ios --profile production
eas submit -p android --profile production
```

## 4. Store checklist

- Privacy policy URL added in both store listings.
- Camera/photo permissions explained in app listing.
- Age rating/questionnaire completed.
- Support URL and contact email configured.
- In-app screenshots uploaded for phone form factors.
- TestFlight/Internal testing pass completed.

## 5. Production release cadence

- Increase app `version` in `apps/mobile/app.config.ts` for each public release.
- `buildNumber` (iOS) and `versionCode` (Android) are auto-incremented by EAS production profile.
