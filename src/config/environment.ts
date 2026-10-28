import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Returns the appropriate API base URL based on environment and platform.
 */
function getApiBaseUrl(): string {
  // 1. Explicitly configured public env variable (for native devices & web)
  const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (rawUrl && typeof rawUrl === "string" && rawUrl.trim() !== "") {
    // Strip trailing slashes and trailing /api since endpoints are prefixed with /api
    return rawUrl.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  }

  // 2. Web browser: connect directly to backend on port 4000
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname || "localhost";
      return `http://${hostname}:4000`;
    }
    return "http://localhost:4000";
  }

  // 3. Development host detection (auto-resolves your PC's IP when scanning from Expo Go)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:4000`;
  }

  // 4. Android emulator alias for host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  IS_DEV: __DEV__,
} as const;
