import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  SlidersHorizontal,
  Building2,
  X,
  Truck,
  ChevronRight,
  QrCode,
  Menu,
  Sun,
  Moon,
} from "lucide-react-native";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { dashboardService } from "@/features/dashboard/services/dashboardService";
import {
  ExecutiveDashboardData,
  DashboardFilterParams,
  AlertItem,
} from "@/features/dashboard/types";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { AlertsSection } from "@/features/dashboard/components/AlertsSection";
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed";
import { DashboardFilterModal } from "@/features/dashboard/components/DashboardFilterModal";
import { ToolLifeExtensionModal } from "@/features/dashboard/components/ToolLifeExtensionModal";
import { LocationHierarchyView } from "@/components/common/LocationHierarchyView";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useAppTheme();
  const { openSidebar } = useSidebarStore();
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<DashboardFilterParams>({
    status: "All",
    division: "All",
    project: "All",
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Life Extension Modal State
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string>("T-001");

  const loadDashboard = useCallback(async (currentFilters: DashboardFilterParams) => {
    try {
      setError(null);
      const res = await dashboardService.getDashboardStats(currentFilters);
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
    loadDashboard(filters);
  }, [filters, loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(filters);
  };

  const handleCardPress = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? "All" : status,
    }));
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

  const hasActiveFilters =
    (filters.status && filters.status !== "All") ||
    (filters.division && filters.division !== "All") ||
    (filters.project && filters.project !== "All");

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      {/* App Navigation Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openSidebar}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
            accessibilityLabel="Open navigation drawer"
          >
            <Menu size={18} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </TouchableOpacity>

          <View className="w-9 h-9 rounded-xl bg-indigo-600 items-center justify-center">
            <Building2 size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              L&T Enterprise
            </Text>
            <Text className="text-[11px] text-slate-500 dark:text-slate-400">
              {user?.name || "Welcome"} • {user?.role || "Member"}
            </Text>
          </View>
        </View>

        {/* Filter Trigger */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilterModalVisible(true)}
          className={`w-9 h-9 rounded-xl items-center justify-center border ${
            hasActiveFilters
              ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700"
              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <SlidersHorizontal
            size={18}
            color={hasActiveFilters ? "#4F46E5" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <View className="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900 flex-row items-center justify-between">
          <View className="flex-row flex-wrap items-center gap-1.5 flex-1 mr-2">
            <Text className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              Filtered by:
            </Text>
            {filters.status && filters.status !== "All" && (
              <View className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {filters.status}
                </Text>
              </View>
            )}
            {filters.division && filters.division !== "All" && (
              <View className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  Div: {filters.division}
                </Text>
              </View>
            )}
            {filters.project && filters.project !== "All" && (
              <View className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  Project Active
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setFilters({ status: "All", division: "All", project: "All" })}
            className="p-1 rounded-full bg-indigo-100 dark:bg-indigo-900"
          >
            <X size={12} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <Loader fullScreen message="Loading executive dashboard..." />
      ) : error ? (
        <ErrorState
          title="Dashboard Unavailable"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadDashboard(filters);
          }}
        />
      ) : data ? (
        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-10"
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
          {/* Summary Metric Cards */}
          <SummaryCards
            data={data.summaryCards}
            activeStatus={filters.status}
            onCardPress={handleCardPress}
          />

          {/* Quick Operations Row */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push("/challans" as any)}
              className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row items-center justify-between shadow-xs"
            >
              <View className="flex-row items-center flex-1 mr-1.5">
                <View className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 items-center justify-center mr-2">
                  <Truck size={18} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    Challans Log
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    DC & RC
                  </Text>
                </View>
              </View>
              <ChevronRight size={12} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push("/scanner" as any)}
              className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row items-center justify-between shadow-xs"
            >
              <View className="flex-row items-center flex-1 mr-1.5">
                <View className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center mr-2">
                  <QrCode size={18} color="#4F46E5" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    QR Scanner
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    Site Audit
                  </Text>
                </View>
              </View>
              <ChevronRight size={12} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Action Required Alerts */}
          <AlertsSection alerts={data.alerts} onAlertPress={handleAlertPress} />

          {/* Location & Facilities Hierarchy Tree */}
          <LocationHierarchyView
            hierarchyData={data.hierarchyTree || []}
            selectedDivision={filters.division}
            selectedProject={filters.project}
            onSelectNode={(level, nameOrId) => {
              if (level === "division") {
                setFilters((prev) => ({
                  ...prev,
                  division: prev.division === nameOrId ? "All" : nameOrId,
                }));
              } else if (level === "project") {
                setFilters((prev) => ({
                  ...prev,
                  project: prev.project === nameOrId ? "All" : nameOrId,
                }));
              }
            }}
            onProjectPress={(projId) => router.push(`/projects/${projId}` as any)}
            onStorePress={(storeId) => router.push(`/stores/${storeId}` as any)}
          />

          {/* Recent Activity Audit Feed */}
          <ActivityFeed activities={data.recentActivity} />
        </ScrollView>
      ) : null}

      {/* Filters Modal */}
      {data && (
        <DashboardFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          filters={filters}
          hierarchy={data.hierarchyTree || []}
          onApply={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters({ status: "All", division: "All", project: "All" })}
        />
      )}

      {/* Tool Life Extension Modal */}
      <ToolLifeExtensionModal
        visible={extensionModalVisible}
        onClose={() => setExtensionModalVisible(false)}
        toolId={selectedToolId}
        onSuccess={() => loadDashboard(filters)}
      />
    </SafeAreaView>
  );
}
