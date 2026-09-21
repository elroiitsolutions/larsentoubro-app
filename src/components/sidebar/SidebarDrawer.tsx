import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import {
  LayoutDashboard,
  BarChart3,
  FolderGit2,
  Building2,
  Wrench,
  Truck,
  Recycle,
  Users,
  UserCheck,
  Trash2,
  FileText,
  Sliders,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  LucideIcon,
} from "lucide-react-native";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

interface MenuItem {
  label: string;
  route: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface MenuSection {
  title: string;
  adminOnly?: boolean;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", route: "/(tabs)", icon: LayoutDashboard },
      { label: "Reports & Audit", route: "/settings/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Operations & Assets",
    items: [
      { label: "Projects", route: "/(tabs)/projects", icon: FolderGit2 },
      { label: "Challan Register", route: "/challans", icon: Truck },
      { label: "Scrap Register", route: "/scrap", icon: Recycle },
    ],
  },
  {
    title: "Stakeholders & Vendors",
    items: [
      { label: "Profiles Directory", route: "/profiles", icon: Users },
    ],
  },
  {
    title: "Administration",
    adminOnly: true,
    items: [
      { label: "Access Approvals", route: "/admin/approvals", icon: UserCheck },
      { label: "Users & Scopes", route: "/users", icon: Users },
      { label: "Trash Archive", route: "/trash", icon: Trash2 },
    ],
  },
  {
    title: "System & Config",
    items: [
      { label: "Forms Management", route: "/settings/forms", icon: FileText },
      { label: "Layout Customizer", route: "/settings/layouts/tool-quick-view", icon: Sliders },
    ],
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

  const animProgress = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      animProgress.value = 0;
      animProgress.value = withTiming(1, {
        duration: 240,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      animProgress.value = 0;
    }
  }, [isOpen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animProgress.value, [0, 1], [0, 0.55]),
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

  // When closed, unmount completely: 0 DOM overhead, 0 touch interception
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
            backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 20,
          },
          drawerStyle,
        ]}
      >
        {/* Drawer Header */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16 }}>
                L&T
              </Text>
            </View>
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  fontSize: 16,
                  letterSpacing: -0.2,
                }}
              >
                L&T Enterprise
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 10,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Equipment Portal
              </Text>
            </View>
          </View>

          {/* Theme Toggle Button */}
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
              <Sun size={18} color="#F59E0B" />
            ) : (
              <Moon size={18} color="#4F46E5" />
            )}
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {MENU_SECTIONS.filter((sec) => !sec.adminOnly || isAdmin).map((section) => (
            <View key={section.title} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: theme.textMuted,
                  paddingHorizontal: 8,
                  marginBottom: 6,
                }}
              >
                {section.title}
              </Text>

              {section.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const IconComp = item.icon;
                  const isActive =
                    pathname === item.route ||
                    (item.route === "/(tabs)" && pathname === "/") ||
                    (item.route !== "/(tabs)" && pathname.startsWith(item.route));

                  return (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.7}
                      onPress={() => handleNavigate(item.route)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        marginBottom: 2,
                        backgroundColor: isActive
                          ? isDark
                            ? "#1E293B"
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
                          color={isActive ? theme.primary : theme.textSecondary}
                          strokeWidth={isActive ? 2.4 : 2}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? "700" : "500",
                            color: isActive ? theme.primary : theme.text,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>

                      {isActive && (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.primary,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          ))}
        </ScrollView>

        {/* Profile & Logout Footer */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderColor: theme.border,
          }}
        >
          {/* User Info Tile */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleNavigate("/(tabs)/profile")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 10,
              borderRadius: 14,
              backgroundColor: isDark ? "#111827" : "#F8FAFC",
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }}>
                {initials}
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
                {user?.name || "L&T Operator"}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                }}
                numberOfLines={1}
              >
                {user?.role || "Employee"}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: isDark ? "#2A0B0B" : "#FEF2F2",
              borderWidth: 1,
              borderColor: isDark ? "#501B1B" : "#FEE2E2",
              gap: 8,
            }}
          >
            <LogOut size={15} color="#EF4444" strokeWidth={2.2} />
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
}