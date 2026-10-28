import React from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Search, X } from "lucide-react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  loading?: boolean;
  className?: string;
  style?: any;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  loading = false,
  className = "",
  style,
}) => {
  return (
    <View
      style={style}
      className={`flex-row items-center bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 h-11 ${className}`}
    >
      <Search size={18} color="#94A3B8" className="mr-2.5" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="flex-1 text-sm text-slate-900 dark:text-white font-medium h-full"
      />
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 6 }} />
      ) : value.length > 0 ? (
        <TouchableOpacity
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          className="p-1 rounded-full bg-slate-100 dark:bg-[#262626]"
        >
          <X size={14} color="#64748B" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

