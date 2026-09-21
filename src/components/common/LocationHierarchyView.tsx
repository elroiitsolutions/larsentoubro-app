import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Building2,
  FolderGit2,
  Store,
  ChevronDown,
  ChevronRight,
  Wrench,
  AlertTriangle,
} from "lucide-react-native";
import { DivisionNode, ProjectNode, StoreNode } from "@/features/dashboard/types";
import { Card } from "@/components/ui/Card";

interface LocationHierarchyViewProps {
  hierarchyData: DivisionNode[];
  selectedDivision?: string;
  selectedProject?: string;
  onSelectNode?: (level: "division" | "project" | "store", nameOrId: string) => void;
  onStorePress?: (storeId: string) => void;
  onProjectPress?: (projectId: string) => void;
}

export const LocationHierarchyView: React.FC<LocationHierarchyViewProps> = ({
  hierarchyData,
  selectedDivision,
  selectedProject,
  onSelectNode,
  onStorePress,
  onProjectPress,
}) => {
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({
    "Heavy Civil Infrastructure": true,
    "Buildings & Infrastructure": true,
  });

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleDivision = (name: string) => {
    setExpandedDivisions((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!hierarchyData || hierarchyData.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <View className="flex-row items-center gap-2">
          <Building2 size={18} color="#4F46E5" />
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            Location & Facility Hierarchy
          </Text>
        </View>
        <Text className="text-[10px] text-slate-400 font-semibold uppercase">
          Division • Project • Store
        </Text>
      </View>

      <View className="space-y-2">
        {hierarchyData.map((div) => {
          const divKey = div.name || div.id;
          const isDivExpanded = !!expandedDivisions[divKey];
          const isDivSelected = selectedDivision === div.name || selectedDivision === div.id;

          return (
            <View
              key={divKey}
              className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800 mb-2"
            >
              {/* Division Header */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  toggleDivision(divKey);
                  onSelectNode?.("division", div.name);
                }}
                className="flex-row items-center justify-between py-1"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  {isDivExpanded ? (
                    <ChevronDown size={16} color="#64748B" className="mr-1" />
                  ) : (
                    <ChevronRight size={16} color="#64748B" className="mr-1" />
                  )}
                  <Building2 size={16} color="#4F46E5" className="mr-2" />
                  <Text
                    className={`text-xs font-bold ${
                      isDivSelected
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                    numberOfLines={1}
                  >
                    {div.name}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                  <Wrench size={10} color="#4F46E5" />
                  <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {div.totalTools || 0} Tools
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Projects inside Division */}
              {isDivExpanded && Array.isArray(div.projects) && (
                <View className="pl-4 mt-2 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                  {div.projects.map((proj) => {
                    const projKey = proj.id || proj.name;
                    const isProjExpanded = !!expandedProjects[projKey];
                    const isProjSelected = selectedProject === proj.id || selectedProject === proj.name;

                    return (
                      <View key={projKey} className="py-1">
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            toggleProject(projKey);
                            onSelectNode?.("project", proj.id);
                            onProjectPress?.(proj.id);
                          }}
                          className="flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1 mr-2">
                            {isProjExpanded ? (
                              <ChevronDown size={14} color="#94A3B8" className="mr-1" />
                            ) : (
                              <ChevronRight size={14} color="#94A3B8" className="mr-1" />
                            )}
                            <FolderGit2 size={14} color="#2563EB" className="mr-1.5" />
                            <Text
                              className={`text-xs font-semibold ${
                                isProjSelected
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-slate-800 dark:text-slate-200"
                              }`}
                              numberOfLines={1}
                            >
                              {proj.name}
                            </Text>
                          </View>

                          <Text className="text-[10px] text-slate-400 font-medium">
                            {proj.totalTools || 0} tools
                          </Text>
                        </TouchableOpacity>

                        {/* Stores inside Project */}
                        {isProjExpanded && Array.isArray(proj.stores) && (
                          <View className="pl-4 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 ml-2">
                            {proj.stores.map((st) => (
                              <TouchableOpacity
                                key={st.id}
                                activeOpacity={0.75}
                                onPress={() => {
                                  onSelectNode?.("store", st.id);
                                  onStorePress?.(st.id);
                                }}
                                className="flex-row items-center justify-between py-1 bg-white/60 dark:bg-slate-900/60 px-2 rounded-lg my-0.5 border border-slate-100 dark:border-slate-800"
                              >
                                <View className="flex-row items-center flex-1 mr-2">
                                  <Store size={12} color="#10B981" className="mr-1.5" />
                                  <Text className="text-[11px] font-medium text-slate-700 dark:text-slate-300" numberOfLines={1}>
                                    {st.name}
                                  </Text>
                                </View>

                                <View className="flex-row items-center gap-1">
                                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {st.totalTools || 0}
                                  </Text>
                                  {(st.alertsCount ?? 0) > 0 && (
                                    <AlertTriangle size={10} color="#EF4444" />
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
};
