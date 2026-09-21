import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Wrench,
  CheckCircle2,
  ArrowUpRight,
  Clock,
} from "lucide-react-native";
import { SummaryCardsData } from "../types";

interface SummaryCardsProps {
  data: SummaryCardsData;
  activeStatus?: string;
  onCardPress?: (status: string) => void;
}

interface MetricCardItem {
  key: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  bgLight: string;
  textColor: string;
  statusFilter?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  data,
  activeStatus,
  onCardPress,
}) => {
  const primaryCards: MetricCardItem[] = [
    {
      key: "total",
      title: "Total Tools",
      value: data.totalTools || 0,
      icon: <Wrench size={20} color="#4F46E5" />,
      bgLight: "bg-indigo-50 dark:bg-indigo-950/40",
      textColor: "text-indigo-600 dark:text-indigo-400",
      statusFilter: "All",
    },
    {
      key: "available",
      title: "Available",
      value: data.available || 0,
      icon: <CheckCircle2 size={20} color="#10B981" />,
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      textColor: "text-emerald-600 dark:text-emerald-400",
      statusFilter: "Available",
    },
    {
      key: "issued",
      title: "Issued Out",
      value: data.issued || 0,
      icon: <ArrowUpRight size={20} color="#3B82F6" />,
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      textColor: "text-blue-600 dark:text-blue-400",
      statusFilter: "Issued",
    },
    {
      key: "inspectionDue",
      title: "Inspection Due",
      value: data.inspectionDue || 0,
      icon: <Clock size={20} color="#F59E0B" />,
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      textColor: "text-amber-600 dark:text-amber-400",
      statusFilter: "Inspection Due",
    },
  ];

  return (
    <View className="mb-4">
      {/* Primary KPI 2x2 Grid */}
      <View className="flex-row flex-wrap -mx-1.5">
        {primaryCards.map((card) => {
          const isSelected = activeStatus === card.statusFilter;
          return (
            <View key={card.key} className="w-1/2 p-1.5">
              <TouchableOpacity
                activeOpacity={0.75}
                delayPressIn={0}
                onPress={() => card.statusFilter && onCardPress?.(card.statusFilter)}
                className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/20"
                    : "border-slate-100 dark:border-slate-800"
                }`}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className={`w-10 h-10 rounded-xl ${card.bgLight} items-center justify-center`}>
                    {card.icon}
                  </View>
                  {isSelected && (
                    <View className="bg-indigo-600 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] text-white font-bold">Active</Text>
                    </View>
                  )}
                </View>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                  {card.value.toLocaleString()}
                </Text>
                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {card.title}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};
