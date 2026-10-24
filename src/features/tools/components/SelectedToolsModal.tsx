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
  ClipboardCheck,
  Edit3,
  Printer,
  RotateCcw,
  Archive,
  Trash2,
  X,
  ChevronDown,
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
  | "scrap"
  | "delete";

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

  const canMarkAsPrinted = totalSelected > 0 && unprintedCount > 0;
  const canUnprint = totalSelected > 0 && printedCount > 0;
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

  const executeMarkPrinted = async (ids: string[]) => {
    onClose();
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

  const handleMarkPrinted = () => {
    if (isInspectionRestricted) {
      Alert.alert("Access Restricted", "Users with Inspection access cannot mark tools as printed.");
      return;
    }
    const ids = selectedTools.filter((t) => !t.isPrinted).map((t) => t._id);
    if (ids.length === 0) return;

    Alert.alert(
      "Confirm Mark as Printed",
      `Are you sure you want to mark ${ids.length} selected equipment as Printed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Printed",
          onPress: () => executeMarkPrinted(ids),
        },
      ]
    );
  };

  const executeUnmarkPrinted = async (ids: string[]) => {
    onClose();
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

  const handleUnmarkPrinted = () => {
    if (isInspectionRestricted) {
      Alert.alert("Access Restricted", "Users with Inspection access cannot unmark tools as printed.");
      return;
    }
    const ids = selectedTools.filter((t) => t.isPrinted).map((t) => t._id);
    if (ids.length === 0) return;

    Alert.alert(
      "Confirm Unprint",
      `Are you sure you want to revert ${ids.length} selected equipment status from printed to unprinted?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unprint",
          style: "destructive",
          onPress: () => executeUnmarkPrinted(ids),
        },
      ]
    );
  };

  const handleDeleteClick = () => {
    if (isInspectionRestricted) {
      Alert.alert("Access Restricted", "Users with Inspection access cannot delete equipment.");
      return;
    }
    Alert.alert(
      "Delete Selected Equipment",
      `Are you sure you want to move ${totalSelected} selected equipment to Trash?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onSelectAction("delete"),
        },
      ]
    );
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
                const unprintedIds = selectedTools.filter((t) => !t.isPrinted).map((t) => t._id);
                if (unprintedIds.length > 0) {
                  await executeMarkPrinted(unprintedIds);
                }
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
    <Modal visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        {/* Header matching Image 2 */}
        <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center gap-2.5 min-w-0 flex-1">
            {/* Circular badge with count */}
            <View className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/70 items-center justify-center shrink-0">
              <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {totalSelected}
              </Text>
            </View>

            <View className="min-w-0 flex-1">
              <Text
                className="text-sm font-bold text-slate-900 dark:text-white"
                numberOfLines={1}
              >
                Selected Tools: {totalSelected}
              </Text>
              <Text
                className="text-xs text-slate-500 dark:text-slate-400"
                numberOfLines={1}
              >
                Custom inventory selection
              </Text>
            </View>
          </View>

          {/* Right Header Controls: Clear & Collapse */}
          <View className="flex-row items-center gap-1 shrink-0 ml-2">
            {onClearSelection && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClearSelection}
                className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg active:bg-slate-100 dark:active:bg-slate-800"
              >
                <X size={14} color="#64748B" />
                <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Clear
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="p-1.5 rounded-lg active:bg-slate-100 dark:active:bg-slate-800"
            >
              <ChevronDown size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Buttons List matching Image 2 */}
        <View className="gap-2.5">
          {/* 1. Sub Contractor - Solid royal blue button */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleActionClick("challan")}
              className={`w-full h-12 rounded-2xl flex-row items-center justify-center gap-2.5 shadow-sm ${
                hasMovingTool ? "bg-slate-200 dark:bg-slate-800" : ""
              }`}
              style={
                !hasMovingTool
                  ? { backgroundColor: "#3742FA" }
                  : undefined
              }
            >
              <Truck
                size={18}
                color={hasMovingTool ? "#94A3B8" : "#FFFFFF"}
                strokeWidth={2.2}
              />
              <Text
                className={`text-sm font-bold ${
                  hasMovingTool
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-white"
                }`}
              >
                {hasMovingTool ? "Already Moving" : "Sub Contractor"}
              </Text>
            </TouchableOpacity>
          )}

          {/* 2. Quality Inspection - Solid dark teal button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleActionClick("inspect")}
            className="w-full h-12 rounded-2xl flex-row items-center justify-center gap-2.5 shadow-sm"
            style={{ backgroundColor: "#00796B" }}
          >
            <ClipboardCheck size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text className="text-sm font-bold text-white">
              Quality Inspection ({totalSelected})
            </Text>
          </TouchableOpacity>

          {/* Row: Mark as Printed & Unprint */}
          {!isInspectionRestricted && (
            <View className="flex-row items-center gap-2.5">
              {/* 3. Mark as Printed */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={markingPrinted || !canMarkAsPrinted}
                onPress={handleMarkPrinted}
                className={`flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border px-2 ${
                  canMarkAsPrinted
                    ? "border-emerald-500 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60"
                }`}
              >
                {markingPrinted ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Printer
                    size={15}
                    color={canMarkAsPrinted ? "#059669" : "#94A3B8"}
                    strokeWidth={2}
                  />
                )}
                <Text
                  numberOfLines={1}
                  className={`text-xs font-semibold ${
                    canMarkAsPrinted
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  Mark as Printed ({totalSelected})
                </Text>
              </TouchableOpacity>

              {/* 4. Unprint */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={unmarkingPrinted || !canUnprint}
                onPress={handleUnmarkPrinted}
                className={`flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border px-2 border-amber-400 dark:border-amber-500 bg-white dark:bg-slate-900 ${
                  !canUnprint ? "opacity-60" : ""
                }`}
              >
                {unmarkingPrinted ? (
                  <ActivityIndicator size="small" color="#D97706" />
                ) : (
                  <RotateCcw size={15} color="#D97706" strokeWidth={2} />
                )}
                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400"
                >
                  Unprint ({totalSelected})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Row: Transfer & Bulk Edit */}
          {!isInspectionRestricted && (
            <View className="flex-row items-center gap-2.5">
              {/* 5. Transfer */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleActionClick("transfer")}
                className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 px-2"
              >
                <ArrowRightLeft size={15} color="#4F46E5" strokeWidth={2} />
                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  Transfer ({totalSelected})
                </Text>
              </TouchableOpacity>

              {/* 6. Bulk Edit */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onSelectAction("edit")}
                className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
              >
                <Edit3 size={15} color="#4F46E5" strokeWidth={2} />
                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Bulk Edit ({totalSelected})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 7. Scrap Selected - Amber outline button */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleActionClick("scrap")}
              className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 border border-amber-400 dark:border-amber-500 bg-white dark:bg-slate-900"
            >
              <Archive size={16} color="#D97706" strokeWidth={2} />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Scrap Selected ({totalSelected})
              </Text>
            </TouchableOpacity>
          )}

          {/* 8. Delete Selected - Rose outline button */}
          {!isInspectionRestricted && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteClick}
              className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 border border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20"
            >
              <Trash2 size={16} color="#E11D48" strokeWidth={2} />
              <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Delete Selected ({totalSelected})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};
