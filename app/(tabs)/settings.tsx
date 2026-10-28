import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  FileText,
  Sliders,
  BarChart3,
  ChevronRight,
  Palette,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";

interface SettingsCardItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: typeof FileText;
  lightBg: string;
  darkBg: string;
  lightColor: string;
  darkColor: string;
}

const SETTINGS_MODULES: SettingsCardItem[] = [
  {
    id: "forms-management",
    title: "Forms Management",
    description: "Configure dynamic forms like Create Project, Store, and User.",
    route: "/settings/forms",
    icon: FileText,
    lightBg: "#ECFDF5",
    darkBg: "rgba(34, 197, 94, 0.18)",
    lightColor: "#16A34A",
    darkColor: "#4ADE80",
  },
  {
    id: "tool-quick-view",
    title: "Tool Quick View Layout",
    description:
      "Configure fields and visibility on the Quick Tool View (/vt) module.",
    route: "/settings/layouts/tool-quick-view",
    icon: Sliders,
    lightBg: "#EFF6FF",
    darkBg: "rgba(59, 130, 246, 0.18)",
    lightColor: "#2563EB",
    darkColor: "#60A5FA",
  },
  {
    id: "tool-details-view",
    title: "Tool Details Card Layout",
    description:
      "Configure fields and section visibility on the Full Tool Details (/tooldetails) page.",
    route: "/settings/layouts/tool-details-view",
    icon: Palette,
    lightBg: "#EEF2FF",
    darkBg: "rgba(99, 102, 241, 0.18)",
    lightColor: "#4F46E5",
    darkColor: "#818CF8",
  },
  {
    id: "reports-audit",
    title: "Reports & Audit",
    description:
      "View operational reports, inventory analytics, and loss audit registers.",
    route: "/settings/reports",
    icon: BarChart3,
    lightBg: "#FAF5FF",
    darkBg: "rgba(168, 85, 247, 0.18)",
    lightColor: "#9333EA",
    darkColor: "#C084FC",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const handleClearCache = () => {
    Alert.alert(
      "Cache Cleared",
      "Local metadata and offline schemas refreshed successfully."
    );
  };

  return (
    <ScreenWrapper
      title="Settings"
      subtitle="Enterprise System & Layout Configuration"
      showBackButton={false}
      showSidebarButton={true}
      scrollable={true}
      requiredPage="/settings"
    >
      <View style={styles.container}>
        {SETTINGS_MODULES.map((item) => {
          const IconComp = item.icon;
          const iconBg = isDark ? item.darkBg : item.lightBg;
          const iconColor = isDark ? item.darkColor : item.lightColor;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder || theme.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: iconBg,
                    },
                  ]}
                >
                  <IconComp size={22} color={iconColor} strokeWidth={2} />
                </View>

                <View style={styles.cardHeaderContent}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>

                <ChevronRight
                  size={18}
                  color={theme.textMuted || theme.textSecondary}
                />
              </View>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 2,
  },
  systemBox: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  systemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  systemLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  systemValue: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
});
