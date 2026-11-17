import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  Wrench,
  Plus,
  Eye,
  ChevronRight,
  Filter,
  Clock,
  Layers,
  Edit2,
  Trash2,
  MapPin,
  Tag,
  RotateCcw,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { toolService } from "@/features/tools/services/toolService";
import {
  ToolRecord,
  resolveValidationValue,
} from "@/features/tools/types";
import { ToolPreviewModal } from "@/features/tools/components/ToolPreviewModal";
import {
  ToolAdvancedFilterModal,
  ToolFilterState,
} from "@/features/tools/components/ToolAdvancedFilterModal";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const quickStatusOptions = ["All", "Available", "Moving", "Repair", "Missing"];

export default function ToolsCatalogScreen() {
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ status?: string }>();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [totalServerTools, setTotalServerTools] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<{
    all?: number;
    available?: number;
    moving?: number;
    repair?: number;
    missing?: number;
    printed?: number;
    unprinted?: number;
  }>({});

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<ToolFilterState>(() => ({
    status: searchParams.status || "All",
    printStatus: "All",
    category: "All",
    validation: "All",
    makeYear: "All",
  }));

  // Refs for tracking pagination and async requests
  const currentPageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const latestRequestIdRef = useRef(0);
  const isFirstMountRef = useRef(true);
  const hasMountedRef = useRef(false);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync incoming route params (e.g. from Dashboard cards)
  useEffect(() => {
    if (searchParams.status) {
      setFilters((prev) => ({
        ...prev,
        status: searchParams.status || "All",
      }));
    }
  }, [searchParams.status]);

  // Preview & Delete State
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);
  const [deletingTool, setDeletingTool] = useState<ToolRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManageTools = user?.role === "Admin" || user?.role === "Manager";

  // Build query parameters for server-side search, status, and advanced filtering
  const getQueryParams = useCallback(
    (pageNumber: number = 1) => {
      const params: any = {
        page: pageNumber,
        limit: 50,
        search: debouncedSearchQuery.trim() || undefined,
        status: filters.status !== "All" ? filters.status : undefined,
        printStatus: filters.printStatus !== "All" ? filters.printStatus : undefined,
        category: filters.category !== "All" ? filters.category : undefined,
        validation: filters.validation !== "All" ? filters.validation : undefined,
        makeYear: filters.makeYear !== "All" ? filters.makeYear : undefined,
      };

      const deepKeys: (keyof ToolFilterState)[] = [
        "toolCode",
        "toolId",
        "capacity",
        "safeWorkingLoad",
        "metalType",
        "toolVariant",
        "purchaserName",
        "supplierCode",
        "jobCode",
        "remarks",
      ];
      for (const k of deepKeys) {
        if (filters[k] && String(filters[k]).trim() !== "") {
          params[k] = String(filters[k]).trim();
        }
      }
      return params;
    },
    [debouncedSearchQuery, filters]
  );

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      setInitialLoading(true);
      isLoadingMoreRef.current = false;
      currentPageRef.current = 1;

      const res = await toolService.getAllToolsPaginated(getQueryParams(1));
      const initialTools = res?.data || [];
      setTools(initialTools);
      if (res?.statusCounts) {
        setStatusCounts(res.statusCounts);
      }
      const trueTotal = res?.total ?? initialTools.length;
      setTotalServerTools(trueTotal);
      setPage(1);
      setHasMore(initialTools.length < trueTotal);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load equipment catalog."
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [getQueryParams]);

  useEffect(() => {
    loadInitialData();
    hasMountedRef.current = true;
  }, [loadInitialData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) return;
      loadInitialData();
    }, [loadInitialData])
  );

  // Debounced search and filter query
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (initialLoading) return;

    let isCancelled = false;
    const currentRequestId = ++latestRequestIdRef.current;

    async function executeSearch() {
      try {
        setIsSearching(true);
        isLoadingMoreRef.current = false;
        currentPageRef.current = 1;

        const res = await toolService.getAllToolsPaginated(getQueryParams(1));

        if (isCancelled || currentRequestId !== latestRequestIdRef.current) {
          return;
        }

        const newTools = res?.data || [];
        setTools(newTools);
        if (res?.statusCounts) {
          setStatusCounts(res.statusCounts);
        }
        const total = res?.total ?? newTools.length;
        setTotalServerTools(total);
        setPage(1);
        setHasMore(newTools.length < total);
      } catch (err: any) {
        if (!isCancelled && currentRequestId === latestRequestIdRef.current) {
          console.error("Tools search failed:", err);
        }
      } finally {
        if (!isCancelled && currentRequestId === latestRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }

    executeSearch();

    return () => {
      isCancelled = true;
    };
  }, [getQueryParams, initialLoading]);

  // Load next 50 tools on scroll
  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || !hasMore || initialLoading || isSearching || refreshing) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const res = await toolService.getAllToolsPaginated(getQueryParams(nextPage));
      const newItems = res?.data || [];
      if (newItems.length > 0) {
        currentPageRef.current = nextPage;
        setPage(nextPage);
        setTools((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const uniqueNew = newItems.filter((t) => !existingIds.has(t._id));
          const updated = [...prev, ...uniqueNew];
          const total = res?.total ?? totalServerTools;
          setHasMore(updated.length < total);
          return updated;
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more tools on scroll:", err);
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    isLoadingMoreRef.current = false;
    currentPageRef.current = 1;
    try {
      const res = await toolService.getAllToolsPaginated(getQueryParams(1));
      const newTools = res?.data || [];
      setTools(newTools);
      if (res?.statusCounts) {
        setStatusCounts(res.statusCounts);
      }
      const total = res?.total ?? newTools.length;
      setTotalServerTools(total);
      setPage(1);
      setHasMore(newTools.length < total);
    } catch (err) {
      console.error("Refresh tools error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const isToolDeletable = (status?: string): boolean => {
    const s = (status || "").trim().toLowerCase();
    return s === "available" || s === "missing";
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTool) return;
    if (!isToolDeletable(deletingTool.status)) {
      Alert.alert(
        "Action Blocked",
        `Cannot delete equipment with status "${deletingTool.status}". Only Available and Missing tools can be moved to Trash.`
      );
      setDeletingTool(null);
      return;
    }
    try {
      setDeleteLoading(true);
      await toolService.deleteTool(deletingTool._id);
      setTools((prev) => prev.filter((t) => t._id !== deletingTool._id));
      setTotalServerTools((prev) => Math.max(0, prev - 1));
      setStatusCounts((prev) => ({
        ...prev,
        all: Math.max(0, (prev.all ?? 1) - 1),
        available: deletingTool.status === "Available" ? Math.max(0, (prev.available ?? 1) - 1) : prev.available,
        missing: deletingTool.status === "Missing" ? Math.max(0, (prev.missing ?? 1) - 1) : prev.missing,
      }));
      setDeletingTool(null);
      Alert.alert("Success", "Tool moved to Trash.");
    } catch (err: any) {
      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message || err?.message || "Could not delete tool."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusCount = (status: string) => {
    if (status === "All") return (statusCounts.all ?? totalServerTools ?? 0).toLocaleString();
    if (status === "Available") return (statusCounts.available ?? 0).toLocaleString();
    if (status === "Moving") return (statusCounts.moving ?? 0).toLocaleString();
    if (status === "Repair") return (statusCounts.repair ?? 0).toLocaleString();
    if (status === "Missing") return (statusCounts.missing ?? 0).toLocaleString();
    return 0;
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "All") count++;
    if (filters.printStatus && filters.printStatus !== "All") count++;
    if (filters.category !== "All") count++;
    if (filters.validation !== "All") count++;
    if (filters.makeYear !== "All") count++;
    const deepKeys: (keyof ToolFilterState)[] = [
      "toolCode",
      "toolId",
      "capacity",
      "safeWorkingLoad",
      "metalType",
      "toolVariant",
      "purchaserName",
      "supplierCode",
      "jobCode",
      "remarks",
    ];
    for (const k of deepKeys) {
      if (filters[k] && String(filters[k]).trim() !== "") count++;
    }
    return count;
  }, [filters]);

  const subtitleText = useMemo(() => {
    if (filters.status !== "All") {
      return `${totalServerTools.toLocaleString()} ${filters.status} Assets Tracked`;
    }
    return `${(totalServerTools || tools.length).toLocaleString()} Industrial Assets Tracked`;
  }, [filters.status, totalServerTools, tools.length]);

  return (
    <ScreenWrapper
      title="Equipment Catalog"
      subtitle={subtitleText}
      requiredPage="/tools"
      rightAction={
        canManageTools ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/tools/form" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
            }}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#FFFFFF" }}>
              Add Tool
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Equipment KPI Overview Strip */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "All" }))}
          style={{
            flex: 1,
            backgroundColor:
              filters.status === "All"
                ? isDark
                  ? "#312E81"
                  : "#EEF2FF"
                : isDark
                ? "#262626"
                : "#F8FAFC",
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "All" ? theme.primary : theme.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "900",
              color: filters.status === "All" ? theme.primary : theme.text,
            }}
          >
            {(statusCounts.all ?? totalServerTools).toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: theme.textSecondary,
              marginTop: 1,
            }}
          >
            Total
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "Available" }))}
          style={{
            flex: 1,
            backgroundColor:
              filters.status === "Available"
                ? isDark
                  ? "rgba(5, 150, 105, 0.25)"
                  : "#ECFDF5"
                : isDark
                ? "#262626"
                : "#F8FAFC",
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "Available" ? "#059669" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>
            {(statusCounts.available ?? 0).toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: theme.textSecondary,
              marginTop: 1,
            }}
          >
            Ready
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "Moving" }))}
          style={{
            flex: 1,
            backgroundColor:
              filters.status === "In Transit" || filters.status === "Moving"
                ? isDark
                  ? "rgba(2, 132, 199, 0.25)"
                  : "#F0F9FF"
                : isDark
                ? "#262626"
                : "#F8FAFC",
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor:
              filters.status === "In Transit" || filters.status === "Moving"
                ? "#0284C7"
                : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#0284C7" }}>
            {(statusCounts.moving ?? 0).toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: theme.textSecondary,
              marginTop: 1,
            }}
          >
            Transit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "Repair" }))}
          style={{
            flex: 1,
            backgroundColor:
              filters.status === "Under Repair" || filters.status === "Repair"
                ? isDark
                  ? "rgba(217, 119, 6, 0.25)"
                  : "#FFFBEB"
                : isDark
                ? "#262626"
                : "#F8FAFC",
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor:
              filters.status === "Under Repair" || filters.status === "Repair"
                ? "#D97706"
                : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#D97706" }}>
            {(statusCounts.repair ?? 0).toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: theme.textSecondary,
              marginTop: 1,
            }}
          >
            Repair
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: isDark ? "#181818" : "#FFFFFF",
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by code, name, category, serial..."
            />
          </View>

          {/* Filter Trigger Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setFilterModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              height: 42,
              borderRadius: 12,
              backgroundColor: activeFilterCount > 0 ? theme.primary : isDark ? "#262626" : "#F1F5F9",
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? theme.primary : theme.border,
              gap: 6,
            }}
          >
            <Filter
              size={16}
              color={activeFilterCount > 0 ? "#FFFFFF" : theme.textSecondary}
            />
            {activeFilterCount > 0 && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 9,
                  width: 18,
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: theme.primary,
                  }}
                >
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Horizontal Status Chips */}
        <FlatList
          horizontal
          data={quickStatusOptions}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = filters.status === item;
            const count = getStatusCount(item);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, status: item }))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 11,
                  paddingVertical: 5.5,
                  borderRadius: 10,
                  marginRight: 6,
                  backgroundColor: isSelected ? theme.primary : isDark ? "#262626" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {item}
                </Text>
                <View
                  style={{
                    backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : isDark ? "#2E2E33" : "#E2E8F0",
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontWeight: "800",
                      color: isSelected ? "#FFFFFF" : theme.textSecondary,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Active Filter Chips Preview */}
      {activeFilterCount > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: isDark ? "#181818" : "#F8FAFC",
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          {filters.validation !== "All" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FEF3C7",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                gap: 4,
              }}
            >
              <Clock size={11} color="#D97706" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E" }}>
                Validation: {filters.validation}
              </Text>
            </View>
          )}

          {filters.status !== "All" && (
            <View
              style={{
                backgroundColor: isDark ? "#262626" : "#E2E8F0",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: theme.text }}>
                Status: {filters.status}
              </Text>
            </View>
          )}

          {filters.category !== "All" && (
            <View
              style={{
                backgroundColor: isDark ? "#262626" : "#E2E8F0",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: theme.text }}>
                Category: {filters.category}
              </Text>
            </View>
          )}

          {filters.printStatus && filters.printStatus !== "All" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  filters.printStatus === "Printed"
                    ? isDark
                      ? "rgba(16, 185, 129, 0.2)"
                      : "#ECFDF5"
                    : isDark
                    ? "#262626"
                    : "#F1F5F9",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color:
                    filters.printStatus === "Printed"
                      ? isDark
                        ? "#34D399"
                        : "#059669"
                      : theme.textSecondary,
                }}
              >
                QR: {filters.printStatus}
              </Text>
            </View>
          )}

          {filters.makeYear !== "All" && (
            <View
              style={{
                backgroundColor: isDark ? "#262626" : "#E2E8F0",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: theme.text }}>
                Year: {filters.makeYear}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() =>
              setFilters({
                status: "All",
                printStatus: "All",
                category: "All",
                validation: "All",
                makeYear: "All",
              })
            }
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.danger,
                paddingVertical: 4,
                paddingHorizontal: 4,
              }}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tools List Content */}
      {initialLoading ? (
        <Loader fullScreen message="Loading equipment catalog..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Tools"
          message={error}
          onRetry={() => {
            loadInitialData();
          }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={tools}
          bounces={true}
          overScrollMode="always"
          initialNumToRender={20}
          maxToRenderPerBatch={25}
          windowSize={11}
          removeClippedSubviews={true}
          decelerationRate="normal"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          keyExtractor={(item, index) => (item._id ? `${item._id}-${index}` : String(index))}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => {
            const toolName = item.name || item.description || "Industrial Equipment";
            const code =
              item.toolId ||
              item.toolCode ||
              (item._id ? item._id.substring(item._id.length - 6).toUpperCase() : "N/A");
            const validationVal = resolveValidationValue(item);

            const getStatusColor = (status?: string) => {
              const s = (status || "").toLowerCase();
              if (s.includes("available") || s.includes("ready")) return "#10B981";
              if (s.includes("transit") || s.includes("moving") || s.includes("issued") || s.includes("assigned"))
                return "#3B82F6";
              if (s.includes("repair") || s.includes("maintenance")) return "#F59E0B";
              if (s.includes("missing") || s.includes("lost")) return "#EF4444";
              if (s.includes("scrap") || s.includes("dispose")) return "#64748B";
              return "#0284C7";
            };
            const statusColor = getStatusColor(item.status);
            const locationName =
              item.storeName ||
              (item.store && item.store.name) ||
              (item.project && item.project.name) ||
              (item.currentSite && item.currentSite.name) ||
              null;
            const categoryText = item.category || item.toolType || "General";

            return (
              <View
                style={{
                  marginBottom: 14,
                  borderRadius: 16,
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                  overflow: "hidden",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.3 : 0.06,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 2,
                    },
                    default: {
                      boxShadow: isDark
                        ? "0 4px 12px rgba(0,0,0,0.25)"
                        : "0 2px 8px rgba(0,0,0,0.05)",
                    },
                  }),
                }}
              >
                {/* 3.5px luminous status accent strip */}
                <View style={{ height: 3.5, backgroundColor: statusColor, width: "100%" }} />

                <TouchableOpacity
                  activeOpacity={0.8}
                  delayPressIn={0}
                  onPress={() => setPreviewTool(item)}
                  style={{ padding: 15 }}
                >
                  {/* Top Header: Monospace Code & Status */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDark ? "#262626" : "#F8FAFC",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                          color: isDark ? "#94A3B8" : "#475569",
                          letterSpacing: 0.5,
                        }}
                      >
                        #{code}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <StatusBadge status={item.status || "Available"} />
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: item.isPrinted
                            ? isDark
                              ? "rgba(16, 185, 129, 0.2)"
                              : "#ECFDF5"
                            : isDark
                            ? "#334155"
                            : "#F1F5F9",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: item.isPrinted
                              ? isDark
                                ? "#34D399"
                                : "#059669"
                              : isDark
                              ? "#94A3B8"
                              : "#64748B",
                          }}
                        >
                          {item.isPrinted ? "✓ Printed" : "Not Printed"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Serial */}
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.text,
                      lineHeight: 22,
                      marginBottom: 3,
                    }}
                    numberOfLines={1}
                  >
                    {toolName}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.textMuted,
                      marginBottom: 10,
                    }}
                    numberOfLines={1}
                  >
                    SN: {item.serialNumber !== undefined && item.serialNumber !== null ? String(item.serialNumber) : "N/A"}
                    {item.makeYear ? ` • Year: ${item.makeYear}` : ""}
                  </Text>

                  {/* Meta Pills / Info Box */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    {/* Category pill */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDark ? "#262626" : "#F1F5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        gap: 4,
                      }}
                    >
                      <Layers size={11} color={theme.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: "500", color: theme.textSecondary }}>
                        {categoryText}
                      </Text>
                    </View>

                    {/* Location pill if available */}
                    {locationName && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: isDark ? "#262626" : "#F1F5F9",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          gap: 4,
                          maxWidth: 160,
                        }}
                      >
                        <MapPin size={11} color={theme.textSecondary} />
                        <Text
                          style={{ fontSize: 11, fontWeight: "500", color: theme.textSecondary }}
                          numberOfLines={1}
                        >
                          {locationName}
                        </Text>
                      </View>
                    )}

                    {/* Capacity pill */}
                    {(item.capacity !== undefined && item.capacity !== null && String(item.capacity).trim() !== "" ||
                      item.safeWorkingLoad !== undefined && item.safeWorkingLoad !== null && String(item.safeWorkingLoad).trim() !== "") && (
                      <View
                        style={{
                          backgroundColor: isDark ? "#262626" : "#F1F5F9",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "500", color: theme.textSecondary }}>
                          Cap: {String(item.capacity || item.safeWorkingLoad)}
                        </Text>
                      </View>
                    )}

                    {/* Validation Pill */}
                    {validationVal !== "-" && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: isDark ? "#2C2010" : "#FEF3C7",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          gap: 4,
                        }}
                      >
                        <Clock size={11} color="#D97706" />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: isDark ? "#FCD34D" : "#92400E",
                          }}
                        >
                          Valid: {validationVal}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions Footer */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 11,
                      borderTopWidth: 1,
                      borderColor: isDark ? "#2E2E33" : "#F1F5F9",
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setPreviewTool(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: isDark ? "#262626" : "#F8FAFC",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                      }}
                    >
                      <Eye size={12} color={theme.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textSecondary }}>
                        Quick View
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {canManageTools && (
                        <>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push({
                                pathname: "/tools/form",
                                params: { id: item._id },
                              } as any);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isDark ? "#262626" : "#F1F5F9",
                              borderWidth: 1,
                              borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Edit2 size={13} color={theme.textSecondary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            disabled={!isToolDeletable(item.status)}
                            onPress={(e) => {
                              e.stopPropagation();
                              if (!isToolDeletable(item.status)) {
                                Alert.alert(
                                  "Action Blocked",
                                  `Cannot delete equipment with status "${item.status}". Only Available and Missing tools can be moved to Trash.`
                                );
                                return;
                              }
                              setDeletingTool(item);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isToolDeletable(item.status)
                                ? isDark
                                ? "#31181E"
                                : "#FEE2E2"
                                : isDark
                                ? "#262626"
                                : "#F1F5F9",
                              opacity: isToolDeletable(item.status) ? 1 : 0.35,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={13} color={isToolDeletable(item.status) ? "#EF4444" : "#94A3B8"} />
                          </TouchableOpacity>
                        </>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => router.push(`/tools/${item._id}` as any)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: `${theme.primary}15`,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          gap: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: theme.primary,
                          }}
                        >
                          Details
                        </Text>
                        <ChevronRight size={13} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center", gap: 8 }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: "600" }}>
                  Loading more tools...
                </Text>
              </View>
            ) : !hasMore && tools.length > 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                  All {(totalServerTools || tools.length).toLocaleString()} tools loaded
                </Text>
              </View>
            ) : tools.length > 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                  Showing {tools.length.toLocaleString()} of {(totalServerTools || tools.length).toLocaleString()} tools
                </Text>
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          ListEmptyComponent={
            isSearching ? (
              <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8, fontWeight: "600" }}>
                  Searching catalog...
                </Text>
              </View>
            ) : (
              <EmptyState
                title="No Tools Found"
                description={
                  searchQuery || activeFilterCount > 0
                    ? "No tools matched your current filter criteria."
                    : "No equipment registered in the catalog yet."
                }
                actionTitle={
                  searchQuery || activeFilterCount > 0
                    ? "Clear Filters"
                    : undefined
                }
                onAction={() => {
                  setSearchQuery("");
                  setFilters({
                    status: "All",
                    printStatus: "All",
                    category: "All",
                    validation: "All",
                    makeYear: "All",
                  });
                }}
              />
            )
          }
        />
      )}

      {/* Advanced Filter Modal */}
      <ToolAdvancedFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
      />

      {/* Quick Tool Preview Modal */}
      <ToolPreviewModal
        visible={!!previewTool}
        tool={previewTool}
        onClose={() => setPreviewTool(null)}
        onViewFullDetails={() => {
          if (previewTool) {
            router.push(`/tools/${previewTool._id}` as any);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        visible={!!deletingTool}
        title="Delete Tool"
        message={`Are you sure you want to delete "${deletingTool?.name || deletingTool?.description}"? This action moves the tool to Trash.`}
        confirmText="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTool(null)}
      />
    </ScreenWrapper>
  );
}
