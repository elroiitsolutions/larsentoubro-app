import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "destructive" | "neutral";
  size?: "sm" | "md";
  className?: string;
  textClassName?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "md",
  className = "",
  textClassName = "",
}) => {
  const { isDark } = useAppTheme();

  const getContainerStyle = () => {
    switch (variant) {
      case "primary":
        return isDark
          ? "bg-blue-950/70 border-blue-600/70"
          : "bg-blue-50 border-blue-200";
      case "success":
        return isDark
          ? "bg-emerald-950/80 border-emerald-600/80"
          : "bg-emerald-50 border-emerald-200";
      case "warning":
        return isDark
          ? "bg-amber-950/80 border-amber-600/80"
          : "bg-amber-50 border-amber-200";
      case "destructive":
        return isDark
          ? "bg-red-950/40 border-red-900/40"
          : "bg-red-50 border-red-200";
      case "secondary":
      case "neutral":
      default:
        return isDark
          ? "bg-[#262626] border-[#383838]"
          : "bg-slate-100 border-slate-200";
    }
  };

  const getTextColor = () => {
    if (isDark) {
      return "#FFFFFF";
    }
    switch (variant) {
      case "primary":
        return "#1D4ED8";
      case "success":
        return "#047857";
      case "warning":
        return "#B45309";
      case "destructive":
        return "#B91C1C";
      case "secondary":
      case "neutral":
      default:
        return "#334155";
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return "px-2 py-0.5";
      case "md":
      default:
        return "px-2.5 py-1";
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case "sm":
        return "text-[10px]";
      case "md":
      default:
        return "text-xs";
    }
  };

  return (
    <View
      className={`border rounded-full self-start flex-row items-center justify-center ${getContainerStyle()} ${getSizeStyle()} ${className}`}
    >
      <Text
        style={{ color: getTextColor() }}
        className={`font-semibold text-center ${getTextSizeStyle()} ${textClassName}`}
      >
        {label}
      </Text>
    </View>
  );
};

