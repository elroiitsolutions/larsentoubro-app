import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AlertCircle, AlertTriangle, Info, ChevronRight } from "lucide-react-native";
import { AlertItem } from "../types";
import { Card } from "@/components/ui/Card";

interface AlertsSectionProps {
  alerts: AlertItem[];
  onAlertPress?: (alert: AlertItem) => void;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  alerts,
  onAlertPress,
}) => {
  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-4 mb-6">
        <Text className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          Action Required
        </Text>
        <Text className="text-xs text-slate-500">
          No critical alerts or action required at this time.
        </Text>
      </Card>
    );
  }

  const getSeverityIcon = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "danger":
        return <AlertCircle size={18} color="#EF4444" />;
      case "warning":
        return <AlertTriangle size={18} color="#F59E0B" />;
      case "info":
      default:
        return <Info size={18} color="#3B82F6" />;
    }
  };

  const getSeverityStyle = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "danger":
        return "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60";
      case "info":
      default:
        return "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60";
    }
  };

  return (
    <Card className="p-4 mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            Action Required
          </Text>
          <View className="bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-red-600 dark:text-red-400">
              {alerts.length}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-2.5">
        {alerts.slice(0, 5).map((alert) => (
          <TouchableOpacity
            key={alert.id}
            activeOpacity={0.7}
            onPress={() => onAlertPress?.(alert)}
            className={`p-3 rounded-xl border flex-row items-center justify-between ${getSeverityStyle(
              alert.severity
            )}`}
          >
            <View className="flex-row items-start flex-1 mr-2">
              <View className="mr-2.5 mt-0.5">{getSeverityIcon(alert.severity)}</View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900 dark:text-white">
                  {alert.title}
                </Text>
                <Text
                  className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight"
                  numberOfLines={2}
                >
                  {alert.message}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};
