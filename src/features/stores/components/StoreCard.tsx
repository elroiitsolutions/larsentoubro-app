import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import {
  Store,
  MapPin,
  User,
  Phone,
  Wrench,
  ChevronRight,
  Edit2,
  Trash2,
  Building2,
  PackageCheck,
  Truck,
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
  const total = store.totalToolsCount || 0;
  const available = store.availableToolsCount || 0;
  const assigned = store.assignedToolsCount || 0;

  const availablePct = total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0;
  const assignedPct = total > 0 ? Math.min(100 - availablePct, Math.round((assigned / total) * 100)) : 0;

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
      {/* Top Luminous Accent Bar */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: accentColor,
        }}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ padding: 15, paddingTop: 16 }}
      >
        {/* Header Row: Facility Icon, Name, Type Pill & Status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
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

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: theme.text,
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}
                >
                  {store.name}
                </Text>
                
              </View>

              {/* <Text
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: theme.textSecondary,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                ID: #{store._id.substring(store._id.length - 6).toUpperCase()}
                {store.projectName ? ` • ${store.projectName}` : ""}
              </Text> */}
            </View>
          </View>

          {/* Operational Status Dot Pill */}
          {/* <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isDark ? "#065F46" : "#A7F3D0",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#059669",
              }}
            />
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: "800",
                color: "#059669",
                letterSpacing: 0.2,
                textTransform: "uppercase",
              }}
            >
              {store.status || "Operational"}
            </Text>
          </View> */}
        </View>

        {/* Structured Meta Box */}
        <View
          style={{
            backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8F0",
            gap: 6,
          }}
        >
          {/* Location & In-Charge */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1, marginRight: 8 }}>
              <MapPin size={13} color="#64748B" />
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: "600",
                  color: isDark ? "#CBD5E1" : "#475569",
                }}
                numberOfLines={1}
              >
                {store.location || "Facility Yard"}
              </Text>
            </View>

            {store.incharge && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <User size={13} color="#64748B" />
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "700",
                    color: theme.text,
                  }}
                  numberOfLines={1}
                >
                  {store.incharge}
                </Text>
              </View>
            )}
          </View>

          {store.contactNumber && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Phone size={12} color="#64748B" />
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                {store.contactNumber}
              </Text>
            </View>
          )}

          {/* Equipment Distribution Progress & Metrics */}
          <View
            style={{
              paddingTop: 8,
              borderTopWidth: 1,
              borderColor: isDark ? "#1E293B" : "#E2E8F0",
              marginTop: 2,
            }}
          >
            {/* Mini Segmented Bar */}
            <View
              style={{
                height: 5,
                borderRadius: 2.5,
                backgroundColor: isDark ? "#334155" : "#E2E8F0",
                flexDirection: "row",
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <View style={{ width: `${availablePct}%`, backgroundColor: "#10B981" }} />
              <View style={{ width: `${assignedPct}%`, backgroundColor: "#0284C7" }} />
            </View>

            {/* Counts Row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Wrench size={12} color={accentColor} />
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.text }}>
                  {total} Assets Tracked
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#059669" }}>
                    {available} Ready
                  </Text>
                </View>
                {assigned > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#0284C7" }} />
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#0284C7" }}>
                      {assigned} Issued
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
