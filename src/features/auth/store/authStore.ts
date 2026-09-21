import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AuthState } from "../types";
import { UserProfile } from "@/types/common.types";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { authService } from "../services/authService";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const storedUserData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUserData) {
        const user: UserProfile = JSON.parse(storedUserData);
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });

        // Silently refresh profile in background
        get().refreshProfile();
      } else {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  login: async (token: string, user: UserProfile) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to store auth token securely:", error);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      // Ignore
    } finally {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  refreshProfile: async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res.success && res.data) {
        const updatedUser: UserProfile = {
          ...res.data,
          id: res.data._id || res.data.id,
          allowedPages: res.data.allowedPages || ["/dashboard", "/projects", "/stores"],
        };

        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error) {
      // Background refresh failed, keep current cached state
    }
  },
}));
