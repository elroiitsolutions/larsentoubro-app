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

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status?.toLowerCase() === "active").length;
    const inProgress = projects.filter((p) => p.status?.toLowerCase() === "in progress").length;
    const completed = projects.filter((p) => p.status?.toLowerCase() === "completed").length;
    return { total, active, inProgress, completed };
  }, [projects]);

  const getStatusCount = (status: string) => {
    if (status === "All") return projects.length;
    return projects.filter((p) => p.status?.toLowerCase() === status.toLowerCase()).length;
  };

  return (
    <ScreenWrapper
      title="Projects"
      subtitle={`${projects.length} Active Projects`}
      showBackButton={false}
      requiredPage="/projects"
      headerRight={
        canManageProjects ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/projects/form" as any)}
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
              Add Project
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Quick KPI Overview Strip */}
      {/* <View
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
          onPress={() => setStatusFilter("All")}
          style={{
            flex: 1,
            backgroundColor: statusFilter === "All" ? (theme.isDark ? "#312E81" : "#EEF2FF") : (theme.isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: statusFilter === "All" ? theme.primary : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: statusFilter === "All" ? theme.primary : theme.text }}>
            {stats.total}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Total
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatusFilter("Active")}
          style={{
            flex: 1,
            backgroundColor: statusFilter === "Active" ? (theme.isDark ? "rgba(5, 150, 105, 0.25)" : "#ECFDF5") : (theme.isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: statusFilter === "Active" ? "#059669" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>
            {stats.active}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatusFilter("In Progress")}
          style={{
            flex: 1,
            backgroundColor: statusFilter === "In Progress" ? (theme.isDark ? "rgba(37, 99, 235, 0.25)" : "#EFF6FF") : (theme.isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: statusFilter === "In Progress" ? "#2563EB" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#2563EB" }}>
            {stats.inProgress}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatusFilter("Completed")}
          style={{
            flex: 1,
            backgroundColor: statusFilter === "Completed" ? (theme.isDark ? "rgba(124, 58, 237, 0.25)" : "#FAF5FF") : (theme.isDark ? "#1E293B" : "#F8FAFC"),
            paddingVertical: 8,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: statusFilter === "Completed" ? "#7C3AED" : theme.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#7C3AED" }}>
            {stats.completed}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.textSecondary, marginTop: 1 }}>
            Done
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* Search Bar & Filter Chips */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 6,
          // backgroundColor: theme.surface,
          // borderBottomWidth: 1,
          // borderColor: theme.border,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by project name, code, lead, or site..."
          style={{ marginBottom: 0 }}
        />

        {/* <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item;
            const count = getStatusCount(item);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusFilter(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 11,
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
                    fontWeight: "700",
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {item}
                </Text>
                <View
                  style={{
                    backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : theme.isDark ? "#334155" : "#E2E8F0",
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
        /> */}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 }}
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
