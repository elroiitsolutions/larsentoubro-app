import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Truck,
  RotateCcw,
  Building2,
  Calendar,
  Phone,
  User,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  FileText,
  Menu,
} from "lucide-react-native";
import { challanService } from "@/features/challans/services/challanService";
import { ChallanRecord } from "@/features/challans/types";
import { CreateReturnChallanModal } from "@/features/challans/components/CreateReturnChallanModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ChallanDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openSidebar } = useSidebarStore();

  const [challan, setChallan] = useState<ChallanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Return Challan Modal State
  const [returnModalVisible, setReturnModalVisible] = useState(false);

  const canManage = user?.role === "Admin" || user?.role === "Manager";

  const fetchChallan = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await challanService.getChallanById(id);
      setChallan(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load challan details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChallan();
  }, [fetchChallan]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallan();
  };

  if (loading) {
    return <Loader fullScreen message="Loading challan document..." />;
  }

  if (error || !challan) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 flex-row items-center">
          <TouchableOpacity onPress={openSidebar} className="p-1 mr-2">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900">Challan Document</Text>
        </View>
        <ErrorState
          title="Document Error"
          message={error || "Could not retrieve challan details."}
          onRetry={() => {
            setLoading(true);
            fetchChallan();
          }}
        />
      </SafeAreaView>
    );
  }

  const isDelivery = challan.challanType === "Delivery" || challan.type === "Delivery";
  const canCreateReturn =
    isDelivery &&
    canManage &&
    challan.status !== "Returned" &&
    challan.status !== "Cancelled";

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      {/* Screen Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3"
          >
            <Menu size={18} color="#475569" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
              {isDelivery ? "Delivery Challan" : "Return Challan"}
            </Text>
            <Text className="text-[11px] font-mono text-slate-400">
              # {challan.challanNumber || challan._id}
            </Text>
          </View>
        </View>

        <StatusBadge status={challan.status || "Pending"} size="sm" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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
        {/* Document Header Card */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: isDelivery ? "#EFF6FF" : "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDelivery ? (
                  <Truck size={22} color="#2563EB" />
                ) : (
                  <RotateCcw size={22} color="#10B981" />
                )}
              </View>

              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  {isDelivery ? "Delivery Challan (DC)" : "Return Challan (RC)"}
                </Text>
                <Text className="text-xs font-mono text-slate-500">
                  {challan.challanNumber || challan._id}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-[10px] text-slate-400 uppercase font-bold">Issue Date</Text>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {challan.challanDate || "N/A"}
              </Text>
            </View>
          </View>

          {/* Quick Action: Generate Return Challan */}
          {canCreateReturn && (
            <View className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                title="Generate Return Challan (RC)"
                size="sm"
                onPress={() => setReturnModalVisible(true)}
                icon={<RotateCcw size={14} color="#FFFFFF" />}
              />
            </View>
          )}
        </Card>

        {/* Vendor / Destination Party Card */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Recipient / Destination Party
          </Text>

          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Building2 size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Vendor / Party</Text>
              </View>
              <Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                {challan.vendor?.name || "L&T Authorized Vendor"}
              </Text>
            </View>

            {challan.vendor?.vendorCode && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <Text className="text-xs text-slate-500">Vendor Code</Text>
                <Text className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                  {challan.vendor.vendorCode}
                </Text>
              </View>
            )}

            {challan.vendor?.contactPerson && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <User size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Contact Person</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {challan.vendor.contactPerson}
                </Text>
              </View>
            )}

            {challan.vendor?.contactPhone && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Phone size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Phone</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {challan.vendor.contactPhone}
                </Text>
              </View>
            )}

            {challan.vendor?.address && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <MapPin size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Destination Site</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                  {challan.vendor.address}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Itemized Dispatched Tools */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-1.5">
              <Package size={16} color="#4F46E5" />
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                Dispatched Line Items
              </Text>
            </View>
            <Text className="text-xs text-slate-400 font-bold">
              {challan.items?.length || 0} Tools
            </Text>
          </View>

          {(!challan.items || challan.items.length === 0) ? (
            <Text className="text-xs text-slate-400 py-3 text-center">
              No line items recorded for this challan.
            </Text>
          ) : (
            <View>
              {challan.items.map((item, index) => (
                <View
                  key={index}
                  className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-2"
                >
                  <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.description || ("Tool #" + (index + 1))}
                      </Text>
                      {item.toolCode && (
                        <Text className="text-[10px] font-mono text-slate-400">
                          Code: {item.toolCode}
                        </Text>
                      )}
                    </View>

                    <Badge
                      label={item.returnStatus || "Sent"}
                      variant={
                        item.returnStatus === "Returned"
                          ? "success"
                          : item.returnStatus === "Missing"
                          ? "destructive"
                          : "primary"
                      }
                      size="sm"
                    />
                  </View>

                  <View className="flex-row items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-slate-500">
                    <Text className="text-[11px] text-slate-500">
                      Quantity: <Text className="font-semibold text-slate-700 dark:text-slate-300">{item.quantity} {item.unit || "NOS"}</Text>
                    </Text>
                    {item.remarks && (
                      <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                        {item.remarks}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Notes & Remarks */}
        {challan.notes && (
          <Card className="p-4 mb-4">
            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              Challan Notes & Remarks
            </Text>
            <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {challan.notes}
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Return Challan Modal */}
      {challan && (
        <CreateReturnChallanModal
          visible={returnModalVisible}
          onClose={() => setReturnModalVisible(false)}
          deliveryChallan={challan}
          onSuccess={fetchChallan}
        />
      )}
    </SafeAreaView>
  );
}
