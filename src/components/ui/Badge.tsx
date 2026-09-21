import React from "react";
import { View, Text } from "react-native";

interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "destructive" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "md",
  className = "",
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case "primary":
        return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300";
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300";
      case "destructive":
        return "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300";
      case "secondary":
      case "neutral":
      default:
        return "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return "px-2 py-0.5 text-[10px]";
      case "md":
      default:
        return "px-2.5 py-1 text-xs";
    }
  };

  return (
    <View
      className={`border rounded-full self-start flex-row items-center justify-center ${getBadgeStyle()} ${getSizeStyle()} ${className}`}
    >
      <Text className="font-semibold text-center">{label}</Text>
    </View>
  );
};
