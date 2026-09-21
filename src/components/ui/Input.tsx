import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  isPassword = false,
  leftIcon,
  rightIcon,
  containerClassName = "",
  className = "",
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(!isPassword);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center bg-white dark:bg-slate-900 border rounded-xl px-3.5 h-12 ${
          error
            ? "border-red-500 bg-red-50/20"
            : isFocused
            ? "border-indigo-600 border-2"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

        <TextInput
          className={`flex-1 text-sm text-slate-900 dark:text-white font-medium ${className}`}
          style={[{ flex: 1, height: "100%", paddingVertical: 0 }, style]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword((prev) => !prev)}
            className="p-1.5 -mr-1"
          >
            {showPassword ? (
              <EyeOff size={18} color="#64748B" />
            ) : (
              <Eye size={18} color="#64748B" />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View className="ml-2">{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text className="text-xs text-red-500 font-medium mt-1.5">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {hint}
        </Text>
      ) : null}
    </View>
  );
};
