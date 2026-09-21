import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ToolRecord } from "../types";
import { toolService } from "../services/toolService";

interface ToolFormModalProps {
  visible: boolean;
  onClose: () => void;
  tool?: ToolRecord | null;
  storeId?: string;
  onSuccess: () => void;
}

export const ToolFormModal: React.FC<ToolFormModalProps> = ({
  visible,
  onClose,
  tool,
  storeId,
  onSuccess,
}) => {
  const isEditing = !!tool;

  const [name, setName] = useState("");
  const [toolCode, setToolCode] = useState("");
  const [category, setCategory] = useState("General");
  const [toolType, setToolType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [safeWorkingLoad, setSafeWorkingLoad] = useState("");
  const [makeYear, setMakeYear] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState("Available");
  const [purchaserName, setPurchaserName] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tool) {
      setName(tool.name || tool.description || "");
      setToolCode(tool.toolCode || tool.toolId || "");
      setCategory(tool.category || "General");
      setToolType(tool.toolType || "");
      setCapacity(tool.capacity || "");
      setSafeWorkingLoad(tool.safeWorkingLoad || "");
      setMakeYear(tool.makeYear || "");
      setSerialNumber(tool.serialNumber || "");
      setStatus(tool.status || "Available");
      setPurchaserName(tool.purchaserName || "");
      setSupplierCode(tool.supplierCode || "");
      setRemarks(tool.remarks || "");
    } else {
      setName("");
      setToolCode("");
      setCategory("General");
      setToolType("");
      setCapacity("");
      setSafeWorkingLoad("");
      setMakeYear("");
      setSerialNumber("");
      setStatus("Available");
      setPurchaserName("");
      setSupplierCode("");
      setRemarks("");
    }
  }, [tool, visible]);

  const statuses = [
    "Available",
    "In Use",
    "Issued",
    "Moving",
    "Maintenance",
    "Damaged",
    "Expired",
  ];

  const categories = [
    "General",
    "Lifting & Rigging",
    "Power Tools",
    "Hydraulic",
    "Measuring & Testing",
    "Safety Equipment",
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Tool name/description is required.");
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<ToolRecord> = {
        name: name.trim(),
        description: name.trim(),
        toolCode: toolCode.trim() || undefined,
        category,
        toolType: toolType.trim() || undefined,
        capacity: capacity.trim() || undefined,
        safeWorkingLoad: safeWorkingLoad.trim() || undefined,
        makeYear: makeYear.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        status,
        purchaserName: purchaserName.trim() || undefined,
        supplierCode: supplierCode.trim() || undefined,
        remarks: remarks.trim() || undefined,
        storeId: storeId || tool?.storeId,
      };

      if (isEditing && tool?._id) {
        await toolService.updateTool(tool._id, payload);
        Alert.alert("Success", "Tool updated successfully!");
      } else {
        const targetStoreId = storeId || tool?.storeId || "default";
        await toolService.createTool(targetStoreId, payload);
        Alert.alert("Success", "Tool registered successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Registration Failed",
        err?.response?.data?.message || err?.message || "Failed to save tool"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Edit Tool" : "Add Tool to Store"}
    >
      <ScrollView className="max-h-[480px]" showsVerticalScrollIndicator={false}>
        <Input
          label="Tool Description / Name *"
          placeholder="e.g. Hydraulic Jack 50T"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Tool Code / ID"
              placeholder="e.g. HYD-50T-01"
              value={toolCode}
              onChangeText={setToolCode}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Serial Number"
              placeholder="e.g. SN-89412"
              value={serialNumber}
              onChangeText={setSerialNumber}
              editable={!loading}
            />
          </View>
        </View>

        {/* Category Picker */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Tool Category
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Capacity"
              placeholder="e.g. 50 Ton"
              value={capacity}
              onChangeText={setCapacity}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Safe Working Load"
              placeholder="e.g. SWL 45T"
              value={safeWorkingLoad}
              onChangeText={setSafeWorkingLoad}
              editable={!loading}
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Make Year"
              placeholder="e.g. 2024"
              value={makeYear}
              onChangeText={setMakeYear}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Supplier Code"
              placeholder="e.g. SUP-002"
              value={supplierCode}
              onChangeText={setSupplierCode}
              editable={!loading}
            />
          </View>
        </View>

        {/* Status Selection */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Operational Status
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {statuses.map((st) => {
              const isSelected = status === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setStatus(st)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label="Purchaser Name"
          placeholder="e.g. L&T Heavy Civil Inf."
          value={purchaserName}
          onChangeText={setPurchaserName}
          editable={!loading}
        />

        <Input
          label="Remarks / Notes"
          placeholder="Additional maintenance or calibration notes"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={2}
          editable={!loading}
        />
      </ScrollView>

      <View className="flex-row gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} />
        </View>
        <View className="flex-1">
          <Button
            title={isEditing ? "Save Changes" : "Register Tool"}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
};
