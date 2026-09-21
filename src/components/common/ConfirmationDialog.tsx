import React from "react";
import { View, Text } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react-native";

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <View className="items-center py-2">
        {destructive && (
          <View className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 items-center justify-center mb-3">
            <AlertTriangle size={24} color="#EF4444" />
          </View>
        )}
        <Text className="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed mb-6">
          {message}
        </Text>

        <View className="flex-row gap-3 w-full">
          <View className="flex-1">
            <Button
              title={cancelText}
              variant="outline"
              onPress={onCancel}
              disabled={loading}
            />
          </View>
          <View className="flex-1">
            <Button
              title={confirmText}
              variant={destructive ? "destructive" : "primary"}
              onPress={onConfirm}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
