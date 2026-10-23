import React from "react";
import { View, Text, Platform } from "react-native";
import {
  Wrench,
  CheckCircle2,
  Truck,
  Hammer,
  AlertTriangle,
  Recycle,
  Layers,
} from "lucide-react-native";
import { SummaryCardsData } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface SummaryCardsProps {
  data: SummaryCardsData;
  activeStatus?: string;
  onCardPress?: (status: string) => void;
}

interface MetricCardItem {
  key: string;
  title: string;
  value: number;
  tagText: string;
  tagType: "neutral" | "success" | "warning" | "danger" | "info" | "purple";
  icon: any;
  color: string;
  lightBg: string;
  darkBg: string;
  lightBorder: string;
  statusFilter: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  data,
  activeStatus,
  onCardPress,
}) => {
  const { theme, isDark } = useAppTheme();

  const total = data.totalTools || 0;
  const available = data.available || 0;
  const moving = (data.moving ?? data.inTransit) || 0;
  const repair = (data.repair ?? data.damagedRepair) || 0;
  const missing = data.missing || 0;
  const scrap = data.scrap || 0;

  const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;

  const cards: MetricCardItem[] = [
    {
      key: "total",
      title: "Total Tools",
      value: total,
      tagText: "Fleet",
      tagType: "info",
      icon: Wrench,
      color: "#4F46E5",
      lightBg: "#EEF2FF",
      darkBg: "rgba(79, 70, 229, 0.15)",
      lightBorder: "#C7D2FE",
      statusFilter: "All",
    },
    {
      key: "available",
      title: "Available",
      value: available,
      tagText: `${availablePct}% Ready`,
      tagType: "success",
      icon: CheckCircle2,
      color: "#059669",
      lightBg: "#ECFDF5",
      darkBg: "rgba(5, 150, 105, 0.15)",
      lightBorder: "#A7F3D0",
      statusFilter: "Available",
    },
    {
      key: "moving",
      title: "Moving",
      value: moving,
      tagText: "In Transit",
      tagType: "info",
      icon: Truck,
      color: "#0284C7",
      lightBg: "#F0F9FF",
      darkBg: "rgba(2, 132, 199, 0.15)",
      lightBorder: "#BAE6FD",
      statusFilter: "In Transit",
    },
    {
      key: "repair",
      title: "Repair",
      value: repair,
      tagText: "Service",
      tagType: "warning",
      icon: Hammer,
      color: "#D97706",
      lightBg: "#FFFBEB",
      darkBg: "rgba(217, 119, 6, 0.15)",
      lightBorder: "#FDE68A",
      statusFilter: "Under Repair",
    },
    {
      key: "missing",
      title: "Missing",
      value: missing,
      tagText: missing > 0 ? "Action" : "Zero Loss",
      tagType: missing > 0 ? "danger" : "success",
      icon: AlertTriangle,
      color: "#DC2626",
      lightBg: "#FEF2F2",
      darkBg: "rgba(220, 38, 38, 0.15)",
      lightBorder: "#FECACA",
      statusFilter: "Missing",
    },
    {
      key: "scrap",
      title: "Scrap",
      value: scrap,
      tagText: "Salvage",
      tagType: "purple",
      icon: Recycle,
      color: "#7C3AED",
      lightBg: "#FAF5FF",
      darkBg: "rgba(124, 58, 237, 0.15)",
      lightBorder: "#E9D5FF",
      statusFilter: "Scrap",
    },
  ];

  const getTagColors = (type: MetricCardItem["tagType"]) => {
    switch (type) {
      case "success":
        return {
          bg: isDark ? "rgba(5, 150, 105, 0.2)" : "#DEF7EC",
          text: isDark ? "#34D399" : "#03543F",
        };
      case "warning":
        return {
          bg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF08A",
          text: isDark ? "#FBBF24" : "#723B13",
        };
      case "danger":
        return {
          bg: isDark ? "rgba(220, 38, 38, 0.2)" : "#FDE8E8",
          text: isDark ? "#F87171" : "#9B1C1C",
        };
      case "purple":
        return {
          bg: isDark ? "rgba(124, 58, 237, 0.2)" : "#EDEBFE",
          text: isDark ? "#A78BFA" : "#5521B5",
        };
      case "info":
      default:
        return {
          bg: isDark ? "rgba(79, 70, 229, 0.2)" : "#E1EFFE",
          text: isDark ? "#818CF8" : "#1E429F",
        };
    }
  };
  return (
    <View style={{ marginBottom: 16 }}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          paddingHorizontal: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={13} color={theme.primary} />
          </View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: theme.text,
              letterSpacing: -0.2,
            }}
          >
            Equipment Overview
          </Text>
        </View>
      </View>

      {/* 3 Rows x 2 Columns Compact Mobile Grid (Static, non-clickable cards) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
        {cards.map((card) => {
          const IconComponent = card.icon;
          const tagColors = getTagColors(card.tagType);

          const shadowStyle = Platform.select({
            web: {
              boxShadow: isDark
                ? "0 2px 4px -1px rgba(0, 0, 0, 0.2)"
                : "0 1px 4px -1px rgba(15, 23, 42, 0.05)",
            },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 2,
              elevation: 1,
            },
          });

          return (
            <View key={card.key} style={{ width: "50%", padding: 4 }}>
              <View
                style={[
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderRadius: 14,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                    position: "relative",
                    overflow: "hidden",
                  },
                  shadowStyle,
                ]}
              >
                {/* Luminous Top Accent Bar */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2.5,
                    backgroundColor: card.color,
                  }}
                />

                {/* Top Row: Icon & Pill Tag */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    marginTop: 1,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      backgroundColor: isDark ? card.darkBg : card.lightBg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : card.lightBorder,
                    }}
                  >
                    <IconComponent size={16} color={card.color} strokeWidth={2.2} />
                  </View>

                  <View
                    style={{
                      backgroundColor: tagColors.bg,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color: tagColors.text,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                      numberOfLines={1}
                    >
                      {card.tagText}
                    </Text>
                  </View>
                </View>

                {/* Number & Title */}
                <Text
                  style={{
                    fontSize: 21,
                    fontWeight: "900",
                    color: theme.text,
                    letterSpacing: -0.6,
                    lineHeight: 25,
                  }}
                >
                  {card.value.toLocaleString()}
                </Text>

                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "600",
                    color: theme.textSecondary,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {card.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
