import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Store,
  MapPin,
  User,
  Phone,
  Wrench,
  ChevronRight,
  Plus,
  Eye,
  Filter,
  Clock,
  Menu,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Recycle,
  Edit3,
  Truck,
  QrCode as QrIcon,
  X,
  ClipboardCheck,
  FileSpreadsheet,
  Tag,
  Check,
  RotateCcw,
  Sparkles,
  Printer,
} from "lucide-react-native";
import { storeService } from "@/features/stores/services/storeService";
import { toolService } from "@/features/tools/services/toolService";
import { StoreRecord } from "@/features/stores/types";
import { ToolRecord, resolveValidationValue } from "@/features/tools/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/context/ThemeContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SearchBar } from "@/components/common/SearchBar";
import { ToolAdvancedFilterModal, ToolFilterState } from "@/features/tools/components/ToolAdvancedFilterModal";
import { ToolPreviewModal } from "@/features/tools/components/ToolPreviewModal";
import { ToolTransferModal } from "@/features/tools/components/ToolTransferModal";
import { ScrapModal } from "@/features/tools/components/ScrapModal";
import { BulkEditModal } from "@/features/tools/components/BulkEditModal";
import { BulkQrModal } from "@/features/tools/components/BulkQrModal";
import { ToolInspectionModal } from "@/features/tools/components/ToolInspectionModal";
import { BulkImportModal } from "@/features/tools/components/BulkImportModal";
import { SelectedToolsModal, BatchActionType } from "@/features/tools/components/SelectedToolsModal";
import { selectionStore } from "@/features/tools/utils/selectionStore";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const QUICK_STATUS_OPTIONS = [
  { label: "All", value: "All", countKey: "all" },
  { label: "Available", value: "Available", countKey: "available", color: "#10B981" },
  { label: "Moving", value: "Moving", countKey: "moving", color: "#6366F1" },
  { label: "Repair", value: "Repair", countKey: "repair", color: "#F97316" },
  { label: "Printed", value: "Printed", countKey: "printed", color: "#059669" },
  { label: "unPrinted", value: "Unprinted", countKey: "unprinted", color: "#64748B" },
];

export default function StoreInventoryScreen() {
  const flatListRef = useRef<FlatList>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openSidebar } = useSidebarStore();
  const { theme, isDark } = useAppTheme();

  const [store, setStore] = useState<StoreRecord | null>(null);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalServerTools, setTotalServerTools] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{
    all?: number;
    available?: number;
    moving?: number;
    repair?: number;
    printed?: number;
    unprinted?: number;
  }>({});

  // Discrete loading states to avoid unmounting the UI while typing
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const latestRequestIdRef = useRef(0);
  const isFirstMountRef = useRef(true);

  // Search & Filters with debouncing
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<ToolFilterState>({
    status: "All",
    printStatus: "All",
    category: "All",
    validation: "All",
    makeYear: "All",
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status !== "All") count++;
    if (filters.printStatus && filters.printStatus !== "All") count++;
    if (filters.category && filters.category !== "All") count++;
    if (filters.validation && filters.validation !== "All") count++;
    if (filters.makeYear && filters.makeYear !== "All") count++;
    const deepKeys: (keyof ToolFilterState)[] = [
      'toolCode', 'toolId', 'capacity', 'safeWorkingLoad',
      'metalType', 'toolVariant', 'purchaserName', 'supplierCode',
      'jobCode', 'remarks'
    ];
    for (const k of deepKeys) {
      if (filters[k] && String(filters[k]).trim() !== "") {
        count++;
      }
    }
    return count;
  }, [filters]);

  // Preview State
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);

  // Batch Operations & Selection State
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [selectedToolsMap, setSelectedToolsMap] = useState<Record<string, ToolRecord>>({});
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedToolsModalOpen, setSelectedToolsModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkQrModalOpen, setBulkQrModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isInspectionRestricted = Boolean(!isAdmin && (user as any)?.hasInspectionAccess);
  const canInspect = isAdmin || (user as any)?.hasInspectionAccess;

  const isAllSelected = totalServerTools > 0 && selectedToolIds.size >= totalServerTools;

  const selectedTools = useMemo(() => {
    const list: ToolRecord[] = [];
    selectedToolIds.forEach((toolId) => {
      if (selectedToolsMap[toolId]) {
        list.push(selectedToolsMap[toolId]);
      } else {
        const found = tools.find((t) => t._id === toolId);
        if (found) {
          list.push(found);
        } else {
          list.push({ _id: toolId, status: "Available" } as ToolRecord);
        }
      }
    });
    return list;
  }, [selectedToolIds, selectedToolsMap, tools]);

  const toggleSelectTool = (toolId: string, toolObj?: ToolRecord) => {
    setSelectedToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(toolId);
      }
      return next;
    });

    if (toolObj) {
      setSelectedToolsMap((prev) => ({
        ...prev,
        [toolId]: toolObj,
      }));
    }
  };

  const handleSelectAll = async () => {
    if (!id) return;
    if (isAllSelected) {
      setSelectedToolIds(new Set());
      setSelectedToolsMap({});
      setIsSelectionMode(false);
      return;
    }

    try {
      setIsSelectingAll(true);
      const params = {
        ...getQueryParams(1),
        onlyIds: "true",
      };
      delete params.page;
      delete params.limit;

      const res = await toolService.getStoreToolIds(id, params);
      const toolIds = res.ids || [];
      const toolRecords = res.data || [];

      const map: Record<string, ToolRecord> = {};
      toolRecords.forEach((t) => {
        if (t._id) map[t._id] = t;
      });

      setSelectedToolIds(new Set(toolIds));
      setSelectedToolsMap(map);
      setIsSelectionMode(true);
    } catch (err: any) {
      console.error("Failed to select all filtered tools:", err);
      Alert.alert(
        "Selection Failed",
        err?.response?.data?.message || err?.message || "Could not select all matching equipment."
      );
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedToolIds(new Set());
    setSelectedToolsMap({});
    setIsSelectionMode(false);
    setSelectedToolsModalOpen(false);
  };

  const handleBatchAction = (action: BatchActionType) => {
    setSelectedToolsModalOpen(false);
    switch (action) {
      case "transfer":
        setTransferModalOpen(true);
        break;
      case "challan":
        selectionStore.setPendingChallan({
          storeId: id!,
          toolIds: Array.from(selectedToolIds),
          tools: selectedTools,
        });
        router.push({
          pathname: "/challans/new",
          params: {
            storeId: id,
            selectedCount: selectedToolIds.size,
            ...(selectedToolIds.size <= 50 ? { toolIds: Array.from(selectedToolIds).join(",") } : {}),
          },
        } as any);
        break;
      case "qr":
        setBulkQrModalOpen(true);
        break;
      case "inspect":
        setInspectionModalOpen(true);
        break;
      case "edit":
        setBulkEditModalOpen(true);
        break;
      case "scrap":
        setScrapModalOpen(true);
        break;
    }
  };

  const canManageTools = user?.role === "Admin" || user?.role === "Manager";

  // Initial load: fetches store details and initial tools once
  const loadInitialData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setInitialLoading(true);
      isLoadingMoreRef.current = false;
      currentPageRef.current = 1;
      const [storeData, toolsRes] = await Promise.all([
        storeService.getStoreById(id),
        toolService.getStoreToolsPaginated(id, {
          page: 1,
          limit: 50,
        }),
      ]);
      setStore(storeData);
      const initialTools = toolsRes?.data || [];
      setTools(initialTools);
      if (toolsRes?.statusCounts) {
        setStatusCounts(toolsRes.statusCounts);
      }
      const trueTotal =
        toolsRes?.total ??
        storeData?.totalToolsCount ??
        (storeData as any)?.toolsCount ??
        initialTools.length;
      setTotalServerTools(trueTotal);
      setPage(1);
      setHasMore(initialTools.length < trueTotal);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load store inventory."
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const hasMountedRef = useRef(false);

  useEffect(() => {
    loadInitialData();
    hasMountedRef.current = true;
  }, [loadInitialData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) return;
      loadInitialData();
      handleClearSelection();
    }, [loadInitialData])
  );

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
        'toolCode', 'toolId', 'capacity', 'safeWorkingLoad',
        'metalType', 'toolVariant', 'purchaserName', 'supplierCode',
        'jobCode', 'remarks'
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

  // Debounced search and filter query: updates tools without remounting the page
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (!id || initialLoading) return;

    // Reset selection when filter criteria or search query change so selection stays consistent
    setSelectedToolIds((prev) => {
      if (prev.size > 0) {
        setSelectedToolsMap({});
        setIsSelectionMode(false);
        return new Set();
      }
      return prev;
    });

    let isCancelled = false;
    const currentRequestId = ++latestRequestIdRef.current;

    async function executeSearch() {
      try {
        setIsSearching(true);
        isLoadingMoreRef.current = false;
        currentPageRef.current = 1;

        const toolsRes = await toolService.getStoreToolsPaginated(id, getQueryParams(1));

        // Discard stale responses from older requests
        if (isCancelled || currentRequestId !== latestRequestIdRef.current) {
          return;
        }

        const newTools = toolsRes?.data || [];
        setTools(newTools);
        if (toolsRes?.statusCounts) {
          setStatusCounts(toolsRes.statusCounts);
        }
        const total = toolsRes?.total ?? newTools.length;
        setTotalServerTools(total);
        setPage(1);
        setHasMore(newTools.length < total);
      } catch (err: any) {
        if (!isCancelled && currentRequestId === latestRequestIdRef.current) {
          console.error("Search failed:", err);
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
  }, [id, getQueryParams, initialLoading]);

  // Reload tools list when modal actions succeed
  const reloadTools = useCallback(async () => {
    if (!id) return;
    try {
      setIsSearching(true);
      isLoadingMoreRef.current = false;
      currentPageRef.current = 1;
      const toolsRes = await toolService.getStoreToolsPaginated(id, getQueryParams(1));
      const newTools = toolsRes?.data || [];
      setTools(newTools);
      if (toolsRes?.statusCounts) {
        setStatusCounts(toolsRes.statusCounts);
      }
      const total = toolsRes?.total ?? newTools.length;
      setTotalServerTools(total);
      setPage(1);
      setHasMore(newTools.length < total);
    } catch (err) {
      console.error("Failed to reload tools:", err);
    } finally {
      setIsSearching(false);
    }
  }, [id, getQueryParams]);

  // Load next 50 tools on scroll
  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || !hasMore || initialLoading || isSearching || refreshing) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const toolsRes = await toolService.getStoreToolsPaginated(id, getQueryParams(nextPage));
      const newItems = toolsRes?.data || [];
      if (newItems.length > 0) {
        currentPageRef.current = nextPage;
        setPage(nextPage);
        setTools((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const uniqueNew = newItems.filter((t) => !existingIds.has(t._id));
          const updated = [...prev, ...uniqueNew];
          const total = toolsRes?.total || totalServerTools;
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
      const [storeData, toolsRes] = await Promise.all([
        storeService.getStoreById(id),
        toolService.getStoreToolsPaginated(id, getQueryParams(1)),
      ]);
      setStore(storeData);
      const newTools = toolsRes?.data || [];
      setTools(newTools);
      const trueTotal =
        toolsRes?.total ??
        storeData?.totalToolsCount ??
        (storeData as any)?.toolsCount ??
        newTools.length;
      setTotalServerTools(trueTotal);
      setPage(1);
      setHasMore(newTools.length < trueTotal);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };


  // Only show full-screen loader on the very first load when store is not yet present
  if (initialLoading && !store) {
    return <Loader fullScreen message="Loading store inventory..." />;
  }

  if (error && !store) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else openSidebar();
            }}
            className="p-1 mr-2"
          >
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900 dark:text-white">Store Inventory</Text>
        </View>
        <ErrorState
          title="Store Not Found"
          message={error || "Could not retrieve store inventory."}
          onRetry={() => {
            setError(null);
            loadInitialData();
          }}
        />
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: isDark ? "#020617" : "#F8FAFC" }}
    >
      <StatusBar style="auto" />

      {/* Primary Header */}
      {isSelectionMode ? (
        /* Elevated Selection Bar */
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#4F46E5",
            borderBottomWidth: 1,
            borderBottomColor: "#4338CA",
          }}
        >
          {/* Left Side: Count Badge & Clear */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, marginRight: 6 }}>
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 9999,
              }}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                {selectedToolIds.size.toLocaleString()} / {totalServerTools.toLocaleString()} Selected
              </Text>
            </View>
            {selectedToolIds.size > 0 && (
              <TouchableOpacity
                onPress={handleClearSelection}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={{ paddingVertical: 4, paddingHorizontal: 4 }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#E0E7FF",
                    textDecorationLine: "underline",
                  }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right Side: Options, Select/Deselect All, Done */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {selectedToolIds.size > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedToolsModalOpen(true)}
                style={{
                  backgroundColor: "#FBBF24",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Sparkles size={13} color="#78350F" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#451A03" }}>
                  Options
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSelectingAll}
              onPress={handleSelectAll}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderColor: "rgba(255, 255, 255, 0.25)",
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isSelectingAll ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                  {isAllSelected ? "Deselect All" : "Select All"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsSelectionMode(false)}
              style={{
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#4338CA" }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Normal Header */
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else openSidebar();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <ArrowLeft size={18} color="#475569" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                }}
                numberOfLines={1}
              >
                {store?.name || "Store Details"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? "#94A3B8" : "#64748B",
                }}
              >
                {store?.location || "Store Facility"} • {(totalServerTools || store?.totalToolsCount || (store as any)?.toolsCount || tools.length).toLocaleString()} Tools
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {canManageTools && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setIsSelectionMode(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <CheckSquare size={14} color="#475569" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: isDark ? "#E2E8F0" : "#334155",
                  }}
                >
                  Select
                </Text>
              </TouchableOpacity>
            )}

            {canManageTools && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setBulkImportModalOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <FileSpreadsheet size={14} color="#4F46E5" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: isDark ? "#F1F5F9" : "#1E293B",
                  }}
                >
                  Import
                </Text>
              </TouchableOpacity>
            )}

            {canManageTools && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/tools/form",
                    params: { storeId: id },
                  } as any)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#4F46E5",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                  Add Tool
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Search & Filter Header */}
      <View
        style={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View className="flex-1">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tools in this store..."
              loading={isSearching}
              onClear={() => setSearchQuery("")}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setFilterModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              height: 42,
              borderRadius: 12,
              backgroundColor: activeFilterCount > 0 ? "#4F46E5" : isDark ? "#1E293B" : "#F1F5F9",
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? "#4F46E5" : isDark ? "#334155" : "#CBD5E1",
            }}
          >
            <Filter
              size={16}
              color={activeFilterCount > 0 ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B"}
            />
            {activeFilterCount > 0 && (
              <View className="ml-1.5 bg-white rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-[10px] font-bold text-indigo-600">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Filter Status Ribbon */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, gap: 6 }}
        >
          {QUICK_STATUS_OPTIONS.map((opt) => {
            const isActive =
              opt.value === "Printed"
                ? filters.printStatus === "Printed" && (filters.status === "All" || !filters.status)
                : opt.value === "Unprinted"
                ? (filters.printStatus === "Unprinted" || filters.printStatus === "Not Printed") && (filters.status === "All" || !filters.status)
                : opt.value === "All"
                ? (filters.status === "All" || !filters.status) && (filters.printStatus === "All" || !filters.printStatus)
                : filters.status === opt.value && (filters.printStatus === "All" || !filters.printStatus);

            const tabStoreCount = statusCounts[opt.countKey as keyof typeof statusCounts];
            const countToDisplay = isActive
              ? totalServerTools
              : tabStoreCount !== undefined
              ? tabStoreCount
              : opt.value === "All"
              ? (store?.totalToolsCount || totalServerTools)
              : undefined;

            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => {
                  if (opt.value === "Printed") {
                    setFilters((prev) => ({
                      ...prev,
                      status: "All",
                      printStatus: prev.printStatus === "Printed" ? "All" : "Printed",
                    }));
                  } else if (opt.value === "Unprinted") {
                    setFilters((prev) => ({
                      ...prev,
                      status: "All",
                      printStatus: prev.printStatus === "Unprinted" ? "All" : "Unprinted",
                    }));
                  } else if (opt.value === "All") {
                    setFilters((prev) => ({
                      ...prev,
                      status: "All",
                      printStatus: "All",
                    }));
                  } else {
                    setFilters((prev) => ({
                      ...prev,
                      status: prev.status === opt.value ? "All" : opt.value,
                      printStatus: "All",
                    }));
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: isActive
                    ? "#4F46E5"
                    : isDark
                    ? "#334155"
                    : "#E2E8F0",
                  backgroundColor: isActive
                    ? "#4F46E5"
                    : isDark
                    ? "#1E293B"
                    : "#F1F5F9",
                }}
              >
                {opt.color && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isActive ? "#FFFFFF" : opt.color,
                    }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isActive
                      ? "#FFFFFF"
                      : isDark
                      ? "#CBD5E1"
                      : "#334155",
                  }}
                >
                  {opt.label}
                  {countToDisplay !== undefined ? ` (${countToDisplay.toLocaleString()})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Custom Filter Badges */}
        {(filters.category !== "All" ||
          filters.validation !== "All" ||
          filters.makeYear !== "All" ||
          (filters.printStatus && filters.printStatus !== "All" && filters.status !== "All") ||
          (filters.toolCode && filters.toolCode.trim() !== "") ||
          (filters.purchaserName && filters.purchaserName.trim() !== "")) && (
          <View className="flex-row flex-wrap items-center gap-1.5 pt-2">
            {filters.printStatus && filters.printStatus !== "All" && filters.status !== "All" && (
              <View className="flex-row items-center bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-lg gap-1">
                <Printer size={10} color="#2563EB" />
                <Text className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                  QR: {filters.printStatus}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((prev) => ({ ...prev, printStatus: "All" }))}
                  className="ml-0.5"
                >
                  <X size={12} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}

            {filters.category !== "All" && (
              <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg gap-1">
                <Tag size={10} color="#4F46E5" />
                <Text className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
                  {filters.category}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((prev) => ({ ...prev, category: "All" }))}
                  className="ml-0.5"
                >
                  <X size={12} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            )}

            {filters.validation !== "All" && (
              <View className="flex-row items-center bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg gap-1">
                <Clock size={10} color="#D97706" />
                <Text className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                  {filters.validation}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((prev) => ({ ...prev, validation: "All" }))}
                  className="ml-0.5"
                >
                  <X size={12} color="#D97706" />
                </TouchableOpacity>
              </View>
            )}

            {filters.makeYear !== "All" && (
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-lg gap-1">
                <Text className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Year: {filters.makeYear}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((prev) => ({ ...prev, makeYear: "All" }))}
                  className="ml-0.5"
                >
                  <X size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            {filters.toolCode && filters.toolCode.trim() !== "" && (
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-lg gap-1">
                <Text className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Code: {filters.toolCode}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((prev) => ({ ...prev, toolCode: "" }))}
                  className="ml-0.5"
                >
                  <X size={12} color="#64748B" />
                </TouchableOpacity>
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
                  toolCode: "",
                  toolId: "",
                  capacity: "",
                  safeWorkingLoad: "",
                  metalType: "",
                  toolVariant: "",
                  purchaserName: "",
                  supplierCode: "",
                  jobCode: "",
                  remarks: "",
                })
              }
              className="flex-row items-center gap-0.5 px-2 py-0.5"
            >
              <RotateCcw size={10} color="#64748B" />
              <Text className="text-[11px] font-semibold text-slate-500">Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tools List */}
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
        contentContainerStyle={{
          padding: 16,
          paddingBottom: selectedToolIds.size > 0 ? 100 : 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
            tintColor="#4F46E5"
          />
        }
        renderItem={({ item }) => {
          const validationVal = resolveValidationValue(item);
          const isSelected = selectedToolIds.has(item._id);

          return (
            <Card
              className={`mb-3 ${
                isSelected
                  ? "border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
                  : "border-slate-100 dark:border-slate-800"
              }`}
            >
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  if (isSelectionMode) {
                    toggleSelectTool(item._id, item);
                  } else {
                    setPreviewTool(item);
                  }
                }}
                onLongPress={() => {
                  if (!isSelectionMode) {
                    setIsSelectionMode(true);
                  }
                  toggleSelectTool(item._id, item);
                }}
              >
                {/* Card Header Row */}
                <View className="flex-row items-start justify-between mb-2.5">
                  <View className="flex-row items-center flex-1 mr-2">
                    {isSelectionMode && (
                      <TouchableOpacity
                        onPress={() => toggleSelectTool(item._id, item)}
                        style={{ marginRight: 12 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isSelected ? (
                          <CheckSquare size={22} color="#4F46E5" />
                        ) : (
                          <Square size={22} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    )}

                    <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 items-center justify-center mr-3 border border-indigo-100 dark:border-indigo-900">
                      <Wrench size={18} color="#4F46E5" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-[15px] font-bold text-slate-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {item.name || item.description || item.toolType || "Industrial Tool"}
                      </Text>
                      <Text className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                        ID: {item.toolId || item.toolCode || item._id.substring(item._id.length - 6).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end gap-1">
                    <StatusBadge status={item.status || "Available"} size="sm" />
                    <View
                      className={`px-1.5 py-0.5 rounded ${
                        item.isPrinted
                          ? "bg-emerald-100 dark:bg-emerald-950"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          item.isPrinted
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {item.isPrinted ? "✓ Printed" : "Not Printed"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Specs Row */}
                <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 my-1 flex-row flex-wrap items-center justify-between border border-slate-100 dark:border-slate-800 gap-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <Tag size={12} color="#64748B" />
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      Category:{" "}
                      <Text className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.category || item.toolType || "General"}
                      </Text>
                    </Text>
                  </View>

                  {validationVal !== "-" && (
                    <View className="flex-row items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <Clock size={10} color="#D97706" />
                      <Text className="text-[10px] font-bold text-amber-800 dark:text-amber-200">
                        Validation: {validationVal}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Card Action Row */}
                <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <Eye size={13} color="#64748B" />
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      Tap for Quick View
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/tools/${item._id}` as any);
                    }}
                    className="flex-row items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50"
                  >
                    <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Full Details
                    </Text>
                    <ChevronRight size={13} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Card>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6, fontWeight: "600" }}>
                Loading more tools...
              </Text>
            </View>
          ) : !hasMore && tools.length > 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                All {(totalServerTools || tools.length).toLocaleString()} tools loaded
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
                Searching tools...
              </Text>
            </View>
          ) : (
            <EmptyState
              title="No Tools Found"
              description={
                searchQuery || activeFilterCount > 0
                  ? "No tools matched your current filters. Try resetting search or status."
                  : "No equipment or tools registered in this facility yet."
              }
              actionTitle={
                searchQuery || activeFilterCount > 0 ? "Reset Filters" : undefined
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

      {/* Floating Selected Tools Trigger Bar */}
      {selectedToolIds.size > 0 && (
        <SafeAreaView
          edges={["bottom"]}
          className="absolute bottom-4 left-4 right-4 z-40"
        >
          <View
            style={{
              backgroundColor: "#0F172A",
              borderColor: "#334155",
              borderWidth: 1,
            }}
            className="rounded-2xl p-2.5 px-3.5 flex-row items-center justify-between"
          >
            {/* Left: Tap to open modal */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedToolsModalOpen(true)}
              className="flex-row items-center gap-2.5 flex-1 mr-2"
            >
              <View className="bg-indigo-600 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-bold text-white">
                  {selectedToolIds.size.toLocaleString()} Selected
                </Text>
              </View>
              <Text className="text-xs text-slate-300 font-medium" numberOfLines={1}>
                Tap to view options & actions
              </Text>
            </TouchableOpacity>

            {/* Right: Actions Button & Clear */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedToolsModalOpen(true)}
                className="bg-indigo-600 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5"
              >
                <Sparkles size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Options</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClearSelection}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700"
              >
                <X size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Selected Tools Options Modal */}
      <SelectedToolsModal
        visible={selectedToolsModalOpen}
        onClose={() => setSelectedToolsModalOpen(false)}
        selectedTools={selectedTools}
        onDeselectTool={toggleSelectTool}
        onClearSelection={handleClearSelection}
        onSelectAction={handleBatchAction}
        canInspect={canInspect}
        isInspectionRestricted={isInspectionRestricted}
        onToolsUpdated={reloadTools}
      />

      {/* Advanced Filter Modal */}
      <ToolAdvancedFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        storeId={id}
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

      {/* Batch Modals */}
      <ToolTransferModal
        visible={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        sourceStoreId={id!}
        sourceStoreName={store?.name}
        toolIds={Array.from(selectedToolIds)}
        selectedTools={selectedTools}
        onSuccess={() => {
          setSelectedToolIds(new Set());
          setIsSelectionMode(false);
          reloadTools();
        }}
      />

      <ScrapModal
        visible={scrapModalOpen}
        onClose={() => setScrapModalOpen(false)}
        toolIds={Array.from(selectedToolIds)}
        selectedTools={selectedTools}
        onSuccess={() => {
          setSelectedToolIds(new Set());
          setIsSelectionMode(false);
          reloadTools();
        }}
      />

      <BulkEditModal
        visible={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        storeId={id}
        toolIds={Array.from(selectedToolIds)}
        onSuccess={() => {
          setSelectedToolIds(new Set());
          setIsSelectionMode(false);
          reloadTools();
        }}
      />

      <BulkQrModal
        visible={bulkQrModalOpen}
        onClose={() => setBulkQrModalOpen(false)}
        tools={selectedTools}
        onStatusChange={() => {
          reloadTools();
        }}
      />

      <ToolInspectionModal
        visible={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        selectedTools={selectedTools}
        onSuccess={() => {
          setSelectedToolIds(new Set());
          setIsSelectionMode(false);
          reloadTools();
        }}
      />

      <BulkImportModal
        visible={bulkImportModalOpen}
        onClose={() => setBulkImportModalOpen(false)}
        storeId={id!}
        storeName={store?.name}
        onSuccess={() => {
          reloadTools();
        }}
      />
    </SafeAreaView>
  );
}
