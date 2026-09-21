import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { dashboardService } from "../services/dashboardService";

interface ToolLifeExtensionModalProps {
  visible: boolean;
  onClose: () => void;
  toolId: string;
  onSuccess?: () => void;
}

export const ToolLifeExtensionModal: React.FC<ToolLifeExtensionModalProps> = ({
  visible,
  onClose,
  toolId,
  onSuccess,
}) => {
  const [inspectorName, setInspectorName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [extensionYears, setExtensionYears] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inspectorName.trim()) {
      Alert.alert("Validation Error", "Please enter the inspector name.");
      return;
    }

    setLoading(true);
    try {
      await dashboardService.extendToolLife(toolId, {
        extensionYears,
        inspectorName,
        remarks,
      });
      Alert.alert("Success", "Tool life extension submitted successfully.");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert(
        "Extension Failed",
        err?.response?.data?.message || err.message || "Failed to extend tool life"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Tool Life Extension">
      <View className="mb-2">
        <Text className="text-xs text-slate-500 mb-4">
          Approve inspection and extend validity for tool <Text className="font-bold text-slate-800">{toolId}</Text>.
        </Text>

        <Input
          label="Inspector Name"
          placeholder="e.g. John Doe"
          value={inspectorName}
          onChangeText={setInspectorName}
          editable={!loading}
        />

        <Input
          label="Remarks / Notes"
          placeholder="e.g. Calibrated and tested on site"
          value={remarks}
          onChangeText={setRemarks}
          editable={!loading}
        />

        <Text className="text-xs font-semibold text-slate-700 uppercase mb-2">
          Extension Duration
        </Text>
        <View className="flex-row gap-2 mb-6">
          <View className="flex-1">
            <Button
              title="1 Year"
              variant={extensionYears === 1 ? "primary" : "outline"}
              size="sm"
              onPress={() => setExtensionYears(1)}
            />
          </View>
          <View className="flex-1">
            <Button
              title="2 Years"
              variant={extensionYears === 2 ? "primary" : "outline"}
              size="sm"
              onPress={() => setExtensionYears(2)}
            />
          </View>
        </View>

        <View className="flex-row gap-2 pt-2 border-t border-slate-100">
          <View className="flex-1">
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} />
          </View>
          <View className="flex-1">
            <Button title="Approve Extension" onPress={handleSubmit} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
};
