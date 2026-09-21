import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getTheme, AppTheme } from "@/theme/colors";
import { useAppStore } from "@/store/appStore";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  colorScheme: "light" | "dark";
  themePreference: ThemePreference;
  isDark: boolean;
  theme: AppTheme;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme from SecureStore on startup
  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEYS.THEME_MODE);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemePreferenceState(saved);
          useAppStore.getState().setThemeMode(saved);
        }
      } catch (e) {
        // Fallback to default
      } finally {
        setIsLoaded(true);
      }
    }
    loadSavedTheme();
  }, []);

  // Compute active color scheme
  const colorScheme: "light" | "dark" = useMemo(() => {
    if (themePreference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return themePreference;
  }, [themePreference, systemScheme]);

  const isDark = colorScheme === "dark";
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  // Sync with NativeWind
  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    useAppStore.getState().setThemeMode(pref);
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.THEME_MODE, pref);
    } catch (e) {
      console.warn("Failed to persist theme preference:", e);
    }
  };

  const toggleTheme = async () => {
    const nextTheme: ThemePreference = isDark ? "light" : "dark";
    await setThemePreference(nextTheme);
  };

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      isDark,
      theme,
      setThemePreference,
      toggleTheme,
    }),
    [colorScheme, themePreference, isDark, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    const isDark = false;
    return {
      colorScheme: "light",
      themePreference: "light",
      isDark: false,
      theme: getTheme(isDark),
      setThemePreference: async () => {},
      toggleTheme: async () => {},
    };
  }
  return context;
}
