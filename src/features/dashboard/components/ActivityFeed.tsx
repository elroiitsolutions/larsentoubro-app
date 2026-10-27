import React from "react";
import { View, Text, Platform } from "react-native";
import {
  Activity,
  Clock,
  User,
  Truck,
  ClipboardCheck,
  Recycle,
  Wrench,
  CheckCircle2,
} from "lucide-react-native";
import { ActivityItem } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities = [] }) => {
  const { theme, isDark } = useAppTheme();

  if (!activities || activities.length === 0) {
    return (
      <View
        style={{
          backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "#2E2E33" : "#E2E8F0",
          padding: 16,
          marginBottom: 30,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Activity size={20} color={theme.textMuted} />
        <Text
          style={{
            fontSize: 12.5,
            fontWeight: "700",
            color: theme.text,
            marginTop: 6,
          }}
        >
          No Activity Logged
        </Text>
        <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 1 }}>
          New dispatches, audits, and inspections will appear here.
        </Text>
      </View>
    );
  }

  const formatActivityTime = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 2) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch {
      return String(dateStr);
    }
  };

  const getActivityTypeMeta = (action: string = "", type: string = "") => {
    const act = (action + " " + type).toLowerCase();
    if (act.includes("dispatch") || act.includes("transit") || act.includes("movement") || act.includes("dc")) {
      return {
        icon: Truck,
        color: "#0284C7",
        bg: isDark ? "rgba(2, 132, 199, 0.2)" : "#E0F2FE",
        label: "DISPATCH",
      };
    }
    if (act.includes("inspect") || act.includes("quality") || act.includes("extend")) {
      return {
        icon: ClipboardCheck,
        color: "#D97706",
        bg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
        label: "INSPECT",
      };
    }
    if (act.includes("scrap") || act.includes("dispos")) {
      return {
        icon: Recycle,
        color: "#7C3AED",
        bg: isDark ? "rgba(124, 58, 237, 0.2)" : "#EDE9FE",
        label: "SCRAP",
      };
    }
    if (act.includes("return") || act.includes("rc")) {
      return {
        icon: CheckCircle2,
        color: "#059669",
        bg: isDark ? "rgba(5, 150, 105, 0.2)" : "#DEF7EC",
        label: "RETURN",
      };
    }
    return {
      icon: Wrench,
      color: "#4F46E5",
      bg: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
      label: "AUDIT",
    };
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? "#2E2E33" : "#E2E8F0",
        padding: 14,
        marginBottom: 30,
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
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1, marginRight: 6 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={14} color="#4F46E5" />
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
            Real-Time Audit Feed
          </Text>
        </View>

        <View
          style={{
            backgroundColor: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#4F46E5" }}>
            Live Logs
          </Text>
        </View>
      </View>

      {/* Timeline List */}
      <View style={{ gap: 0 }}>
        {activities.slice(0, 5).map((item, idx) => {
          const isLast = idx === Math.min(activities.length, 5) - 1;
          const meta = getActivityTypeMeta(item.action, item.type);
          const NodeIcon = meta.icon;

          return (
            <View key={item.id || idx} style={{ flexDirection: "row" }}>
              {/* Left Column: Icon Node & Connected Vertical Line */}
              <View style={{ alignItems: "center", width: 28, marginRight: 8 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: meta.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
                    zIndex: 2,
                  }}
                >
                  <NodeIcon size={13} color={meta.color} />
                </View>
                {!isLast && (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      backgroundColor: isDark ? "#2E2E33" : "#E2E8F0",
                      marginVertical: 2,
                    }}
                  />
                )}
              </View>

              {/* Right Column: Event Content Card */}
              <View
                style={{
                  flex: 1,
                  paddingBottom: isLast ? 0 : 12,
                  paddingTop: 1,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: "700",
                        color: theme.text,
                      }}
                      numberOfLines={1}
                    >
                      {item.action || "Tool Action"}
                    </Text>
                    <View
                      style={{
                        backgroundColor: meta.bg,
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7.5,
                          fontWeight: "800",
                          color: meta.color,
                          letterSpacing: 0.3,
                        }}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <Clock size={9} color={theme.textMuted} />
                    <Text style={{ fontSize: 9.5, fontWeight: "600", color: theme.textSecondary }}>
                      {formatActivityTime(item.date)}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <Text
                  style={{
                    fontSize: 10.5,
                    color: isDark ? "#CBD5E1" : "#475569",
                    marginTop: 2,
                    lineHeight: 14,
                  }}
                  numberOfLines={2}
                >
                  {item.details || `Tool ID: ${item.toolId}`}
                </Text>

                {/* User / Actor Attribution */}
                {Boolean(item.user) && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      marginTop: 3,
                    }}
                  >
                    <User size={10} color={theme.textMuted} />
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: "600",
                        color: theme.textSecondary,
                      }}
                    >
                      {item.user}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
