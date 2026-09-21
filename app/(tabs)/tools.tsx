import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  Wrench,
  Plus,
  Eye,
  ChevronRight,
  Filter,
  Clock,
  Layers,
  Calendar,
  Shield,
  Edit2,
  Trash2,
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
import { CenteredPagination } from "@/components/common/CenteredPagination";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const ITEMS_PER_PAGE = 50;

export default function ToolsCatalogScreen() {
  const flatListRef = React.useRef<FlatList>(null);
  const [pageSize, setPageSize] = useState(50);
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<ToolFilterState>({
    status: "All",
    category: "All",
    validation: "All",
    makeYear: "All",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Preview & Delete State
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);
  const [deletingTool, setDeletingTool] = useState<ToolRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManageTools = user?.role === "Admin" || user?.role === "Manager";

  const fetchTools = useCallback(async () => {
    try {
      setError(null);
      const data = await toolService.getAllTools();
      setTools(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load tools catalog."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  useFocusEffect(
    useCallback(() => {
      fetchTools();
    }, [fetchTools])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTools();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTool) return;
    try {
      setDeleteLoading(true);
      await toolService.deleteTool(deletingTool._id);
      setTools((prev) => prev.filter((t) => t._id !== deletingTool._id));
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

  // Filter tools based on search & advanced filter state (including Validation)
  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      // Search
      const name = t.name || t.description || "";
      const code = t.toolCode || t.toolId || "";
      const serial = t.serialNumber || "";
      const cat = t.category || t.toolType || "";
      const matchesSearch =
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchesStatus =
        filters.status === "All" ||
        (t.status && t.status.toLowerCase() === filters.status.toLowerCase());

      // Category
      const matchesCategory =
        filters.category === "All" ||
        (cat && cat.toLowerCase() === filters.category.toLowerCase());

      // Validation Filter
      let matchesValidation = true;
      if (filters.validation !== "All") {
        const val = resolveValidationValue(t).toLowerCase();
        const targetVal = filters.validation.toLowerCase();
        // Extract numeric years if possible
        const targetNum = targetVal.match(/(\d+)/)?.[1];
        const valNum = val.match(/(\d+)/)?.[1];
        if (targetNum && valNum) {
          matchesValidation = targetNum === valNum;
        } else {
          matchesValidation = val.includes(targetVal);
        }
      }

      // Make Year
      const matchesYear =
        filters.makeYear === "All" ||
        (t.makeYear && String(t.makeYear) === filters.makeYear);

      return matchesSearch && matchesStatus && matchesCategory && matchesValidation && matchesYear;
    });
  }, [tools, searchQuery, filters]);

  // Pagination calculation
  const totalItems = filteredTools.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset current page if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const paginatedTools = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTools.slice(startIndex, startIndex + pageSize);
  }, [filteredTools, currentPage]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "All") count++;
    if (filters.category !== "All") count++;
    if (filters.validation !== "All") count++;
    if (filters.makeYear !== "All") count++;
    return count;
  }, [filters]);

  return (
    <ScreenWrapper
      title="Equipment Catalog"
      rightAction={
        canManageTools ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/tools/form" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 12,
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
      {/* Search & Filter Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
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
            backgroundColor: activeFilterCount > 0 ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
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

      {/* Active Filter Chips Preview */}
      {activeFilterCount > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: isDark ? "#0D131F" : "#F8FAFC",
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
                backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
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
                backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
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

          <TouchableOpacity
            onPress={() =>
              setFilters({
                status: "All",
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
      {loading ? (
        <Loader fullScreen message="Loading equipment catalog..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Tools"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchTools();
          }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={paginatedTools}
          bounces={true}
          overScrollMode="always"
          initialNumToRender={20}
          maxToRenderPerBatch={25}
          windowSize={11}
          removeClippedSubviews={true}
          decelerationRate="normal"
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
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
            const code = item.toolCode || item.toolId || item._id.substring(item._id.length - 6).toUpperCase();
            const validationVal = resolveValidationValue(item);

            return (
              <Card style={{ marginBottom: 12, overflow: "hidden" }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  delayPressIn={0}
                  onPress={() => setPreviewTool(item)}
                  style={{ padding: 14 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "bold", color: theme.text }}
                        numberOfLines={1}
                      >
                        {toolName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: theme.textMuted,
                          marginTop: 2,
                        }}
                      >
                        ID: {code} • SN: {item.serialNumber || "N/A"}
                      </Text>
                    </View>
                    <StatusBadge status={item.status || "Available"} />
                  </View>

                  {/* Attributes & Validation pill */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginVertical: 6,
                    }}
                  >
                    {/* Category pill */}
                    <View
                      style={{
                        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {item.category || item.toolType || "General"}
                      </Text>
                    </View>

                    {/* Validation Pill */}
                    {validationVal !== "-" && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: isDark ? "#2C2010" : "#FEF3C7",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          gap: 3,
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
                          Validation: {validationVal}
                        </Text>
                      </View>
                    )}

                    {item.capacity && (
                      <View
                        style={{
                          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                          Cap: {item.capacity}
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
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Eye size={13} color={theme.textMuted} />
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        Quick Preview
                      </Text>
                    </View>

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
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Edit2 size={13} color={theme.textSecondary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={(e) => {
                              e.stopPropagation();
                              setDeletingTool(item);
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              backgroundColor: theme.dangerLight,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={13} color={theme.danger} />
                          </TouchableOpacity>
                        </>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => router.push(`/tools/${item._id}` as any)}
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: theme.primary,
                            marginRight: 2,
                          }}
                        >
                          Details
                        </Text>
                        <ChevronRight size={14} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          }}
          ListFooterComponent={
            <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                Showing ${paginatedTools.length} of ${filteredTools.length} tools
              </Text>
            </View>
          }
          ListEmptyComponent={
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
                  category: "All",
                  validation: "All",
                  makeYear: "All",
                });
              }}
            />
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
