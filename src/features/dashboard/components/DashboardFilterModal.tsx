import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DashboardFilterParams, DivisionNode } from "../types";

interface DashboardFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: DashboardFilterParams;
  hierarchy: DivisionNode[];
  onApply: (filters: DashboardFilterParams) => void;
  onReset: () => void;
}

export const DashboardFilterModal: React.FC<DashboardFilterModalProps> = ({
  visible,
  onClose,
  filters,
  hierarchy,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = React.useState<DashboardFilterParams>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const allProjects = hierarchy.flatMap((d) => d.projects) || [];
  const allStores = allProjects.flatMap((p) => p.stores) || [];

  const statuses = [
    "All",
    "Available",
    "Issued",
    "Inspection Due",
    "Expired",
    "Under Repair",
    "In Transit",
    "Scrap",
    "Missing",
    "Usable",
  ];

  return (
    <Modal visible={visible} onClose={onClose} title="Dashboard Filters">
      <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
        {/* Status Filter */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Tool Status
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {statuses.map((st) => {
              const isSelected = (localFilters.status || "All") === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, status: st }))}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Division Filter */}
        {hierarchy.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Division
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <TouchableOpacity
                onPress={() => setLocalFilters((prev) => ({ ...prev, division: "All" }))}
                className={`px-3 py-1.5 rounded-xl border ${
                  (localFilters.division || "All") === "All"
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    (localFilters.division || "All") === "All"
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>

              {hierarchy.map((div) => {
                const isSelected = localFilters.division === div.name;
                return (
                  <TouchableOpacity
                    key={div.id}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, division: div.name }))}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {div.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Project Filter */}
        {allProjects.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Project
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <TouchableOpacity
                onPress={() => setLocalFilters((prev) => ({ ...prev, project: "All" }))}
                className={`px-3 py-1.5 rounded-xl border ${
                  (localFilters.project || "All") === "All"
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    (localFilters.project || "All") === "All"
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>

              {allProjects.map((p) => {
                const isSelected = localFilters.project === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, project: p.id }))}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="flex-row gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button
            title="Reset"
            variant="outline"
            onPress={() => {
              onReset();
              onClose();
            }}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Apply Filters"
            onPress={() => {
              onApply(localFilters);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
};
