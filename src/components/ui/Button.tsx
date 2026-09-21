import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  fullWidth = true,
  className = "",
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getVariantStyle = () => {
    switch (variant) {
      case "secondary":
        return "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
      case "outline":
        return "bg-transparent border border-slate-300 dark:border-slate-700";
      case "ghost":
        return "bg-transparent border-transparent";
      case "destructive":
        return "bg-red-600 border-red-600";
      case "primary":
      default:
        return "bg-indigo-600 border-indigo-600";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "secondary":
        return "text-slate-900 dark:text-slate-100 font-semibold";
      case "outline":
        return "text-slate-800 dark:text-slate-200 font-semibold";
      case "ghost":
        return "text-indigo-600 dark:text-indigo-400 font-semibold";
      case "destructive":
      case "primary":
      default:
        return "text-white font-semibold";
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return "py-2 px-3 rounded-lg text-xs";
      case "lg":
        return "py-4 px-6 rounded-2xl text-base";
      case "md":
      default:
        return "py-3 px-4 rounded-xl text-sm";
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      delayPressIn={0}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${getSizeStyle()} ${getVariantStyle()} ${
        fullWidth ? "w-full" : ""
      } ${isDisabled ? "opacity-60" : ""} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" || variant === "outline" ? "#4F46E5" : "#FFFFFF"}
        />
      ) : (
        <View pointerEvents="none" className="flex-row items-center justify-center gap-2">
          {icon && iconPosition === "left" && icon}
          <Text className={`text-center ${getTextColor()}`}>{title}</Text>
          {icon && iconPosition === "right" && icon}
        </View>
      )}
    </TouchableOpacity>
  );
};
