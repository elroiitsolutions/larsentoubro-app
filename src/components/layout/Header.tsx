import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between py-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3"
          >
            <ArrowLeft size={18} color="#475569" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View className="ml-3">{rightAction}</View>}
    </View>
  );
};
