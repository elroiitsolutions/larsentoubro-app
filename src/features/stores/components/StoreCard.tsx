import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import {
  Store,
  MapPin,
  Wrench,
  ChevronRight,
  Edit2,
  Trash2,
  Building2,
} from "lucide-react-native";
import { StoreRecord } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface StoreCardProps {
  store: StoreRecord;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onPress,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const { theme, isDark } = useAppTheme();

  const isHub = store.type === "HUB";
  const accentColor = isHub ? "#4F46E5" : "#059669";
  const availableTools =
    (store.availableToolsCount !== undefined && store.availableToolsCount > 0)
      ? store.availableToolsCount
      : (store.toolsCount || store.totalToolsCount || store.availableToolsCount || 0);

  return (
    <View
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#E2E8F0",
        position: "relative",
        overflow: "hidden",
        ...Platform.select({
          web: { boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.06)" },
          default: { elevation: 2 },
        }),
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ padding: 15 }}
      >
        {/* Header Row: Facility Icon & Name */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isHub
                ? isDark
                  ? "rgba(79, 70, 229, 0.2)"
                  : "#EEF2FF"
                : isDark
                ? "rgba(5, 150, 105, 0.2)"
                : "#ECFDF5",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              borderWidth: 1,
              borderColor: isHub
                ? isDark
                  ? "#3730A3"
                  : "#C7D2FE"
                : isDark
                ? "#065F46"
                : "#A7F3D0",
            }}
          >
            {isHub ? (
              <Building2 size={20} color={accentColor} />
            ) : (
              <Store size={20} color={accentColor} />
            )}
          </View>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: theme.text,
              letterSpacing: -0.3,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {store.name}
          </Text>
        </View>

        {/* Structured Meta Box: Location & Available Tools */}
        <View
          style={{
            backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8F0",
            gap: 8,
          }}
        >
          {/* Location */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MapPin size={14} color="#64748B" />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: isDark ? "#CBD5E1" : "#475569",
              }}
              numberOfLines={1}
            >
              {store.location || "Facility Yard"}
            </Text>
          </View>

          {/* Available Tools */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Wrench size={13} color={accentColor} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              {availableTools} Available Tools
            </Text>
          </View>
        </View>

        {/* Footer: Explore Link & Actions */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: -0.1,
              }}
            >
              View Inventory Catalog
            </Text>
            <ChevronRight size={14} color={theme.primary} strokeWidth={2.5} />
          </View>

          {canManage && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {onEdit && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  }}
                  accessibilityLabel="Edit Store"
                >
                  <Edit2 size={13} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEE2E2",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "#7F1D1D" : "#FECACA",
                  }}
                  accessibilityLabel="Delete Store"
                >
                  <Trash2 size={13} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default StoreCard;
