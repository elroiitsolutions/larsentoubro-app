import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  FileText,
  Truck,
  RotateCcw,
  Calendar,
  Building2,
  ChevronRight,
  Package,
} from "lucide-react-native";
import { ChallanRecord } from "../types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/Badge";

interface ChallanCardProps {
  challan: ChallanRecord;
  onPress: () => void;
}

export const ChallanCard: React.FC<ChallanCardProps> = ({ challan, onPress }) => {
  const isDelivery =
    challan.challanType?.toLowerCase().includes("delivery") ||
    challan.challanNumber?.startsWith("DC");

  return (
    <Card className="p-4 mb-3">
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        {/* Header: Icon, Number, Type Badge & Status */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                isDelivery
                  ? "bg-blue-50 dark:bg-blue-950/60"
                  : "bg-emerald-50 dark:bg-emerald-950/60"
              }`}
            >
              {isDelivery ? (
                <Truck size={20} color="#2563EB" />
              ) : (
                <RotateCcw size={20} color="#10B981" />
              )}
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text
                  className="text-base font-bold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {challan.challanNumber || `CH-${challan._id.substring(0, 6)}`}
                </Text>
                <Badge
                  label={isDelivery ? "Delivery (DC)" : "Return (RC)"}
                  variant={isDelivery ? "primary" : "success"}
                  size="sm"
                />
              </View>

              <Text className="text-[11px] text-slate-400 font-mono">
                {challan.challanDate ? `Date: ${challan.challanDate}` : `ID: ${challan._id.substring(challan._id.length - 6).toUpperCase()}`}
              </Text>
            </View>
          </View>

          <StatusBadge status={challan.status || "Active"} size="sm" />
        </View>

        {/* Vendor & Store Info */}
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-2.5 gap-1.5 border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <Building2 size={12} color="#64748B" className="mr-1.5" />
              <Text className="text-xs text-slate-500 mr-1">Vendor/Site:</Text>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                {challan.vendor?.name || "L&T Contractor / Vendor"}
              </Text>
            </View>

            {challan.vendor?.vendorCode && (
              <Text className="text-[10px] font-mono text-slate-400">
                {challan.vendor.vendorCode}
              </Text>
            )}
          </View>

          {/* Tools item count summary */}
          <View className="flex-row items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <View className="flex-row items-center gap-1">
              <Package size={12} color="#4F46E5" />
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Items Dispatched: {challan.toolCount || challan.items?.length || 0}
              </Text>
            </View>

            {(challan.returnedCount ?? 0) > 0 && (
              <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Returned: {challan.returnedCount}
              </Text>
            )}

            {(challan.missingCount ?? 0) > 0 && (
              <Text className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                Missing: {challan.missingCount}
              </Text>
            )}
          </View>
        </View>

        {/* Footer Action */}
        <View className="flex-row items-center justify-between pt-1">
          <Text className="text-xs text-slate-400 font-medium">
            {challan.items?.length || 0} line items
          </Text>

          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
              View Challan Details
            </Text>
            <ChevronRight size={14} color="#4F46E5" />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};
