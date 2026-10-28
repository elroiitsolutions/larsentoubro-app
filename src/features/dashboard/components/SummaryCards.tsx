import React from "react";
import { View, Text, Platform, TouchableOpacity } from "react-native";
import {
  Wrench,
  CheckCircle2,
  Truck,
  Hammer,
  HelpCircle,
  Archive,
} from "lucide-react-native";
import { SummaryCardsData } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface SummaryCardsProps {
  data: SummaryCardsData;
  activeStatus?: string;
  onCardPress?: (status: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  data,
  activeStatus,
  onCardPress,
}) => {
  const { theme, isDark } = useAppTheme();

  const total = data.totalTools ?? 0;
  const available = data.available ?? 0;
  const moving = (data.moving ?? data.inTransit) ?? 0;
  const repair = (data.repair ?? data.damagedRepair) ?? 0;
  const missing = data.missing ?? 0;
  const scrap = data.scrap ?? 0;

  const cards = [
    {
      key: "totalTools",
      title: "Total Tools",
      count: total,
      icon: Wrench,
      filterVal: "All",
      textColor: isDark ? "#60A5FA" : "#3B82F6",
      borderColor: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
      badgeText: "Enterprise Total",
    },
    {
      key: "available",
      title: "Available",
      count: available,
      icon: CheckCircle2,
      filterVal: "Available",
      textColor: isDark ? "#65b399ff" : "#65b399ff",
      borderColor: isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(16, 185, 129, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
      badgeText: "Ready for Deployment",
    },
    {
      key: "moving",
      title: "Moving",
      count: moving,
      icon: Truck,
      filterVal: "Moving",
      textColor: isDark ? "#598dafff" : "#598dafff",
      borderColor: isDark ? "rgba(106, 182, 193, 0.35)" : "rgba(54, 169, 189, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(8, 145, 178, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(6, 182, 212, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.1)",
      badgeText: "Store/HUB Movement",
    },
    {
      key: "repair",
      title: "Repair",
      count: repair,
      icon: Hammer,
      filterVal: "Repair",
      textColor: isDark ? "#FB923C" : "#EA580C",
      borderColor: isDark ? "rgba(234, 88, 12, 0.35)" : "rgba(234, 88, 12, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(249, 115, 22, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(249, 115, 22, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(249, 115, 22, 0.2)" : "rgba(249, 115, 22, 0.1)",
      badgeText: "Under Repair",
    },
    {
      key: "missing",
      title: "Missing",
      count: missing,
      icon: HelpCircle,
      filterVal: "Missing",
      textColor: isDark ? "#F87171" : "#DC2626",
      borderColor: isDark ? "rgba(220, 38, 38, 0.35)" : "rgba(220, 38, 38, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(239, 68, 68, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.1)",
      badgeText: "Investigation Flag",
    },
    {
      key: "scrap",
      title: "Scrap",
      count: scrap,
      icon: Archive,
      filterVal: "Scrap",
      textColor: isDark ? "#FBBF24" : "#D97706",
      borderColor: isDark ? "rgba(217, 119, 6, 0.35)" : "rgba(217, 119, 6, 0.28)",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      webGradient: isDark
        ? "linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(30, 30, 30, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(245, 158, 11, 0.03) 50%, #FFFFFF 100%)",
      iconBg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.1)",
      badgeText: "Decommissioned / Scrapped",
    },
  ];

  const shadowStyle = Platform.select({
    web: {
      boxShadow: isDark
        ? "0 2px 6px -1px rgba(0, 0, 0, 0.25)"
        : "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 2.5,
      elevation: 1,
    },
  });

  return (
    <View style={{ marginBottom: 16 }}>
      {/* 2 Cards in One Row (3 Rows x 2 Columns Grid) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
        {cards.map((card) => {
          const IconComponent = card.icon;
          const isActive = activeStatus === card.filterVal;

          return (
            <View key={card.key} style={{ width: "50%", padding: 4 }}>
              <TouchableOpacity
                activeOpacity={onCardPress ? 0.75 : 1}
                onPress={() => onCardPress?.(card.filterVal)}
                disabled={!onCardPress}
                style={[
                  {
                    backgroundColor: card.cardBg,
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? theme.primary : card.borderColor,
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 116,
                    justifyContent: "space-between",
                  },
                  Platform.select({
                    web: {
                      backgroundImage: card.webGradient,
                    } as any,
                  }),
                  shadowStyle,
                ]}
              >
                {/* Top Row: Title (Left) and Status Icon in Rounded Box (Right) */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: "700",
                      color: isDark ? "#94A3B8" : "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>

                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: card.iconBg,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent size={14} color={card.textColor} strokeWidth={2.2} />
                  </View>
                </View>

                {/* Bottom Section: Count & Badge Pill */}
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                      letterSpacing: -0.5,
                      lineHeight: 26,
                    }}
                  >
                    {card.count.toLocaleString()}
                  </Text>

                  <View
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 5,
                      maxWidth: "100%",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: "700",
                        color: card.textColor,
                      }}
                      numberOfLines={1}
                    >
                      {card.badgeText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SummaryCards;
