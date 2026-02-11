import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "PokeScan",
  slug: "pokescan",
  version: "0.1.0",
  scheme: "pokescan",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.pokescan.app",
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "PokeScan uses your camera to scan graded Pokemon cards.",
      NSPhotoLibraryUsageDescription: "PokeScan uses your photo library so you can upload card photos.",
      NSPhotoLibraryAddUsageDescription: "PokeScan saves scan snapshots to your library when requested."
    }
  },
  android: {
    package: "com.pokescan.app",
    versionCode: 1,
    permissions: ["CAMERA", "READ_MEDIA_IMAGES"]
  },
  plugins: [
    [
      "expo-image-picker",
      {
        photosPermission: "PokeScan needs photo access so you can upload graded card images.",
        cameraPermission: "PokeScan needs camera access so you can scan graded cards."
      }
    ]
  ],
  web: {
    bundler: "metro"
  },
  extra: {
    eas: {
      projectId: "REPLACE_WITH_EAS_PROJECT_ID"
    }
  }
};

export default config;
