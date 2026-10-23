import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  ArrowRightLeft,
  Truck,
  QrCode as QrIcon,
  ClipboardCheck,
  Edit3,
  Recycle,
  ChevronRight,
  X,
  Wrench,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react-native";
import { Modal } from "@/components/ui/Modal";
import { ToolRecord } from "../types";
import { toolService } from "../services/toolService";
import { useAppTheme } from "@/context/ThemeContext";

export type BatchActionType =
  | "transfer"
  | "challan"
  | "qr"
  | "inspect"
  | "edit"
  | "scrap";

interface SelectedToolsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTools: ToolRecord[];
  onDeselectTool?: (toolId: string) => void;
  onClearSelection?: () => void;
  onSelectAction: (action: BatchActionType) => void;
  canInspect?: boolean;
  isInspectionRestricted?: boolean;
  onToolsUpdated?: () => void;
}

export const SelectedToolsModal: React.FC<SelectedToolsModalProps> = ({
  visible,
  onClose,
  selectedTools,
  onDeselectTool,
  onClearSelection,
  onSelectAction,
  canInspect = false,
  isInspectionRestricted = false,
  onToolsUpdated,
}) => {
  const { theme, isDark } = useAppTheme();
  const [markingPrinted, setMarkingPrinted] = useState(false);
  const [unmarkingPrinted, setUnmarkingPrinted] = useState(false);

  const totalSelected = selectedTools.length;
  const printedCount = useMemo(
    () => selectedTools.filter((t) => t.isPrinted).length,
    [selectedTools]
  );
  const unprintedCount = useMemo(
    () => selectedTools.filter((t) => !t.isPrinted).length,
    [selectedTools]
  );

  // Exact parity rules with Web StoreToolsPage.tsx lines 253-265:
  const canMarkAsPrinted =
    totalSelected > 0 && printedCount === 0 && unprintedCount === totalSelected;
  const canUnprint =
    totalSelected > 0 && unprintedCount === 0 && printedCount === totalSelected;
  const areAllSelectedPrinted =
    totalSelected > 0 && unprintedCount === 0 && printedCount === totalSelected;

  const hasRepairTool = useMemo(
    () => selectedTools.some((t) => (t.status || "").toLowerCase() === "repair"),
    [selectedTools]
  );
  const hasMovingTool = useMemo(
    () => selectedTools.some((t) => (t.status || "").toLowerCase() === "moving"),
    [selectedTools]
  );

  const handleMarkPrinted = async () => {
    if (isInspectionRestricted) {
      Alert.alert("Access Restricted", "Users with Inspection access cannot mark tools as printed.");
      return;
    }
    const ids = selectedTools.filter((t) => !t.isPrinted).map((t) => t._id);
    if (ids.length === 0) return;

    try {
      setMarkingPrinted(true);
      const res = await toolService.markToolsAsPrinted(ids);
      Alert.alert("Success", res.message || `Marked ${ids.length} tools as Printed.`);
      onToolsUpdated?.();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to mark as printed.");
    } finally {
      setMarkingPrinted(false);
    }
  };

  const handleUnmarkPrinted = async () => {
    if (isInspectionRestricted) {
      Alert.alert("Access Restricted", "Users with Inspection access cannot unmark tools as printed.");
      return;
    }
    const ids = selectedTools.filter((t) => t.isPrinted).map((t) => t._id);
    if (ids.length === 0) return;

    try {
      setUnmarkingPrinted(true);
      const res = await toolService.unmarkToolsAsPrinted(ids);
      Alert.alert("Success", res.message || `Unmarked ${ids.length} tools as Printed.`);
      onToolsUpdated?.();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to unmark as printed.");
    } finally {
      setUnmarkingPrinted(false);
    }
  };

  const handleActionClick = (actionId: BatchActionType) => {
    // 1. Quality Inspection
    if (actionId === "inspect") {
      if (hasRepairTool) {
        Alert.alert("Notice", "Inspection blocked: Selected tool(s) are already under Repair.");
        return;
      }
      if (hasMovingTool) {
        Alert.alert("Notice", "Inspection blocked: Selected tool(s) are currently Moving.");
        return;
      }
      onSelectAction("inspect");
      return;
    }

    // 2. Actions requiring all tools to be printed (Challan, Transfer, Scrap)
    if (["challan", "transfer", "scrap"].includes(actionId)) {
      if (hasRepairTool && (actionId === "transfer" || actionId === "scrap" || actionId === "challan")) {
        Alert.alert(
          "Action Blocked",
          `Cannot ${actionId === "scrap" ? "scrap" : actionId === "transfer" ? "transfer" : "create DC for"} tool(s) under Repair.`
        );
        return;
      }

      if (hasMovingTool && (actionId === "transfer" || actionId === "scrap" || actionId === "challan")) {
        const movingCount = selectedTools.filter(
          (t) => (t.status || "").toLowerCase() === "moving"
        ).length;
        Alert.alert(
          "Action Blocked",
          `Cannot ${
            actionId === "challan"
              ? "create Delivery Challan for"
              : actionId === "transfer"
              ? "transfer"
              : "scrap"
          } ${movingCount} selected tool(s) that are already Moving (dispatched on an active Delivery Challan). Tools must first be returned via a Return Challan (RC).`
        );
        return;
      }

      if (!areAllSelectedPrinted) {
        Alert.alert(
          "QR Label Required",
          `All selected equipment must be marked as Printed before ${
            actionId === "challan"
              ? "creating a Delivery Challan"
              : actionId === "transfer"
              ? "transferring stores"
              : "moving to scrap"
          }. Would you like to mark them as printed now?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Mark Printed & Proceed",
              onPress: async () => {
                await handleMarkPrinted();
                onSelectAction(actionId);
              },
            },
          ]
        );
        return;
      }
    }

    onSelectAction(actionId);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Selected Equipment Options">
      <ScrollView
        style={{ maxHeight: 540 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 6 }}
      >
        {/* Selected Summary Header Banner */}
        <View className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-3 mb-3 border border-indigo-100 dark:border-indigo-900/40">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="bg-indigo-600 px-2.5 py-0.5 rounded-full">
                <Text className="text-xs font-bold text-white">
                  {totalSelected} {totalSelected === 1 ? "Tool" : "Tools"} Selected
                </Text>
              </View>
              <Text className="text-[11px] font-medium text-indigo-900 dark:text-indigo-200">
                {areAllSelectedPrinted ? "✓ All Printed" : `${printedCount} Printed • ${unprintedCount} Not Printed`}
              </Text>
            </View>

            {onClearSelection && (
              <TouchableOpacity onPress={onClearSelection} className="py-0.5 px-1.5">
                <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Deselect All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Tools Preview Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 2 }}
          >
            {selectedTools.slice(0, 30).map((t) => (
              <View
                key={t._id}
                className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 flex-row items-center gap-2 border border-slate-200 dark:border-slate-800"
              >
                <Wrench size={12} color="#4F46E5" />
                <View>
                  <Text
                    className="text-xs font-bold text-slate-800 dark:text-slate-100"
                    numberOfLines={1}
                  >
                    {t.name || t.toolType || t.description || "Equipment"}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[10px] font-mono text-slate-500">
                      ID: {t.toolCode || t.toolId || t._id.substring(t._id.length - 6).toUpperCase()}
                    </Text>
                    <Text
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        t.isPrinted
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}
                    >
                      {t.isPrinted ? "Printed" : "Not Printed"}
                    </Text>
                  </View>
                </View>
                {onDeselectTool && (
                  <TouchableOpacity
                    onPress={() => onDeselectTool(t._id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    className="ml-1 p-0.5 rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                    <X size={10} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {selectedTools.length > 30 && (
              <View className="bg-indigo-100 dark:bg-indigo-950/80 rounded-xl px-3 py-2 justify-center border border-indigo-200 dark:border-indigo-900">
                <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  +{selectedTools.length - 30} more
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Print Status Actions (Web Parity: Mark as Printed / Unprint) */}
        {!isInspectionRestricted && (
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={markingPrinted || !canMarkAsPrinted}
              onPress={handleMarkPrinted}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-xl border ${
                canMarkAsPrinted
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-45"
              }`}
            >
              {markingPrinted ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Printer size={13} color={canMarkAsPrinted ? "#059669" : "#94A3B8"} />
              )}
              <Text
                className={`text-xs font-bold ${
                  canMarkAsPrinted ? "text-emerald-800 dark:text-emerald-300" : "text-slate-400"
                }`}
              >
                Mark as Printed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={unmarkingPrinted || !canUnprint}
              onPress={handleUnmarkPrinted}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-xl border ${
                canUnprint
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                  : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-45"
              }`}
            >
              {unmarkingPrinted ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <RotateCcw size={13} color={canUnprint ? "#D97706" : "#94A3B8"} />
              )}
              <Text
                className={`text-xs font-bold ${
                  canUnprint ? "text-amber-800 dark:text-amber-300" : "text-slate-400"
                }`}
              >
                Unprint ({printedCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Header */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 px-1">
          Equipment Operations
        </Text>

        {/* Operations List */}
        <View className="gap-2">
          {/* Subcontractor Delivery Challan (DC) */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleActionClick("challan")}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                areAllSelectedPrinted && !hasRepairTool && !hasMovingTool
                  ? "bg-white dark:bg-slate-800/80 border-emerald-200 dark:border-emerald-900/40"
                  : "bg-slate-50/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75"
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-emerald-50 dark:bg-emerald-950/50">
                  <Truck size={19} color="#10B981" strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      Subcontractor DC
                    </Text>
                    {hasMovingTool ? (
                      <View className="bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          Already Moving
                        </Text>
                      </View>
                    ) : !areAllSelectedPrinted ? (
                      <View className="bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                        <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                          Requires Printed
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {hasMovingTool
                      ? "Blocked: Selected tool(s) are already Moving on an active DC"
                      : "Generate Delivery Challan to external subcontractor or work front"}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Store-to-Store Equipment Transfer */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleActionClick("transfer")}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                areAllSelectedPrinted && !hasRepairTool && !hasMovingTool
                  ? "bg-white dark:bg-slate-800/80 border-indigo-100 dark:border-indigo-900/40"
                  : "bg-slate-50/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75"
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-indigo-50 dark:bg-indigo-950/50">
                  <ArrowRightLeft size={19} color="#4F46E5" strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      Store-to-Store Transfer
                    </Text>
                    {hasMovingTool ? (
                      <View className="bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          Already Moving
                        </Text>
                      </View>
                    ) : !areAllSelectedPrinted ? (
                      <View className="bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                        <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                          Requires Printed
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {hasMovingTool
                      ? "Blocked: Selected tool(s) are already Moving"
                      : "Transfer equipment to another store within the same project"}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Quality Inspection */}
          {canInspect && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleActionClick("inspect")}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                !hasRepairTool && !hasMovingTool
                  ? "bg-white dark:bg-slate-800/80 border-amber-200 dark:border-amber-900/40"
                  : "bg-slate-50/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-amber-50 dark:bg-amber-950/50">
                  <ClipboardCheck size={19} color="#D97706" strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">
                    Quality Inspection
                  </Text>
                  <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Perform safety checks, renew validation, or route to repair/scrap
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* QR Labels */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelectAction("qr")}
            className="flex-row items-center justify-between p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-800/80"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-blue-50 dark:bg-blue-950/50">
                <QrIcon size={19} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  Print QR Code Labels
                </Text>
                <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Generate printable QR tags and identification sheets
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Bulk Edit Details */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSelectAction("edit")}
              className="flex-row items-center justify-between p-3 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-slate-800/80"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-purple-50 dark:bg-purple-950/50">
                  <Edit3 size={19} color="#6366F1" strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">
                    Bulk Edit Details
                  </Text>
                  <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Update categories, validity periods, or custom fields
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Scrap / Decommission */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleActionClick("scrap")}
              className={`flex-row items-center justify-between p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 ${
                areAllSelectedPrinted && !hasRepairTool && !hasMovingTool
                  ? "bg-rose-50/50 dark:bg-rose-950/20"
                  : "bg-slate-50/80 dark:bg-slate-800/30 opacity-70"
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-rose-100 dark:bg-rose-950/60">
                  <Recycle size={19} color="#E11D48" strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-rose-700 dark:text-rose-400">
                      Scrap / Decommission
                    </Text>
                    {hasMovingTool ? (
                      <View className="bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          Already Moving
                        </Text>
                      </View>
                    ) : !areAllSelectedPrinted ? (
                      <View className="bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                        <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                          Requires Printed
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {hasMovingTool
                      ? "Blocked: Selected tool(s) are already Moving"
                      : "Mark tools as scrapped and transfer to Scrap Register"}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#E11D48" />
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Dismiss Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onClose}
          className="mt-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
        >
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};
