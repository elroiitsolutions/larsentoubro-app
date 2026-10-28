import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Building2,
  Truck,
  QrCode,
  Menu,
  Sun,
  Moon,
  FolderGit2,
  BarChart3,
  Calendar,
  Zap,
} from "lucide-react-native";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { dashboardService } from "@/features/dashboard/services/dashboardService";
import {
  ExecutiveDashboardData,
  AlertItem,
} from "@/features/dashboard/types";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { AlertsSection } from "@/features/dashboard/components/AlertsSection";
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed";
import { ToolLifeExtensionModal } from "@/features/dashboard/components/ToolLifeExtensionModal";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { openSidebar } = useSidebarStore();
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Life Extension Modal State
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string>("T-001");

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await dashboardService.getDashboardStats();
      setData(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard metrics. Check server connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleAlertPress = (alert: AlertItem) => {
    if (
      alert.type.includes("Inspection") ||
      alert.type.includes("Expired") ||
      alert.title.toLowerCase().includes("inspection")
    ) {
      setSelectedToolId(alert.toolId || "T-001");
      setExtensionModalVisible(true);
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Top App Navigation Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: theme.headerBg,
          borderBottomWidth: 1,
          borderColor: theme.border,
          ...Platform.select({
            web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" },
            default: { elevation: 1 },
          }),
        }}
      >
        {/* Left: Sidebar trigger & Enterprise Branding */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openSidebar}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isDark ? "#262626" : "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark ? "#2E2E33" : "#E2E8F0",
            }}
            accessibilityLabel="Open navigation drawer"
          >
            <Menu size={18} color={theme.text} />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                padding: 3,
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#E2E8F0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
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
                  fontSize: 15,
                  fontWeight: "800",
                  color: theme.text,
                  letterSpacing: -0.3,
                  lineHeight: 18,
                }}
              >
                L&T Enterprise
              </Text>
              <Text
                style={{
                  fontSize: 10.5,
                  color: theme.textSecondary,
                  fontWeight: "500",
                  maxWidth: 160,
                }}
                numberOfLines={1}
              >
                {user?.name || "Asset Manager"} • {user?.role || "Admin"}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Actions: Theme Toggle */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isDark ? "#262626" : "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark ? "#2E2E33" : "#E2E8F0",
            }}
            accessibilityLabel="Toggle Theme"
          >
            {isDark ? <Sun size={16} color="#F59E0B" /> : <Moon size={16} color="#4F46E5" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      {loading ? (
        <Loader fullScreen message="Loading executive dashboard..." />
      ) : error ? (
        <ErrorState
          title="Dashboard Unavailable"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadDashboard();
          }}
        />
      ) : data ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
        >
          {/* Executive Overview Hero Banner (Compact & Sleek) */}
           {/* <View
            style={{
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#E2E8F0",
              ...Platform.select({
                web: { boxShadow: "0 2px 6px -1px rgba(15, 23, 42, 0.05)" },
                default: { elevation: 1 },
              }),
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Calendar size={12} color={theme.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textSecondary }}>
                  {formattedDate}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDark ? "#065F46" : "#A7F3D0",
                }}
              >
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#10B981" }} />
                <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#059669" }}>
                  Live Telemetry
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: theme.text,
                  letterSpacing: -0.4,
                }}
              >
                Operations Dashboard
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.primary }}>
                {data.summaryCards.totalTools || 0} Assets
              </Text>
            </View>
          </View> */}

          {/* 6 Equipment Metrics Count Cards (Non-clickable static overview) */}
          <SummaryCards data={data.summaryCards} />

          {/* 4-Action Quick Operations Dock (Zero Truncation on Mobile) */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8, paddingHorizontal: 2 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: isDark ? "#262626" : "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={13} color={theme.primary} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: theme.text,
                  letterSpacing: -0.2,
                }}
              >
                Field Operations Hub
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 7 }}>
              {/* QR Scanner */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/scanner" as any)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 2,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  ...Platform.select({
                    web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" },
                    default: { elevation: 1 },
                  }),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}
                >
                  <QrCode size={18} color="#4F46E5" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  QR Scan
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  Audits
                </Text>
              </TouchableOpacity>

              {/* Challans */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/challans" as any)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 2,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  ...Platform.select({
                    web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" },
                    default: { elevation: 1 },
                  }),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(2, 132, 199, 0.2)" : "#E0F2FE",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}
                >
                  <Truck size={18} color="#0284C7" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Challans
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  DC / RC
                </Text>
              </TouchableOpacity>

              {/* Projects */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/projects" as any)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 2,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  ...Platform.select({
                    web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" },
                    default: { elevation: 1 },
                  }),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}
                >
                  <FolderGit2 size={18} color="#059669" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Projects
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  Sites
                </Text>
              </TouchableOpacity>

              {/* Reports */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/settings/reports" as any)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 2,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  ...Platform.select({
                    web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" },
                    default: { elevation: 1 },
                  }),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "#FAF5FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}
                >
                  <BarChart3 size={18} color="#7C3AED" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Reports
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  PDF/CSV
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Required Alerts */}
          <AlertsSection alerts={data.alerts} onAlertPress={handleAlertPress} />

          {/* Real-Time Activity Audit Feed */}
          <ActivityFeed activities={data.recentActivity} />
        </ScrollView>
      ) : null}

      {/* Tool Life Extension Modal */}
      <ToolLifeExtensionModal
        visible={extensionModalVisible}
        onClose={() => setExtensionModalVisible(false)}
        toolId={selectedToolId}
        onSuccess={() => loadDashboard()}
      />
    </SafeAreaView>
  );
}
