import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Store,
  MapPin,
  User,
  Phone,
  Wrench,
  ChevronRight,
  Edit2,
  Trash2,
  Building2,
} from "lucide-react-native";
import { StoreRecord } from "../types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/Badge";

interface StoreCardProps {
  store: StoreRecord;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onPress,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  return (
    <Card className="p-4 mb-3">
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        {/* Header: Store Icon, Name, Type & Status */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 items-center justify-center mr-3">
              <Store size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text
                  className="text-base font-bold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {store.name}
                </Text>
                {store.type && (
                  <Badge
                    label={store.type}
                    variant={store.type === "HUB" ? "primary" : "secondary"}
                    size="sm"
                  />
                )}
              </View>
              <Text className="text-[11px] font-mono text-slate-400">
                ID: {store._id.substring(store._id.length - 6).toUpperCase()}
                {store.projectName ? ` • ${store.projectName}` : ""}
              </Text>
            </View>
          </View>

          <StatusBadge status={store.status || "Operational"} size="sm" />
        </View>

        {/* Location & Contact Info */}
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3 gap-1.5 border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <MapPin size={12} color="#64748B" className="mr-1.5" />
              <Text className="text-xs text-slate-700 dark:text-slate-300" numberOfLines={1}>
                {store.location || "On-site Store"}
              </Text>
            </View>

            {store.incharge && (
              <View className="flex-row items-center">
                <User size={12} color="#64748B" className="mr-1" />
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {store.incharge}
                </Text>
              </View>
            )}
          </View>

          {store.contactNumber && (
            <View className="flex-row items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <Phone size={12} color="#64748B" className="mr-1.5" />
              <Text className="text-xs text-slate-500">{store.contactNumber}</Text>
            </View>
          )}

          {/* Tools count summary */}
          <View className="flex-row items-center justify-between pt-1 mt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <View className="flex-row items-center gap-1">
              <Wrench size={12} color="#4F46E5" />
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tools: {store.totalToolsCount || 0}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Available: {store.availableToolsCount || 0}
              </Text>
              {(store.assignedToolsCount ?? 0) > 0 && (
                <Text className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  Issued: {store.assignedToolsCount}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
              View Tool Inventory
            </Text>
            <ChevronRight size={14} color="#4F46E5" />
          </View>

          {canManage && (
            <View className="flex-row items-center gap-1">
              {onEdit && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <Edit2 size={14} color="#475569" />
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50"
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};
