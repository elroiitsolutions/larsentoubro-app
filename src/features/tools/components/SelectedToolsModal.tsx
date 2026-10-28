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
  isAdmin?: boolean;
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
  isAdmin = false,
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

  // Exact Web Parity from StoreToolsPage.tsx:
  // "Mark as Printed" is only clickable if ALL selected tools are NOT printed (0 are printed)
  const canMarkAsPrinted = totalSelected > 0 && printedCount === 0 && unprintedCount === totalSelected;

  // "Unprint" is only clickable if ALL selected tools are PRINTED (0 are unprinted)
  const canUnprint = totalSelected > 0 && unprintedCount === 0 && printedCount === totalSelected;

  // Subcontractor DC, Transfer, and Scrap flows require ALL selected tools to be marked as Printed
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
  const hasMissingTool = useMemo(
    () => selectedTools.some((t) => (t.status || "").toLowerCase() === "missing"),
    [selectedTools]
  );

  const isToolDeletable = (status?: string): boolean => {
    const s = (status || "").trim().toLowerCase();
    return s === "available" || s === "missing";
  };

  const hasNonDeletableTool = useMemo(
    () => selectedTools.some((t) => !isToolDeletable(t.status)),
    [selectedTools]
  );

  // Primary Sub Contractor / Delivery Challan Button State (Exact Web Parity)
  const challanState = useMemo(() => {
    if (hasMovingTool) {
      return {
        label: "Already Moving",
        disabled: true,
        reason: "Cannot create Delivery Challan: Selected tool(s) are already Moving",
      };
    }
    if (hasMissingTool) {
      return {
        label: "Tool is Missing",
        disabled: true,
        reason: "Cannot create Delivery Challan: Selected tool(s) are marked as Missing",
      };
    }
    if (hasRepairTool) {
      return {
        label: "Tool Under Repair",
        disabled: true,
        reason: "Cannot create Delivery Challan: Selected tool(s) are under Repair",
      };
    }
    if (!areAllSelectedPrinted) {
      return {
        label: "Sub Contractor",
        disabled: true,
        reason: "Disabled: All selected tools must be marked as Printed before creating a Delivery Challan",
      };
    }
    return {
      label: "Sub Contractor",
      disabled: false,
      reason: "",
    };
  }, [hasMovingTool, hasMissingTool, hasRepairTool, areAllSelectedPrinted]);

  // Quality Inspection State (Exact Web Parity)
  const inspectDisabled = hasRepairTool || hasMovingTool;
  const inspectReason = hasRepairTool
    ? "Inspection blocked: Selected tool(s) are already under Repair"
    : hasMovingTool
    ? "Inspection blocked: Selected tool(s) are currently Moving"
    : "";

  // Transfer State (Exact Web Parity)
  const transferDisabled = !areAllSelectedPrinted || hasRepairTool || hasMovingTool;
  const transferReason = hasMovingTool
    ? "Disabled: Selected tool(s) are currently Moving on a Delivery Challan"
    : hasRepairTool
    ? "Disabled: Selected tool(s) are under Repair and cannot be transferred"
    : !areAllSelectedPrinted
    ? "Disabled: All selected tools must be marked as Printed before performing an inter-store Transfer"
    : "";

  // Scrap State (Exact Web Parity)
  const scrapDisabled = !areAllSelectedPrinted || hasRepairTool || hasMovingTool;
  const scrapReason = hasMovingTool
    ? "Disabled: Selected tool(s) are currently Moving and cannot be moved to Scrap"
    : hasRepairTool
    ? "Disabled: Selected tool(s) are already under Repair and cannot be moved to Scrap"
    : !areAllSelectedPrinted
    ? "Disabled: All selected tools must be marked as Printed before moving to Scrap"
    : "";

  // Mark Printed Reason
  const markPrintedReason =
    printedCount > 0 && unprintedCount > 0
      ? "Disabled: Selection contains mixed printed and not printed tools"
      : printedCount > 0
      ? "Disabled: All selected tools are already printed"
      : "Select not printed tools to mark as printed";

  // Unprint Reason
  const unprintReason =
    printedCount > 0 && unprintedCount > 0
      ? "Disabled: Selection contains mixed printed and not printed tools"
      : unprintedCount > 0
      ? "Disabled: Selected tools are already not printed"
      : "Select printed tools to unprint";

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
    if (!canMarkAsPrinted) {
      Alert.alert("Action Blocked", markPrintedReason);
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
    if (!canUnprint) {
      Alert.alert("Action Blocked", unprintReason);
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
    if (!isAdmin) {
      Alert.alert("Access Restricted", "Only administrators can delete equipment.");
      return;
    }
    if (hasNonDeletableTool) {
      Alert.alert(
        "Action Blocked",
        "Disabled: Selected tool(s) include Moving or non-deletable equipment. Only Available and Missing tools can be deleted."
      );
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
    // 1. Delivery Challan
    if (actionId === "challan") {
      if (challanState.disabled) {
        Alert.alert("Action Blocked", challanState.reason);
        return;
      }
      onSelectAction("challan");
      return;
    }

    // 2. Quality Inspection
    if (actionId === "inspect") {
      if (inspectDisabled) {
        Alert.alert("Action Blocked", inspectReason);
        return;
      }
      onSelectAction("inspect");
      return;
    }

    // 3. Transfer
    if (actionId === "transfer") {
      if (transferDisabled) {
        Alert.alert("Action Blocked", transferReason);
        return;
      }
      onSelectAction("transfer");
      return;
    }

    // 4. Scrap
    if (actionId === "scrap") {
      if (scrapDisabled) {
        Alert.alert("Action Blocked", scrapReason);
        return;
      }
      onSelectAction("scrap");
      return;
    }

    onSelectAction(actionId);
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        {/* Header matching Web */}
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

        {/* Buttons List matching Web Parity */}
        <View className="gap-2.5">
          {hasMovingTool ? (
            <View className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Truck size={16} color="#D97706" />
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Already Moving
                </Text>
              </View>
              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                Selected tool(s) are currently Moving on a Delivery Challan. No actions are available until returned via Return Challan (RC).
              </Text>
            </View>
          ) : hasMissingTool ? (
            <View className="gap-2.5">
              <View className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center">
                <Text className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                  Selected tool(s) are marked as Missing
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Only deletion is available for missing equipment.
                </Text>
              </View>

              {isAdmin && (
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
          ) : (
            <>
              {/* 1. Sub Contractor / Delivery Challan (Hidden for Inspection-Restricted Users) */}
              {!isInspectionRestricted && (
                <TouchableOpacity
                  activeOpacity={challanState.disabled ? 0.9 : 0.8}
                  onPress={() => handleActionClick("challan")}
                  className={`w-full h-12 rounded-2xl flex-row items-center justify-center gap-2.5 shadow-sm ${
                    challanState.disabled
                      ? "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 opacity-70"
                      : ""
                  }`}
                  style={
                    !challanState.disabled
                      ? { backgroundColor: "#3742FA" }
                      : undefined
                  }
                >
                  <Truck
                    size={18}
                    color={challanState.disabled ? "#94A3B8" : "#FFFFFF"}
                    strokeWidth={2.2}
                  />
                  <Text
                    className={`text-sm font-bold ${
                      challanState.disabled
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-white"
                    }`}
                  >
                    {challanState.label}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 2. Quality Inspection (Authorized users only: canInspect) */}
              {canInspect && (
                <TouchableOpacity
                  activeOpacity={inspectDisabled ? 0.9 : 0.8}
                  onPress={() => handleActionClick("inspect")}
                  className={`w-full h-12 rounded-2xl flex-row items-center justify-center gap-2.5 shadow-sm ${
                    inspectDisabled
                      ? "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 opacity-60"
                      : ""
                  }`}
                  style={
                    !inspectDisabled
                      ? { backgroundColor: "#00796B" }
                      : undefined
                  }
                >
                  <ClipboardCheck
                    size={18}
                    color={inspectDisabled ? "#94A3B8" : "#FFFFFF"}
                    strokeWidth={2.2}
                  />
                  <Text
                    className={`text-sm font-bold ${
                      inspectDisabled
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-white"
                    }`}
                  >
                    Quality Inspection ({totalSelected})
                  </Text>
                </TouchableOpacity>
              )}

              {/* Grid of Action Buttons (Hidden for Inspection Users, Visible for Admin & Regular Users) */}
              {(!isInspectionRestricted || isAdmin) && (
                <>
                  {/* Row: Mark as Printed & Unprint */}
                  {!isInspectionRestricted && (
                    <View className="flex-row items-center gap-2.5">
                      {/* 3. Mark as Printed */}
                      <TouchableOpacity
                        activeOpacity={!canMarkAsPrinted ? 0.9 : 0.7}
                        onPress={handleMarkPrinted}
                        className={`flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border px-2 ${
                          canMarkAsPrinted
                            ? "border-emerald-500 bg-white dark:bg-slate-900"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-50"
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
                        activeOpacity={!canUnprint ? 0.9 : 0.7}
                        onPress={handleUnmarkPrinted}
                        className={`flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 border px-2 ${
                          canUnprint
                            ? "border-amber-400 dark:border-amber-500 bg-white dark:bg-slate-900"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-50"
                        }`}
                      >
                        {unmarkingPrinted ? (
                          <ActivityIndicator size="small" color="#D97706" />
                        ) : (
                          <RotateCcw
                            size={15}
                            color={canUnprint ? "#D97706" : "#94A3B8"}
                            strokeWidth={2}
                          />
                        )}
                        <Text
                          numberOfLines={1}
                          className={`text-xs font-semibold ${
                            canUnprint
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          Unprint ({totalSelected})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Row: Transfer & Bulk Edit (or Transfer alone if not admin) */}
                  <View className="flex-row items-center gap-2.5">
                    {/* 5. Transfer (Hidden for Inspection-Restricted Users) */}
                    {!isInspectionRestricted && (
                      <TouchableOpacity
                        activeOpacity={transferDisabled ? 0.9 : 0.7}
                        onPress={() => handleActionClick("transfer")}
                        className={`${isAdmin ? "flex-1" : "w-full"} h-11 rounded-xl flex-row items-center justify-center gap-1.5 border px-2 ${
                          !transferDisabled
                            ? "border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-50"
                        }`}
                      >
                        <ArrowRightLeft
                          size={15}
                          color={!transferDisabled ? "#4F46E5" : "#94A3B8"}
                          strokeWidth={2}
                        />
                        <Text
                          numberOfLines={1}
                          className={`text-xs font-semibold ${
                            !transferDisabled
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          Transfer ({totalSelected})
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* 6. Bulk Edit (Admin Only) */}
                    {isAdmin && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onSelectAction("edit")}
                        className={`${!isInspectionRestricted ? "flex-1" : "w-full"} h-11 rounded-xl flex-row items-center justify-center gap-1.5 border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2`}
                      >
                        <Edit3 size={15} color="#4F46E5" strokeWidth={2} />
                        <Text
                          numberOfLines={1}
                          className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Bulk Edit ({totalSelected})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 7. Scrap Selected (Hidden for Inspection-Restricted Users) */}
                  {!isInspectionRestricted && (
                    <TouchableOpacity
                      activeOpacity={scrapDisabled ? 0.9 : 0.7}
                      onPress={() => handleActionClick("scrap")}
                      className={`w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 border ${
                        !scrapDisabled
                          ? "border-amber-400 dark:border-amber-500 bg-white dark:bg-slate-900"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-50"
                      }`}
                    >
                      <Archive
                        size={16}
                        color={!scrapDisabled ? "#D97706" : "#94A3B8"}
                        strokeWidth={2}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          !scrapDisabled
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        Scrap Selected ({totalSelected})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 8. Delete Selected (Admin Only) */}
                  {isAdmin && (
                    <TouchableOpacity
                      activeOpacity={hasNonDeletableTool ? 0.9 : 0.7}
                      onPress={handleDeleteClick}
                      className={`w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 border ${
                        hasNonDeletableTool
                          ? "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#1E1E1E] opacity-40"
                          : "border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20"
                      }`}
                    >
                      <Trash2
                        size={16}
                        color={hasNonDeletableTool ? "#94A3B8" : "#E11D48"}
                        strokeWidth={2}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          hasNonDeletableTool
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        Delete Selected ({totalSelected})
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};
