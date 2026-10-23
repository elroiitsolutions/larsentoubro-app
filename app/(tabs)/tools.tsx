import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  MapPin,
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
    printStatus: "All",
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

  // Filter tools based on search & advanced filter state (including Validation, Print Status, and Specifications)
  const filteredTools = useMemo(() => {
    const rawSearch = searchQuery.trim().toLowerCase();
    const searchTokens = rawSearch.includes(',') || rawSearch.includes(';')
      ? rawSearch.split(/[,;\n\t]+/).map((t) => t.trim()).filter(Boolean)
      : rawSearch ? [rawSearch] : [];

    return tools.filter((t) => {
      // Search: supports multi-token or single search
      const name = (t.name || t.description || "").toLowerCase();
      const code = (t.toolId || t.toolCode || "").toLowerCase();
      const serial = (t.serialNumber || "").toLowerCase();
      const cat = (t.category || t.toolType || "").toLowerCase();
      const job = (t.jobCode || "").toLowerCase();
      const purchaser = (t.purchaserName || "").toLowerCase();
      const supplier = (t.supplierCode || "").toLowerCase();

      let matchesSearch = true;
      if (searchTokens.length > 0) {
        matchesSearch = searchTokens.some((tok) =>
          name.includes(tok) ||
          code.includes(tok) ||
          serial.includes(tok) ||
          cat.includes(tok) ||
          job.includes(tok) ||
          purchaser.includes(tok) ||
          supplier.includes(tok)
        );
      }

      // Status
      const matchesStatus =
        filters.status === "All" ||
        (t.status && t.status.toLowerCase() === filters.status.toLowerCase());

      // Print Status
      const matchesPrint =
        !filters.printStatus ||
        filters.printStatus === "All" ||
        (filters.printStatus === "Printed" && t.isPrinted === true) ||
        (filters.printStatus === "Not Printed" && !t.isPrinted);

      // Category
      const matchesCategory =
        filters.category === "All" ||
        (cat && cat.toLowerCase() === filters.category.toLowerCase());

      // Validation Filter
      let matchesValidation = true;
      if (filters.validation !== "All") {
        const val = resolveValidationValue(t).toLowerCase();
        const targetVal = filters.validation.toLowerCase();
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

      // Deep Specifications
      const matchesSpecs = (
        (!filters.toolCode || (t.toolCode && t.toolCode.toLowerCase().includes(filters.toolCode.toLowerCase()))) &&
        (!filters.toolId || (t.toolId && t.toolId.toLowerCase().includes(filters.toolId.toLowerCase()))) &&
        (!filters.capacity || (t.capacity && t.capacity.toLowerCase().includes(filters.capacity.toLowerCase()))) &&
        (!filters.safeWorkingLoad || (t.safeWorkingLoad && t.safeWorkingLoad.toLowerCase().includes(filters.safeWorkingLoad.toLowerCase()))) &&
        (!filters.metalType || (t.metalType && t.metalType.toLowerCase().includes(filters.metalType.toLowerCase()))) &&
        (!filters.toolVariant || (t.toolVariant && t.toolVariant.toLowerCase().includes(filters.toolVariant.toLowerCase()))) &&
        (!filters.purchaserName || (t.purchaserName && t.purchaserName.toLowerCase().includes(filters.purchaserName.toLowerCase()))) &&
        (!filters.supplierCode || (t.supplierCode && t.supplierCode.toLowerCase().includes(filters.supplierCode.toLowerCase()))) &&
        (!filters.jobCode || (t.jobCode && t.jobCode.toLowerCase().includes(filters.jobCode.toLowerCase()))) &&
        (!filters.remarks || (t.remarks && t.remarks.toLowerCase().includes(filters.remarks.toLowerCase())))
      );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPrint &&
        matchesCategory &&
        matchesValidation &&
        matchesYear &&
        matchesSpecs
      );
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

  const stats = useMemo(() => {
    const total = tools.length;
    const available = tools.filter((t) => t.status?.toLowerCase() === "available").length;
    const moving = tools.filter((t) => t.status?.toLowerCase() === "moving" || t.status?.toLowerCase() === "in transit").length;
    const repair = tools.filter((t) => t.status?.toLowerCase() === "repair" || t.status?.toLowerCase() === "under repair" || t.status?.toLowerCase() === "damaged/repair").length;
    return { total, available, moving, repair };
  }, [tools]);

  const quickStatusOptions = ["All", "Available", "In Transit", "Under Repair", "Missing", "Scrap"];

  const getStatusCount = (status: string) => {
    if (status === "All") return tools.length;
    if (status === "In Transit") return tools.filter((t) => t.status?.toLowerCase() === "moving" || t.status?.toLowerCase() === "in transit").length;
    if (status === "Under Repair") return tools.filter((t) => t.status?.toLowerCase() === "repair" || t.status?.toLowerCase() === "under repair" || t.status?.toLowerCase() === "damaged/repair").length;
    return tools.filter((t) => t.status?.toLowerCase() === status.toLowerCase()).length;
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "All") count++;
    if (filters.printStatus && filters.printStatus !== "All") count++;
    if (filters.category !== "All") count++;
    if (filters.validation !== "All") count++;
    if (filters.makeYear !== "All") count++;
    const deepKeys: (keyof ToolFilterState)[] = [
      'toolCode', 'toolId', 'capacity', 'safeWorkingLoad',
      'metalType', 'toolVariant', 'purchaserName', 'supplierCode',
      'jobCode', 'remarks'
    ];
    for (const k of deepKeys) {
      if (filters[k] && String(filters[k]).trim() !== "") count++;
    }
    return count;
  }, [filters]);

  return (
    <ScreenWrapper
      title="Equipment Catalog"
      subtitle={`${tools.length} Industrial Assets Tracked`}
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
            backgroundColor: filters.status === "All" ? (isDark ? "#312E81" : "#EEF2FF") : (isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "All" ? theme.primary : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: filters.status === "All" ? theme.primary : theme.text }}>
            {stats.total}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Total
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "Available" }))}
          style={{
            flex: 1,
            backgroundColor: filters.status === "Available" ? (isDark ? "rgba(5, 150, 105, 0.25)" : "#ECFDF5") : (isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "Available" ? "#059669" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>
            {stats.available}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Ready
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "In Transit" }))}
          style={{
            flex: 1,
            backgroundColor: filters.status === "In Transit" ? (isDark ? "rgba(2, 132, 199, 0.25)" : "#F0F9FF") : (isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "In Transit" ? "#0284C7" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#0284C7" }}>
            {stats.moving}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Transit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilters((prev) => ({ ...prev, status: "Under Repair" }))}
          style={{
            flex: 1,
            backgroundColor: filters.status === "Under Repair" ? (isDark ? "rgba(217, 119, 6, 0.25)" : "#FFFBEB") : (isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: filters.status === "Under Repair" ? "#D97706" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#D97706" }}>
            {stats.repair}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Repair
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
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
                  backgroundColor: isSelected ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
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
                    backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : isDark ? "#334155" : "#E2E8F0",
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

          {filters.printStatus && filters.printStatus !== "All" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: filters.printStatus === "Printed"
                  ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5")
                  : (isDark ? "#334155" : "#F1F5F9"),
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
                  color: filters.printStatus === "Printed"
                    ? (isDark ? "#34D399" : "#059669")
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
                backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
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
          keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : String(index)}
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
            const code = item.toolId || item.toolCode || item._id.substring(item._id.length - 6).toUpperCase();
            const validationVal = resolveValidationValue(item);

            const getStatusColor = (status?: string) => {
              const s = (status || "").toLowerCase();
              if (s.includes("available") || s.includes("ready")) return "#10B981";
              if (s.includes("transit") || s.includes("moving") || s.includes("issued") || s.includes("assigned")) return "#3B82F6";
              if (s.includes("repair") || s.includes("maintenance")) return "#F59E0B";
              if (s.includes("missing") || s.includes("lost")) return "#EF4444";
              if (s.includes("scrap") || s.includes("dispose")) return "#64748B";
              return "#0284C7";
            };
            const statusColor = getStatusColor(item.status);
            const locationName = item.storeName || (item.store && item.store.name) || (item.project && item.project.name) || (item.currentSite && item.currentSite.name) || null;
            const categoryText = item.category || item.toolType || "General";

            return (
              <View
                style={{
                  marginBottom: 14,
                  borderRadius: 16,
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
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
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isDark ? "#334155" : "#E2E8F0",
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
                            ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5")
                            : (isDark ? "#334155" : "#F1F5F9"),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: item.isPrinted
                              ? (isDark ? "#34D399" : "#059669")
                              : (isDark ? "#94A3B8" : "#64748B"),
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
                    SN: {item.serialNumber || "N/A"}{item.makeYear ? ` • Year: ${item.makeYear}` : ""}
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
                        backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
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
                          backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
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
                    {(item.capacity || item.safeWorkingLoad) && (
                      <View
                        style={{
                          backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "500", color: theme.textSecondary }}>
                          Cap: {item.capacity || item.safeWorkingLoad}
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
                      borderColor: isDark ? "#334155" : "#F1F5F9",
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setPreviewTool(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isDark ? "#334155" : "#E2E8F0",
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
                              backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                              borderWidth: 1,
                              borderColor: isDark ? "#334155" : "#E2E8F0",
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
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isDark ? "#31181E" : "#FEE2E2",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={13} color="#EF4444" />
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
            <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "600" }}>
                Showing {paginatedTools.length} of {filteredTools.length} tools
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
                  printStatus: "All",
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
