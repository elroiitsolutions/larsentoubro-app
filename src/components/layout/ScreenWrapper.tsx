import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Sun, Moon } from "lucide-react-native";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";

interface ScreenWrapperProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  headerRight?: React.ReactNode;
  rightAction?: React.ReactNode;
  showSidebarButton?: boolean;
  hideHeader?: boolean;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement;
  showThemeToggle?: boolean;
  showBack?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  title,
  subtitle,
  children,
  headerRight,
  rightAction,
  showSidebarButton = true,
  hideHeader = false,
  scrollable = false,
  contentContainerStyle,
  refreshControl,
  showThemeToggle = false,
}) => {
  const insets = useSafeAreaInsets();
  const { openSidebar } = useSidebarStore();
  const { isDark, theme, toggleTheme } = useAppTheme();

  const topInset =
    Platform.OS === "android"
      ? Math.max(insets.top, RNStatusBar.currentHeight || 0)
      : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header Bar */}
      {!hideHeader && (
        <View
          style={{
            backgroundColor: theme.headerBg,
            paddingTop: topInset,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 56,
            }}
          >
            {/* Left Action: Only show the sidebar toggle icon (no back icon) */}
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
              {showSidebarButton && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  delayPressIn={0}
                  onPress={openSidebar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                  accessibilityLabel="Open navigation drawer"
                >
                  <Menu size={20} color={theme.text} />
                </TouchableOpacity>
              )}

              {/* Title & Subtitle */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 17,
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 11,
                      fontWeight: "500",
                    }}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* Right Action */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {showThemeToggle && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={toggleTheme}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  accessibilityLabel="Toggle theme"
                >
                  {isDark ? (
                    <Sun size={17} color="#F59E0B" />
                  ) : (
                    <Moon size={17} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              )}
              {headerRight || rightAction}
            </View>
          </View>
        </View>
      )}

      {/* Main Content Area: Standard React Native ScrollView ensures all touches work instantly */}
      {scrollable ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.bg }}
          contentContainerStyle={[
            {
              flexGrow: 1,
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 24) + 100,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.bg,
            paddingBottom: insets.bottom,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
};
