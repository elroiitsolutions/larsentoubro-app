import React, { useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import {
  QrCode,
  LayoutDashboard,
  FolderOpen,
  FileText,
  Archive,
  Building2,
  Trash2,
  Users,
  ShieldCheck,
  Settings2,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  LucideIcon,
} from "lucide-react-native";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 330);

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  requiredPage?: string;
}

/**
 * Main navigation items matching web application's app-sidebar.tsx exactly in order,
 * iconography, and titles.
 */
const NAV_MAIN_ITEMS: NavItem[] = [
  {
    title: "Scanner",
    url: "/scanner",
    icon: QrCode,
  },
  {
    title: "Dashboard",
    url: "/(tabs)",
    icon: LayoutDashboard,
    requiredPage: "/dashboard",
  },
  {
    title: "Projects",
    url: "/(tabs)/projects",
    icon: FolderOpen,
    requiredPage: "/projects",
  },
  {
    title: "Challan History",
    url: "/challans",
    icon: FileText,
    requiredPage: "/challans",
  },
  {
    title: "Scrap",
    url: "/scrap",
    icon: Archive,
    requiredPage: "/scrap",
  },
  {
    title: "Profile Management",
    url: "/profiles",
    icon: Building2,
    requiredPage: "/profiles",
  },
  {
    title: "Trash",
    url: "/trash",
    icon: Trash2,
    adminOnly: true,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    requiredPage: "/users",
  },
  {
    title: "Login Approvals",
    url: "/admin/approvals",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    url: "/(tabs)/settings",
    icon: Settings2,
    adminOnly: true,
  },
];

export const SidebarDrawer: React.FC = () => {
  const { isOpen, closeSidebar } = useSidebarStore();
  const { isDark, theme, toggleTheme } = useAppTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === "Admin";
  const isGuest = user?.role === "Guest";
  const isVendor = user?.role === "Vendor";
  const userAllowedPages = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
  const canManageSubusers = Boolean(isAdmin || (user as any)?.canCreateUser);

  // Filter items matching web AppSidebar logic exactly
  const navItems = React.useMemo(() => {
    if (isGuest) {
      return [
        {
          title: "Scanner",
          url: "/scanner",
          icon: QrCode,
        },
      ];
    }
    if (isAdmin) {
      return NAV_MAIN_ITEMS;
    }
    if (isVendor) {
      return NAV_MAIN_ITEMS.filter(
        (item) => item.url === "/challans" || item.url === "/scanner"
      );
    }

    const adminOnlyUrls = ["/trash"];
    const allowed = userAllowedPages;

    return NAV_MAIN_ITEMS
      .filter((item) => {
        if (adminOnlyUrls.includes(item.url)) return false;
        if (item.url === "/(tabs)/settings" || item.url === "/settings") {
          return isAdmin || allowed.includes("/settings");
        }
        if (item.url === "/users") {
          return Boolean(canManageSubusers);
        }
        if (item.url === "/admin/approvals") {
          return (
            user?.role === "Admin" ||
            user?.role === "User" ||
            Boolean(canManageSubusers)
          );
        }
        if (item.url === "/scanner") return true;
        if (item.url === "/(tabs)") return allowed.includes("/dashboard");
        if (item.url === "/(tabs)/projects") return allowed.includes("/projects");
        if (item.url === "/profiles") return allowed.includes("/profiles");
        if (item.url === "/challans")
          return (
            allowed.includes("/stores") ||
            allowed.includes("/tools") ||
            allowed.includes("/challans")
          );
        if (item.url === "/scrap")
          return (
            allowed.includes("/stores") ||
            allowed.includes("/tools") ||
            allowed.includes("/scrap")
          );
        return true;
      })
      .map((item) => {
        // When non-admin creates users, display title as Subusers (matching web)
        if (item.url === "/users" && !isAdmin) {
          return { ...item, title: "Subusers" };
        }
        return item;
      });
  }, [isGuest, isAdmin, isVendor, userAllowedPages, canManageSubusers]);

  const animProgress = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      animProgress.value = 0;
      animProgress.value = withTiming(1, {
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      animProgress.value = 0;
    }
  }, [isOpen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animProgress.value, [0, 1], [0, 0.5]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          animProgress.value,
          [0, 1],
          [-DRAWER_WIDTH, 0]
        ),
      },
    ],
  }));

  const checkIsActive = (url: string): boolean => {
    if (url === "/scanner") return pathname.startsWith("/scanner");
    if (url === "/(tabs)") return pathname === "/(tabs)" || pathname === "/";
    if (url === "/(tabs)/projects")
      return pathname.startsWith("/(tabs)/projects") || pathname.startsWith("/projects");
    if (url === "/challans") return pathname.startsWith("/challans");
    if (url === "/scrap") return pathname.startsWith("/scrap");
    if (url === "/profiles") return pathname.startsWith("/profiles");
    if (url === "/trash") return pathname.startsWith("/trash");
    if (url === "/users") return pathname.startsWith("/users");
    if (url === "/admin/approvals") return pathname.startsWith("/admin/approvals");
    if (url === "/(tabs)/settings" || url === "/settings")
      return pathname.startsWith("/(tabs)/settings") || pathname.startsWith("/settings");
    return pathname === url;
  };

  const handleNavigate = (route: string) => {
    closeSidebar();
    router.push(route as any);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to end your session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          closeSidebar();
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LT";

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000000",
            },
            backdropStyle,
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={closeSidebar}
            accessibilityLabel="Close sidebar"
          />
        </Animated.View>

        {/* Drawer Container */}
        <Animated.View
          style={[
            {
              width: DRAWER_WIDTH,
              height: "100%",
              backgroundColor: theme.drawerBg,
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 8,
              shadowColor: "#000",
              shadowOffset: { width: 4, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 20,
            },
            drawerStyle,
          ]}
        >
          {/* Header - Matching Web L&T Portal */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 3,
                }}
              >
                <Image
                  source={{ uri: LNT_LOGO_BASE64 }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "700",
                    fontSize: 15,
                    letterSpacing: -0.2,
                  }}
                >
                  L&T Portal
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 11,
                    fontWeight: "500",
                    marginTop: 1,
                  }}
                >
                  {user?.role || "Enterprise"}
                </Text>
              </View>
            </View>

            {/* Theme Toggle Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "#262626" : "#F1F5F9",
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
          </View>

          {/* Navigation Section: Single 'Platform' group matching web exactly */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 10 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  color: theme.textMuted,
                  paddingHorizontal: 10,
                  marginBottom: 8,
                }}
              >
                Platform
              </Text>

              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = checkIsActive(item.url);

                return (
                  <TouchableOpacity
                    key={item.title}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate(item.url)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      marginBottom: 2,
                      backgroundColor: isActive
                        ? isDark
                          ? "#262626"
                          : "#EEF2FF"
                        : "transparent",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                      }}
                    >
                      <IconComp
                        size={18}
                        color={isActive ? theme.primary : isDark ? "#94A3B8" : "#64748B"}
                        strokeWidth={isActive ? 2.3 : 1.9}
                      />
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: isActive ? "600" : "500",
                          color: isActive ? theme.primary : theme.text,
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>

                    {isActive && (
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          backgroundColor: theme.primary,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer - Profile & Logout matching Web User tile */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: theme.border,
            }}
          >
            {/* User Info Tile */}
            <TouchableOpacity
              activeOpacity={isGuest ? 1 : 0.8}
              onPress={() => {
                if (!isGuest) handleNavigate("/(tabs)/profile");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 9,
                borderRadius: 12,
                backgroundColor: isDark ? "#1E1E1E" : "#F8FAFC",
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: isGuest ? "#059669" : theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 12 }}>
                  {isGuest ? "G" : initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {isGuest ? "Guest User" : user?.name || user?.username || "L&T Operator"}
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 11,
                  }}
                  numberOfLines={1}
                >
                  {isGuest ? "QR Scanner Access" : user?.email || user?.role || "user@landt.com"}
                </Text>
              </View>
              {!isGuest && <ChevronRight size={16} color={theme.textMuted} />}
            </TouchableOpacity>

            {/* Sign Out Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: isDark ? "#2A0B0B" : "#FEF2F2",
                borderWidth: 1,
                borderColor: isDark ? "#501B1B" : "#FEE2E2",
                gap: 8,
              }}
            >
              <LogOut size={14} color="#EF4444" strokeWidth={2.2} />
              <Text
                style={{
                  color: "#EF4444",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};