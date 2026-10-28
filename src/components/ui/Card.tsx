import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className = "",
  children,
  style,
  ...props
}) => {
  return (
    <View
      className={`bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-[#2E2E33] rounded-2xl p-4 shadow-sm ${className}`}
      style={style}
      {...props}
    >
      {children}
    </View>

  );
};
