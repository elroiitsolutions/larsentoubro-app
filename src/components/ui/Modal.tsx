import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        {/* Backdrop touch area to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Modal Dialog Content Card */}
        <View className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 z-10">
          {title && (
            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <Text
                className="text-base font-bold text-slate-900 dark:text-white flex-1 mr-2"
                numberOfLines={1}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {children}
        </View>
      </View>
    </RNModal>
  );
};
