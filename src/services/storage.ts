import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// In-memory fallback if localStorage is unavailable (e.g., SSR or private mode restrictions)
const memoryStorage = new Map<string, string>();

/**
 * Cross-platform secure storage wrapper.
 * Uses SecureStore on iOS/Android and localStorage (with memory fallback) on Web.
 */
export const secureStorage = {
  /**
   * Retrieves an item from storage.
   */
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage.get(key) || null;
      } catch (e) {
        return memoryStorage.get(key) || null;
      }
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[secureStorage] Failed to read ${key}:`, e);
      return null;
    }
  },

  /**
   * Stores an item in storage.
   */
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryStorage.set(key, value);
      } catch (e) {
        memoryStorage.set(key, value);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[secureStorage] Failed to write ${key}:`, e);
    }
  },

  /**
   * Deletes an item from storage.
   */
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        memoryStorage.delete(key);
      } catch (e) {
        memoryStorage.delete(key);
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[secureStorage] Failed to delete ${key}:`, e);
    }
  },
};

export default secureStorage;
