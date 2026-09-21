import { create } from "zustand";

interface AppState {
  themeMode: "light" | "dark" | "system";
  isOffline: boolean;
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  setIsOffline: (offline: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  themeMode: "light",
  isOffline: false,
  setThemeMode: (themeMode) => set({ themeMode }),
  setIsOffline: (isOffline) => set({ isOffline }),
}));
