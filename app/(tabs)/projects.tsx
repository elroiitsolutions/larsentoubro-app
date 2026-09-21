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
import { projectService } from "@/features/projects/services/projectService";
import { ProjectRecord } from "@/features/projects/types";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { SearchBar } from "@/components/common/SearchBar";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Delete Confirmation State
  const [deletingProject, setDeletingProject] = useState<ProjectRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManageProjects =
    user?.role === "Admin" || user?.role === "Manager";

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load projects. Please check your connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      await projectService.deleteProject(deletingProject._id);
      Alert.alert("Success", "Project deleted successfully.");
      setDeletingProject(null);
      fetchProjects();
    } catch (err: any) {
      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message || err?.message || "Could not delete project"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusOptions = ["All", "Active", "In Progress", "On Hold", "Completed"];

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lead?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        p.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <ScreenWrapper
      title="Projects Directory"
      subtitle={`${projects.length} Active Enterprise Projects`}
      showBackButton={false}
      headerRight={
        canManageProjects ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/projects/form" as any)}
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
              Add Project
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
          placeholder="Search by project name, code, lead, or site..."
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

      {/* Projects List Content */}
      {loading ? (
        <Loader fullScreen message="Loading projects directory..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Projects"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchProjects();
          }}
        />
      ) : (
        <FlatList
          data={filteredProjects}
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
            <ProjectCard
              project={item}
              onPress={() => router.push(`/projects/${item._id}` as any)}
              canManage={canManageProjects}
              onEdit={() => {
                router.push({
                  pathname: "/projects/form",
                  params: { id: item._id },
                } as any);
              }}
              onDelete={() => setDeletingProject(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Projects Found"
              description={
                searchQuery || statusFilter !== "All"
                  ? "No projects matched your search and filter criteria."
                  : "No projects registered yet."
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
        visible={!!deletingProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProject(null)}
      />
    </ScreenWrapper>
  );
}
