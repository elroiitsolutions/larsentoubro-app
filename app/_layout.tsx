import "../global.css";
import React, { useEffect } from "react";
import { useColorScheme } from "nativewind";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/features/auth/store/authStore";

import { ThemeContextProvider, useAppTheme } from "@/context/ThemeContext";
import { SidebarDrawer } from "@/components/sidebar/SidebarDrawer";
import { Toast } from "@/components/ui/Toast";

function InnerRootLayout() {
  const { isDark } = useAppTheme();
  const { isAuthenticated, isInitialized, user, initializeAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Immediately hide any native splash overlay to ensure touches are never blocked
    SplashScreen.hideAsync().catch(() => { });
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments.some(
      (s) => s === "(auth)" || s === "login" || s === "forgot-password"
    );

    if (!isAuthenticated && !inAuthGroup && segments.length > 0) {
      router.replace("/(auth)/login" as any);
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.role === "Guest") {
        router.replace("/scanner" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } else if (isAuthenticated && user?.role === "Guest") {
      const inScanner = segments.some((s) => s === "scanner");
      if (!inScanner) {
        router.replace("/scanner" as any);
      }
    }
  }, [isAuthenticated, isInitialized, user, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="stores/[id]" options={{ headerShown: false }} />
        </Stack>
        {/* Global Slide-Out Sidebar Drawer */}
        <SidebarDrawer />
        {/* Global Non-Blocking Toast Notifications */}
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <InnerRootLayout />
    </ThemeContextProvider>
  );
}

