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

const STATUSES = [
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

const CATEGORIES = [
  "All",
  "Electrical Tools",
  "Mechanical Tools",
  "Lifting & Rigging",
  "Hydraulic Equipment",
  "Safety Equipment",
  "Welding & Cutting",
  "Measuring Instruments",
  "Pneumatic Tools",
  "General Stores",
];

const DATE_PRESETS = [
  { label: "All Time", days: 0 },
  { label: "Today", days: 1 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "This Year", days: 365 },
];

export const DashboardFilterModal: React.FC<DashboardFilterModalProps> = ({
  visible,
  onClose,
  filters,
  hierarchy,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = React.useState<DashboardFilterParams>(filters);
  const [selectedDatePreset, setSelectedDatePreset] = React.useState<string>("All Time");

  React.useEffect(() => {
    setLocalFilters(filters);
    if (!filters.startDate && !filters.endDate) {
      setSelectedDatePreset("All Time");
    }
  }, [filters, visible]);

  // Hierarchy Derivations
  const selectedDivNode = hierarchy.find((d) => d.name === localFilters.division);
  const availableProjects = selectedDivNode
    ? selectedDivNode.projects
    : hierarchy.flatMap((d) => d.projects) || [];

  const selectedProjNode = availableProjects.find((p) => p.id === localFilters.project);
  const availableStores = selectedProjNode
    ? selectedProjNode.stores
    : availableProjects.flatMap((p) => p.stores) || [];

  const regularStores = availableStores.filter((s) => s.type !== "HUB");
  const hubStores = availableStores.filter((s) => s.type === "HUB");

  const handleDatePresetSelect = (preset: typeof DATE_PRESETS[0]) => {
    setSelectedDatePreset(preset.label);
    if (preset.days === 0) {
      setLocalFilters((prev) => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
      }));
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - preset.days);
      setLocalFilters((prev) => ({
        ...prev,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }));
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Executive Dashboard Filters">
      <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
        {/* Date Range Presets */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Timeframe / Date Range
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {DATE_PRESETS.map((dp) => {
              const isSelected = selectedDatePreset === dp.label;
              return (
                <TouchableOpacity
                  key={dp.label}
                  activeOpacity={0.7}
                  onPress={() => handleDatePresetSelect(dp)}
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
                    {dp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status Filter */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Tool Status
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {STATUSES.map((st) => {
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

        {/* Tool Category */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Equipment Category
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = (localFilters.category || "All") === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      category: cat === "All" ? undefined : cat,
                    }))
                  }
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
                    {cat}
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
                onPress={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    division: "All",
                    project: "All",
                    store: undefined,
                    hub: undefined,
                  }))
                }
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
                  All Divisions
                </Text>
              </TouchableOpacity>

              {hierarchy.map((div) => {
                const isSelected = localFilters.division === div.name;
                return (
                  <TouchableOpacity
                    key={div.id}
                    onPress={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        division: div.name,
                        project: "All",
                        store: undefined,
                        hub: undefined,
                      }))
                    }
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
        {availableProjects.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Project
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <TouchableOpacity
                onPress={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    project: "All",
                    store: undefined,
                    hub: undefined,
                  }))
                }
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
                  All Projects
                </Text>
              </TouchableOpacity>

              {availableProjects.map((p) => {
                const isSelected = localFilters.project === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        project: p.id,
                        store: undefined,
                        hub: undefined,
                      }))
                    }
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

        {/* Store Filter */}
        {regularStores.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Specific Store
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <TouchableOpacity
                onPress={() => setLocalFilters((prev) => ({ ...prev, store: undefined }))}
                className={`px-3 py-1.5 rounded-xl border ${
                  !localFilters.store || localFilters.store === "All"
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    !localFilters.store || localFilters.store === "All"
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All Stores
                </Text>
              </TouchableOpacity>

              {regularStores.map((st) => {
                const isSelected = localFilters.store === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, store: st.id }))}
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
                      {st.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* HUB Filter */}
        {hubStores.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              HUB Location
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <TouchableOpacity
                onPress={() => setLocalFilters((prev) => ({ ...prev, hub: undefined }))}
                className={`px-3 py-1.5 rounded-xl border ${
                  !localFilters.hub || localFilters.hub === "All"
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    !localFilters.hub || localFilters.hub === "All"
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All HUBs
                </Text>
              </TouchableOpacity>

              {hubStores.map((h) => {
                const isSelected = localFilters.hub === h.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, hub: h.id }))}
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
                      {h.name}
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
