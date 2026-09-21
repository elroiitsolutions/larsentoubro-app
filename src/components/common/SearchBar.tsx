import React from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Search, X } from "lucide-react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  style?: any;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  className = "",
  style,
}) => {
  return (
    <View
      style={style}
      className={`flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-11 ${className}`}
    >
      <Search size={18} color="#94A3B8" className="mr-2.5" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="flex-1 text-sm text-slate-900 dark:text-white font-medium h-full"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          className="p-1 rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <X size={14} color="#64748B" />
        </TouchableOpacity>
      )}
    </View>
  );
};
