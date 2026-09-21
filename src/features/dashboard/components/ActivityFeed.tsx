import React from "react";
import { View, Text } from "react-native";
import { Activity, Clock, User } from "lucide-react-native";
import { ActivityItem } from "../types";
import { Card } from "@/components/ui/Card";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <Card className="p-4 mb-6">
        <Text className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          Recent Activity
        </Text>
        <Text className="text-xs text-slate-500">
          No recent activity logged.
        </Text>
      </Card>
    );
  }

  const formatActivityDate = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <View className="flex-row items-center gap-2 mb-3">
        <Activity size={16} color="#4F46E5" />
        <Text className="text-sm font-bold text-slate-900 dark:text-white">
          Recent Activity
        </Text>
      </View>

      <View className="space-y-3">
        {activities.slice(0, 6).map((item, idx) => (
          <View
            key={item.id || idx}
            className="flex-row items-start pb-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0"
          >
            <View className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 mr-2.5" />
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-slate-900 dark:text-white">
                  {item.action || "Tool Action"}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Clock size={10} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-400">
                    {formatActivityDate(item.date)}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-slate-600 dark:text-slate-300 mt-0.5" numberOfLines={2}>
                {item.details || `Tool: ${item.toolId}`}
              </Text>

              {item.user && (
                <View className="flex-row items-center gap-1 mt-1">
                  <User size={10} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-400 font-medium">
                    {item.user}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
