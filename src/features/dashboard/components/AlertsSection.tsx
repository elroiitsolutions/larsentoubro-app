import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { AlertItem } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface AlertsSectionProps {
  alerts: AlertItem[];
  onAlertPress?: (alert: AlertItem) => void;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  alerts = [],
  onAlertPress,
}) => {
  const { theme, isDark } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return (
      <View
        style={{
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#E2E8F0",
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          ...Platform.select({
            web: { boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" },
            default: { elevation: 1 },
          }),
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: isDark ? "rgba(5, 150, 105, 0.15)" : "#DEF7EC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={20} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: theme.text,
              letterSpacing: -0.2,
            }}
          >
            All Systems Nominal
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: theme.textSecondary,
              marginTop: 1,
            }}
          >
            No overdue inspections or missing equipment alerts.
          </Text>
        </View>
      </View>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const displayAlerts = expanded ? alerts : alerts.slice(0, 3);

  const getSeverityMeta = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "danger":
        return {
          icon: AlertCircle,
          color: "#DC2626",
          badgeBg: isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
          badgeText: isDark ? "#F87171" : "#991B1B",
          cardBg: isDark ? "rgba(30, 41, 59, 0.6)" : "#FEF2F2",
          borderColor: isDark ? "#7F1D1D" : "#FECACA",
          label: "CRITICAL",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          color: "#D97706",
          badgeBg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
          badgeText: isDark ? "#FBBF24" : "#92400E",
          cardBg: isDark ? "rgba(30, 41, 59, 0.6)" : "#FFFBEB",
          borderColor: isDark ? "#78350F" : "#FDE68A",
          label: "ATTENTION",
        };
      case "info":
      default:
        return {
          icon: Info,
          color: "#2563EB",
          badgeBg: isDark ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
          badgeText: isDark ? "#60A5FA" : "#1E40AF",
          cardBg: isDark ? "rgba(30, 41, 59, 0.6)" : "#EFF6FF",
          borderColor: isDark ? "#1E3A8A" : "#BFDBFE",
          label: "NOTICE",
        };
    }
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#E2E8F0",
        padding: 14,
        marginBottom: 16,
        ...Platform.select({
          web: { boxShadow: "0 2px 6px -1px rgba(15, 23, 42, 0.05)" },
          default: { elevation: 1 },
        }),
      }}
    >
      {/* Header with zero overflow on 360px viewport */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1, marginRight: 6 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={14} color="#DC2626" />
          </View>
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: "700",
              color: theme.text,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            Action Required
          </Text>
        </View>

        {/* Severity Count Badges */}
        <View style={{ flexDirection: "row", gap: 5, flexShrink: 0 }}>
          {criticalCount > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "rgba(220, 38, 38, 0.25)" : "#FEE2E2",
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 9.5,
                  fontWeight: "800",
                  color: "#DC2626",
                }}
              >
                {criticalCount} Critical
              </Text>
            </View>
          )}
          {warningCount > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "rgba(217, 119, 6, 0.25)" : "#FEF3C7",
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 9.5,
                  fontWeight: "800",
                  color: "#D97706",
                }}
              >
                {warningCount} Warning
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Alert Cards List */}
      <View style={{ gap: 8 }}>
        {displayAlerts.map((alert) => {
          const meta = getSeverityMeta(alert.severity);
          const IconComp = meta.icon;

          return (
            <TouchableOpacity
              key={alert.id}
              activeOpacity={0.75}
              onPress={() => onAlertPress?.(alert)}
              style={{
                backgroundColor: meta.cardBg,
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: meta.borderColor,
                borderLeftWidth: 3.5,
                borderLeftColor: meta.color,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, marginRight: 8 }}>
                <View style={{ marginRight: 8, marginTop: 1 }}>
                  <IconComp size={15} color={meta.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <View
                      style={{
                        backgroundColor: meta.badgeBg,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontWeight: "800",
                          color: meta.badgeText,
                          letterSpacing: 0.3,
                        }}
                      >
                        {meta.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: "700",
                        color: theme.text,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {alert.title}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 10.5,
                      color: isDark ? "#CBD5E1" : "#475569",
                      lineHeight: 14,
                    }}
                    numberOfLines={2}
                  >
                    {alert.message}
                  </Text>
                </View>
              </View>

              <ChevronRight size={14} color={meta.color} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expand/Collapse Toggle */}
      {alerts.length > 3 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(!expanded)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginTop: 10,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: theme.primary,
            }}
          >
            {expanded ? "Show Less" : `View All (${alerts.length}) Alerts`}
          </Text>
          {expanded ? (
            <ChevronUp size={13} color={theme.primary} />
          ) : (
            <ChevronDown size={13} color={theme.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
