import React from "react";
import { View, Text } from "react-native";
import { Inbox } from "lucide-react-native";
import { Button } from "./Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Data Found",
  description = "There are no records to display at this time.",
  icon,
  actionTitle,
  onAction,
}) => {
  return (
    <View className="items-center justify-center p-8">
      <View className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
        {icon || <Inbox size={32} color="#94A3B8" />}
      </View>
      <Text className="text-base font-bold text-slate-800 dark:text-slate-200 text-center mb-1">
        {title}
      </Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs mb-5">
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          size="sm"
          fullWidth={false}
        />
      )}
    </View>
  );
};
