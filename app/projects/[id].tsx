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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  FolderGit2,
  Store,
  MapPin,
  User,
  DollarSign,
  Calendar,
  ChevronRight,
  Wrench,
  Layers,
} from "lucide-react-native";
import { projectService } from "@/features/projects/services/projectService";
import { useSidebarStore } from "@/store/sidebarStore";
import { Menu } from "lucide-react-native";
import { storeService } from "@/features/stores/services/storeService";
import { ProjectRecord } from "@/features/projects/types";
import { StoreRecord } from "@/features/stores/types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openSidebar } = useSidebarStore();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          "Failed to load project details."
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

  if (loading) {
    return <Loader fullScreen message="Loading project details..." />;
  }

  if (error || !project) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 flex-row items-center">
          <TouchableOpacity onPress={openSidebar} className="p-1 mr-2">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900">Project Details</Text>
        </View>
        <ErrorState
          title="Project Not Found"
          message={error || "Could not retrieve project information."}
          onRetry={() => {
            setLoading(true);
            loadData();
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
              {project.name}
            </Text>
            <Text className="text-[11px] text-slate-500 font-mono">
              {project.projectCode || `ID: ${project._id.substring(project._id.length - 6).toUpperCase()}`}
            </Text>
          </View>
        </View>

        <StatusBadge status={project.status || "Active"} size="sm" />
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
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
        {/* Project Summary Card */}
        <Card className="p-5 mb-5">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center">
              <FolderGit2 size={24} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {project.name}
              </Text>
              <Text className="text-xs text-slate-500">
                {project.department || "L&T Engineering Project"}
              </Text>
            </View>
          </View>

          {project.description ? (
            <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {project.description}
            </Text>
          ) : null}

          <View className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            {(project.lead || project.incharge) && (
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center">
                  <User size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Project Lead</Text>
                </View>
                <Text className="text-xs font-semibold text-slate-900 dark:text-white">
                  {project.lead || project.incharge}
                </Text>
              </View>
            )}

            {(project.location || project.department) && (
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center">
                  <MapPin size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Site Location</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {project.location || project.department}
                </Text>
              </View>
            )}

            {project.budget ? (
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center">
                  <DollarSign size={14} color="#10B981" className="mr-2" />
                  <Text className="text-xs text-slate-500">Allocated Budget</Text>
                </View>
                <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {typeof project.budget === "number"
                    ? `₹${project.budget.toLocaleString()}`
                    : project.budget}
                </Text>
              </View>
            ) : null}

            {project.deadline || project.endDate ? (
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center">
                  <Calendar size={14} color="#94A3B8" className="mr-2" />
                  <Text className="text-xs text-slate-500">Target Completion</Text>
                </View>
                <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {project.deadline || project.endDate}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Attached Stores Section */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Store size={18} color="#4F46E5" />
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              Project Stores
            </Text>
            <View className="bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                {stores.length}
              </Text>
            </View>
          </View>
        </View>

        {stores.length === 0 ? (
          <EmptyState
            title="No Stores Attached"
            description="There are no stores or site tool depos assigned to this project yet."
          />
        ) : (
          <View className="space-y-3">
            {stores.map((st) => (
              <Card key={st._id} className="p-4 mb-3">
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push(`/stores/${st._id}` as any)}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 items-center justify-center mr-3">
                        <Store size={20} color="#3B82F6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">
                          {st.name}
                        </Text>
                        <Text className="text-[11px] text-slate-400">
                          {st.location || "On-site Store"}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge status={st.status || "Active"} size="sm" />
                  </View>

                  <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl my-2 border border-slate-100 dark:border-slate-800">
                    <View className="flex-row items-center gap-1.5">
                      <Wrench size={14} color="#64748B" />
                      <Text className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Total Tools: <Text className="font-bold text-slate-900 dark:text-white">{st.totalToolsCount ?? (st as any).toolsCount ?? 0}</Text>
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Layers size={14} color="#10B981" />
                      <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        Available: {st.availableToolsCount || 0}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-end pt-1">
                    <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
                      Open Store Inventory
                    </Text>
                    <ChevronRight size={14} color="#4F46E5" />
                  </View>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
