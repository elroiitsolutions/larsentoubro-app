import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Store, MapPin, User, Phone, Wrench, ChevronRight, Plus, Eye, Filter, Clock , Menu } from "lucide-react-native";
import { storeService } from "@/features/stores/services/storeService";
import { toolService } from "@/features/tools/services/toolService";
import { StoreRecord } from "@/features/stores/types";
import { ToolRecord, resolveValidationValue } from "@/features/tools/types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { Card } from "@/components/ui/Card";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "@/context/ThemeContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SearchBar } from "@/components/common/SearchBar";
import { CenteredPagination } from "@/components/common/CenteredPagination";
import { ToolAdvancedFilterModal, ToolFilterState } from "@/features/tools/components/ToolAdvancedFilterModal";
import { ToolPreviewModal } from "@/features/tools/components/ToolPreviewModal";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const ITEMS_PER_PAGE = 50;

export default function StoreInventoryScreen() {
  const flatListRef = React.useRef<FlatList>(null);
  const [pageSize, setPageSize] = useState(50);
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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoadingMoreRef = React.useRef(false);
  const currentPageRef = React.useRef(1);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<ToolFilterState>({
    status: "All",
    category: "All",
    validation: "All",
    makeYear: "All",
  });

  // Preview State
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);

  const canManageTools = user?.role === "Admin" || user?.role === "Manager";

  // Initial load or when search / filter changes
  const fetchInitialData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      isLoadingMoreRef.current = false;
      currentPageRef.current = 1;
      const [storeData, toolsRes] = await Promise.all([
        storeService.getStoreById(id),
        toolService.getStoreToolsPaginated(id, {
          page: 1,
          limit: 50,
          search: searchQuery || undefined,
          status: filters.status !== "All" ? filters.status : undefined,
          category: filters.category !== "All" ? filters.category : undefined,
          validation: filters.validation !== "All" ? filters.validation : undefined,
          makeYear: filters.makeYear !== "All" ? filters.makeYear : undefined,
        }),
      ]);
      setStore(storeData);
      const initialTools = toolsRes?.data || [];
      setTools(initialTools);
      const trueTotal = toolsRes?.total ?? storeData?.totalToolsCount ?? (storeData as any)?.toolsCount ?? initialTools.length;
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, searchQuery, filters]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load next 50 tools on scroll (elastic infinite continuous feed with race-condition lock & deduplication)
  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || !hasMore || loading || refreshing) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const toolsRes = await toolService.getStoreToolsPaginated(id, {
        page: nextPage,
        limit: 50,
        search: searchQuery || undefined,
        status: filters.status !== "All" ? filters.status : undefined,
        category: filters.category !== "All" ? filters.category : undefined,
        validation: filters.validation !== "All" ? filters.validation : undefined,
        makeYear: filters.makeYear !== "All" ? filters.makeYear : undefined,
      });
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

  const onRefresh = () => {
    setRefreshing(true);
    isLoadingMoreRef.current = false;
    currentPageRef.current = 1;
    fetchInitialData();
  };


  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "All") count++;
    if (filters.category !== "All") count++;
    if (filters.validation !== "All") count++;
    return count;
  }, [filters]);

  if (loading) {
    return <Loader fullScreen message="Loading store inventory..." />;
  }

  if (error || !store) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 flex-row items-center">
          <TouchableOpacity onPress={openSidebar} className="p-1 mr-2">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900">Store Inventory</Text>
        </View>
        <ErrorState
          title="Store Not Found"
          message={error || "Could not retrieve store inventory."}
          onRetry={() => {
            setLoading(true);
            fetchInitialData();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      {/* Screen Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={openSidebar}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3"
          >
            <Menu size={18} color="#475569" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
              {store.name}
            </Text>
            <Text className="text-[11px] text-slate-500">
              {store.location || "Store Facility"} • {(totalServerTools || store.totalToolsCount || (store as any).toolsCount || tools.length).toLocaleString()} Tools
            </Text>
          </View>
        </View>

        {canManageTools && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/tools/form",
                params: { storeId: id },
              } as any)
            }
            className="flex-row items-center gap-1.5 bg-indigo-600 px-3 py-2 rounded-xl"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Add Tool</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Filter Header */}
      <View className="p-4 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="flex-1">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tools in this store..."
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
              backgroundColor: activeFilterCount > 0 ? "#4F46E5" : "#F1F5F9",
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? "#4F46E5" : "#CBD5E1",
            }}
          >
            <Filter
              size={16}
              color={activeFilterCount > 0 ? "#FFFFFF" : "#64748B"}
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

        {/* Filter preview badge */}
        {filters.validation !== "All" && (
          <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg self-start mb-1 gap-1">
            <Clock size={11} color="#D97706" />
            <Text className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Validation: {filters.validation}
            </Text>
            <TouchableOpacity
              onPress={() => setFilters((prev) => ({ ...prev, validation: "All" }))}
              className="ml-1"
            >
              <Text className="text-xs font-bold text-amber-700">×</Text>
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
        keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : String(index)}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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

          return (
            <Card className="p-4 mb-3">
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setPreviewTool(item)}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 items-center justify-center mr-3">
                      <Wrench size={18} color="#4F46E5" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold text-slate-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {item.name || item.description || item.toolType || "Industrial Tool"}
                      </Text>
                      <View className="flex-row items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <Text className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                          ID: {item.toolId || item.toolCode || item._id.substring(item._id.length - 6).toUpperCase()}
                        </Text>
                        {Boolean(item.toolCode && item.toolId && item.toolCode !== item.toolId) && (
                          <Text className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                            • Code: {item.toolCode}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <StatusBadge status={item.status || "Available"} size="sm" />
                </View>

                {/* Specs row */}
                <View className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 my-1 flex-row flex-wrap items-center justify-between border border-slate-100 dark:border-slate-800 gap-1">
                  <Text className="text-xs text-slate-500">
                    Category: <Text className="font-semibold text-slate-700 dark:text-slate-300">{item.category || item.toolType || "General"}</Text>
                  </Text>
                  {validationVal !== "-" && (
                    <View className="flex-row items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                      <Clock size={10} color="#D97706" />
                      <Text className="text-[10px] font-bold text-amber-800 dark:text-amber-200">
                        Validation: {validationVal}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 mt-1">
                  <View className="flex-row items-center gap-1 text-slate-500">
                    <Eye size={12} color="#64748B" />
                    <Text className="text-xs text-slate-500">Tap for Quick View</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
                      Full Details
                    </Text>
                    <ChevronRight size={14} color="#4F46E5" />
                  </View>
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
                Loading next 50 tools...
              </Text>
            </View>
          ) : !hasMore && tools.length > 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                ✓ All ${(totalServerTools || tools.length).toLocaleString()} tools loaded
              </Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="No Tools in Store"
            description={
              searchQuery || activeFilterCount > 0
                ? "No tools matched your current search filters."
                : "No equipment or tools registered in this facility yet."
            }
            actionTitle={
              searchQuery || activeFilterCount > 0 ? "Clear Search" : undefined
            }
            onAction={() => {
              setSearchQuery("");
              setFilters({
                status: "All",
                category: "All",
                validation: "All",
                makeYear: "All",
              });
            }}
          />
        }
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
    </SafeAreaView>
  );
}