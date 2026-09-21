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
  Wrench,
  QrCode,
  Shield,
  Layers,
  Calendar,
  Building2,
  Tag,
  Hash,
  Copy,
  Check,
  Edit2,
  MapPin,
  Store,
  FileCheck,
  User,
  Clock,
  CalendarCheck,
  Menu,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { toolService } from "@/features/tools/services/toolService";
import {
  ToolRecord,
  resolveValidationValue,
  calculateValidUntilDate,
} from "@/features/tools/types";
import { ToolLifeExtensionModal } from "@/features/dashboard/components/ToolLifeExtensionModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ToolDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openSidebar } = useSidebarStore();

  const [tool, setTool] = useState<ToolRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Life Extension Modal State
  const [extendModalVisible, setExtendModalVisible] = useState(false);

  const canManage = user?.role === "Admin" || user?.role === "Manager";

  const fetchTool = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await toolService.getToolById(id);
      setTool(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load tool details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTool();
  }, [fetchTool]);

  useFocusEffect(
    useCallback(() => {
      fetchTool();
    }, [fetchTool])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTool();
  };

  const handleCopyId = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <Loader fullScreen message="Fetching tool specifications..." />;
  }

  if (error || !tool) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 flex-row items-center">
          <TouchableOpacity onPress={openSidebar} className="p-1 mr-2">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900">Equipment Details</Text>
        </View>
        <ErrorState
          title="Equipment Not Found"
          message={error || "Could not retrieve tool record."}
          onRetry={() => {
            setLoading(true);
            fetchTool();
          }}
        />
      </SafeAreaView>
    );
  }

  const toolDisplayCode =
    tool.toolCode ||
    tool.toolId ||
    tool._id.substring(tool._id.length - 8).toUpperCase();

  const validationVal = resolveValidationValue(tool);
  const validUntilVal = calculateValidUntilDate(tool.dateOfSupply, validationVal);

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
            <Text
              className="text-base font-bold text-slate-900 dark:text-white"
              numberOfLines={1}
            >
              {tool.name || tool.description || "Equipment Details"}
            </Text>
            <Text className="text-[11px] font-mono text-slate-400">
              {toolDisplayCode}
            </Text>
          </View>
        </View>

        {canManage && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/tools/form",
                params: { id: tool._id },
              } as any)
            }
            className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center"
          >
            <Edit2 size={16} color="#4F46E5" />
          </TouchableOpacity>
        )}
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
        {/* Main Tool Card */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {tool.name || tool.description || "Equipment Unit"}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {tool.category || tool.toolType || "General Equipment"}
              </Text>
            </View>
            <StatusBadge status={tool.status || "Available"} size="md" />
          </View>

          {/* Identifier pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopyId}
            className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <Text className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              ID: {toolDisplayCode}
            </Text>
            {copied ? (
              <Check size={14} color="#10B981" />
            ) : (
              <Copy size={14} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {/* Life Extension Action if Inspection Due or Expired */}
          {(tool.status?.toLowerCase().includes("inspection") ||
            tool.status?.toLowerCase().includes("expired")) && (
            <View className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                title="Approve & Extend Tool Life"
                size="sm"
                onPress={() => setExtendModalVisible(true)}
                icon={<Clock size={14} color="#FFFFFF" />}
              />
            </View>
          )}
        </Card>

        {/* Validation & Compliance Card */}
        <Card className="p-4 mb-4 border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
          <View className="flex-row items-center gap-2 mb-3">
            <Clock size={16} color="#D97706" />
            <Text className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Validation & Compliance
            </Text>
          </View>

          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-amber-900 dark:text-amber-300">
                Validation
              </Text>
              <Text className="text-xs font-bold text-amber-950 dark:text-amber-100">
                {validationVal}
              </Text>
            </View>

            {validUntilVal !== '-' && (
              <View className="flex-row items-center justify-between border-t border-amber-200/60 dark:border-amber-800/40 pt-2">
                <Text className="text-xs text-amber-900 dark:text-amber-300">
                  Valid Until
                </Text>
                <Text className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  {validUntilVal}
                </Text>
              </View>
            )}

            {tool.dateOfSupply && (
              <View className="flex-row items-center justify-between border-t border-amber-200/60 dark:border-amber-800/40 pt-2">
                <Text className="text-xs text-amber-900 dark:text-amber-300">
                  Date of Supply
                </Text>
                <Text className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                  {tool.dateOfSupply}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Technical Specifications Card */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Technical Specifications
          </Text>

          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Tag size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Category</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tool.category || tool.toolType || "General"}
              </Text>
            </View>

            {tool.serialNumber && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Hash size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Serial Number</Text>
                </View>
                <Text className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                  {tool.serialNumber}
                </Text>
              </View>
            )}

            {tool.capacity && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Layers size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Rated Capacity</Text>
                </View>
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tool.capacity}
                </Text>
              </View>
            )}

            {tool.safeWorkingLoad && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Shield size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Safe Working Load (SWL)</Text>
                </View>
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tool.safeWorkingLoad}
                </Text>
              </View>
            )}

            {tool.makeYear && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Calendar size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Make Year</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {tool.makeYear}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Procurement & Vendor Info */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Procurement & Certification
          </Text>

          <View className="gap-2.5">
            {tool.purchaserName && (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Building2 size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Purchaser</Text>
                </View>
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                  {tool.purchaserName}
                </Text>
              </View>
            )}

            {tool.supplierCode && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Hash size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Supplier Code</Text>
                </View>
                <Text className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                  {tool.supplierCode}
                </Text>
              </View>
            )}

            {tool.testCertificate && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <FileCheck size={14} color="#10B981" className="mr-2" />
                  <Text className="text-xs text-slate-500">Test Certificate</Text>
                </View>
                <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {tool.testCertificate}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Remarks Section */}
        {tool.remarks && (
          <Card className="p-4 mb-4">
            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Remarks & Condition Notes
            </Text>
            <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {tool.remarks}
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Tool Life Extension Modal */}
      <ToolLifeExtensionModal
        visible={extendModalVisible}
        onClose={() => setExtendModalVisible(false)}
        toolId={tool._id}
        onSuccess={fetchTool}
      />
    </SafeAreaView>
  );
}
