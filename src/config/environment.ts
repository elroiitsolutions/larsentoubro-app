import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Returns the appropriate API base URL based on environment and platform.
 */
function getApiBaseUrl(): string {
  // 1. Web browser: connect directly to localhost:3000 or the same host
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname || "localhost";
      return `http://${hostname}:3000`;
    }
    return "http://localhost:3000";
  }

  // 2. Explicitly configured public env variable (for native devices)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // 3. Development host detection (auto-resolves your PC's IP when scanning from Expo Go)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }

  // 4. Android emulator alias for host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
}

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  IS_DEV: __DEV__,
} as const;
