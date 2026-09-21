import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Returns the appropriate API base URL based on environment and platform.
 */
function getApiBaseUrl(): string {
  // 1. Explicitly configured public env variable
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // 2. Development host detection (auto-resolves your PC's IP when scanning from Expo Go)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:4000`;
  }

  // 3. Platform fallback
  if (Platform.OS === "android") {
    // Android emulator alias for host machine
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  IS_DEV: __DEV__,
} as const;
