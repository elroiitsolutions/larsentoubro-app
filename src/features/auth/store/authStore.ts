import { create } from "zustand";
import { secureStorage } from "@/services/storage";
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
      const storedToken = await secureStorage.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const storedUserData = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUserData) {
        const user: UserProfile = JSON.parse(storedUserData);
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });

        // Silently refresh profile in background for non-guest users
        if (user.role !== "Guest") {
          get().refreshProfile();
        }
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
      const normalizedUser: UserProfile = {
        ...user,
        canCreateUser: Boolean(user.role === "Admin" || (user as any).canCreateUser),
        hasInspectionAccess: Boolean(user.role === "Admin" || (user as any).hasInspectionAccess),
      };
      await secureStorage.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));

      set({
        token,
        user: normalizedUser,
        isAuthenticated: true,
        isLoading: false,
      });

      if (normalizedUser.role !== "Guest") {
        get().refreshProfile();
      }
    } catch (error) {
      console.error("Failed to store auth token securely:", error);
    }
  },

  logout: async () => {
    try {
      await secureStorage.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
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
        const raw = res.data as any;
        const updatedUser: UserProfile = {
          ...raw,
          id: raw._id || raw.id,
          allowedPages: raw.allowedPages || ["/dashboard", "/projects", "/stores"],
          canCreateUser: Boolean(raw.role === "Admin" || raw.canCreateUser),
          hasInspectionAccess: Boolean(raw.role === "Admin" || raw.hasInspectionAccess),
        };

        await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error) {
      // Background refresh failed, keep current cached state
    }
  },
}));
