import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  message = "Loading...",
  fullScreen = false,
}) => {
  return (
    <View
      className={`items-center justify-center p-6 ${
        fullScreen ? "flex-1 bg-slate-50 dark:bg-slate-950" : ""
      }`}
    >
      <View className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm items-center justify-center border border-slate-100 dark:border-slate-800">
        <ActivityIndicator size="large" color="#4F46E5" />
        {message && (
          <Text className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-3 text-center">
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};
