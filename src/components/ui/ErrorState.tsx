import React from "react";
import { View, Text } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "An error occurred while loading data. Please try again.",
  onRetry,
}) => {
  return (
    <View className="items-center justify-center p-8">
      <View className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 items-center justify-center mb-4">
        <AlertCircle size={32} color="#EF4444" />
      </View>
      <Text className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
        {title}
      </Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs mb-5">
        {message}
      </Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
          icon={<RefreshCw size={14} color="#4F46E5" />}
          fullWidth={false}
        />
      )}
    </View>
  );
};
