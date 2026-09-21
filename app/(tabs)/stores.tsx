import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Plus } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { storeService } from "@/features/stores/services/storeService";
import { StoreRecord } from "@/features/stores/types";
import { StoreCard } from "@/features/stores/components/StoreCard";
import { SearchBar } from "@/components/common/SearchBar";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function StoresScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();

  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Delete Confirmation State
  const [deletingStore, setDeletingStore] = useState<StoreRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManageStores = user?.role === "Admin" || user?.role === "Manager";

  const fetchStores = useCallback(async () => {
    try {
      setError(null);
      const data = await storeService.getStores();
      setStores(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load stores directory."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useFocusEffect(
    useCallback(() => {
      fetchStores();
    }, [fetchStores])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStore) return;
    setDeleteLoading(true);
    try {
      await storeService.deleteStore(deletingStore._id);
      Alert.alert("Success", "Store deleted successfully.");
      setDeletingStore(null);
      fetchStores();
    } catch (err: any) {
      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message || err?.message || "Could not delete store"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusOptions = ["All", "Operational", "HUB", "Maintenance", "Inactive"];

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.incharge?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "HUB" && s.type === "HUB") ||
        s.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [stores, searchQuery, statusFilter]);

  return (
    <ScreenWrapper
      title="Stores & Equipment Hubs"
      subtitle={`${stores.length} Storage Facilities Registered`}
      showBackButton={false}
      headerRight={
        canManageStores ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/stores/form" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
            }}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
              Add Store
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Search Bar & Filter Chips */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by store name, yard, incharge..."
          style={{ marginBottom: 10 }}
        />

        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusFilter(item)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  marginRight: 6,
                  backgroundColor: isSelected ? theme.primary : theme.isDark ? "#1E293B" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Stores List Content */}
      {loading ? (
        <Loader fullScreen message="Loading stores directory..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Stores"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchStores();
          }}
        />
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              onPress={() => router.push(`/stores/${item._id}` as any)}
              canManage={canManageStores}
              onEdit={() => {
                router.push({
                  pathname: "/stores/form",
                  params: { id: item._id },
                } as any);
              }}
              onDelete={() => setDeletingStore(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Stores Found"
              description={
                searchQuery || statusFilter !== "All"
                  ? "No stores matched your search and filter criteria."
                  : "No stores registered yet."
              }
              actionTitle={
                searchQuery || statusFilter !== "All" ? "Clear Filters" : undefined
              }
              onAction={() => {
                setSearchQuery("");
                setStatusFilter("All");
              }}
            />
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={!!deletingStore}
        title="Delete Store"
        message={`Are you sure you want to delete "${deletingStore?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingStore(null)}
      />
    </ScreenWrapper>
  );
}
