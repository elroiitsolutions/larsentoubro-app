import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { projectService } from "@/features/projects/services/projectService";
import { storeService } from "@/features/stores/services/storeService";
import { ProjectRecord } from "@/features/projects/types";
import { StoreRecord } from "@/features/stores/types";
import { StoreCard } from "@/features/stores/components/StoreCard";
import { SearchBar } from "@/components/common/SearchBar";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ProjectStoresScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Deletion modal state
  const [deletingStore, setDeletingStore] = useState<StoreRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManage = user?.role === "Admin" || user?.role === "Manager";

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [projData, storesData] = await Promise.all([
        projectService.getProjectById(id),
        storeService.getStores(id),
      ]);
      setProject(projData);
      setStores(storesData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load project stores."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteStore = async () => {
    if (!deletingStore) return;
    setDeleteLoading(true);
    try {
      await storeService.deleteStore(deletingStore._id);
      Alert.alert("Success", "Store removed successfully.");
      setDeletingStore(null);
      loadData();
    } catch (err: any) {
      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message || err?.message || "Could not delete store."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase();
    return stores.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.incharge && s.incharge.toLowerCase().includes(q)) ||
        (s.type && s.type.toLowerCase().includes(q))
    );
  }, [stores, searchQuery]);

  const projectCode =
    project?.projectCode || (id ? id.substring(id.length - 6).toUpperCase() : "PRJ");
  const title = project?.name ? `${project.name} Stores` : "Project Stores";
  const subtitle = `Project #${projectCode} • ${stores.length} Facilities`;

  return (
    <ScreenWrapper
      title={title}
      subtitle={subtitle}
      showBack={true}
      requiredPage="/stores"
      headerRight={
        canManage && project ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/stores/form",
                params: { projectId: project._id },
              } as any)
            }
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
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
              Add Store
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: theme.border,
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search stores by name, location, incharge..."
        />
      </View>

      {/* Main List */}
      {loading ? (
        <Loader fullScreen message="Loading project facilities..." />
      ) : error ? (
        <ErrorState
          title="Could Not Load Stores"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadData();
          }}
        />
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 80,
          }}
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
              canManage={canManage}
              onEdit={() =>
                router.push({
                  pathname: "/stores/form",
                  params: { id: item._id, projectId: id },
                } as any)
              }
              onDelete={() => setDeletingStore(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={searchQuery ? "No Stores Found" : "No Stores in Project"}
              description={
                searchQuery
                  ? "No stores matched your search query."
                  : `There are currently no stores or site tool depos registered under ${project?.name || "this project"}.`
              }
              actionTitle={canManage && !searchQuery ? "Create Store Facility" : undefined}
              onAction={() =>
                router.push({
                  pathname: "/stores/form",
                  params: { projectId: id },
                } as any)
              }
            />
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        visible={!!deletingStore}
        title="Remove Store Facility"
        message={`Are you sure you want to delete "${deletingStore?.name}"? All assigned tool associations will be impacted.`}
        confirmText="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteStore}
        onCancel={() => setDeletingStore(null)}
      />
    </ScreenWrapper>
  );
}
