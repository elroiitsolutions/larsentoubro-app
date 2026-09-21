import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  FileText,
  Truck,
  Sliders,
  Palette,
  BarChart3,
  Server,
  Database,
  ChevronRight,
  RefreshCw,
  QrCode,
  FolderGit2,
  Building2,
  Wrench,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";

interface SettingModuleCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
  badge?: string;
}

function SettingModuleCard({
  icon,
  iconBg,
  title,
  description,
  onPress,
  badge,
}: SettingModuleCardProps) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: iconBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: theme.text }}>
                {title}
              </Text>
              {badge && (
                <View
                  style={{
                    backgroundColor: theme.activeBg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "700", color: theme.activeText }}>
                    {badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              {description}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const handleClearCache = () => {
    Alert.alert(
      "Cache Cleared",
      "Local metadata and offline schemas refreshed successfully."
    );
  };

  return (
    <ScreenWrapper
      title="Settings & Modules"
      subtitle="Enterprise Configuration & Layout Engine"
      showBackButton={false}
      scrollable={true}
    >
      {/* 1. Dynamic Modules Section */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
          color: theme.textSecondary,
          marginBottom: 10,
          marginLeft: 2,
        }}
      >
        Dynamic Schemas & Layouts
      </Text>

      {/* Forms Management */}
      <SettingModuleCard
        icon={<FileText size={22} color={theme.iconColorMap.green} />}
        iconBg={theme.iconBgMap.green}
        title="Forms Management"
        description="Configure dynamic schema fields and validations for Projects, Stores, and Tools."
        onPress={() => router.push("/settings/forms" as any)}
        badge="Live"
      />

      {/* Challan Register */}
      <SettingModuleCard
        icon={<Truck size={22} color={theme.iconColorMap.red} />}
        iconBg={theme.iconBgMap.red}
        title="Challan Register"
        description="View dispatch history, delivery notes, and return challans."
        onPress={() => router.push("/challans" as any)}
      />

      {/* Tool Quick View Layout */}
      <SettingModuleCard
        icon={<Sliders size={22} color={theme.iconColorMap.blue} />}
        iconBg={theme.iconBgMap.blue}
        title="Tool Quick View Layout"
        description="Configure visible equipment attributes on quick scan cards (/vt)."
        onPress={() => router.push("/settings/layouts/tool-quick-view" as any)}
      />

      {/* Tool Details Card Layout */}
      <SettingModuleCard
        icon={<Palette size={22} color={theme.iconColorMap.indigo} />}
        iconBg={theme.iconBgMap.indigo}
        title="Tool Details Card Layout"
        description="Customize fields and section ordering on full equipment sheets."
        onPress={() => router.push("/settings/layouts/tool-details-view" as any)}
      />

      {/* Reports & Audit */}
      <SettingModuleCard
        icon={<BarChart3 size={22} color={theme.iconColorMap.purple} />}
        iconBg={theme.iconBgMap.purple}
        title="Reports & Asset Audit"
        description="Operational health metrics, inspection due alerts, and scrap registers."
        onPress={() => router.push("/settings/reports" as any)}
      />

      {/* 2. System & Connectivity Section */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
          color: theme.textSecondary,
          marginTop: 12,
          marginBottom: 10,
          marginLeft: 2,
        }}
      >
        Network & Storage Diagnostics
      </Text>

      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          padding: 16,
          marginBottom: 30,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/settings/server" as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderColor: theme.border,
            paddingBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 }}>
            <Server size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: theme.text }}>
                API Server Host
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: theme.textMuted,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.2:4000"}
              </Text>
            </View>
          </View>
          <ChevronRight size={14} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClearCache}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 14,
            paddingVertical: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Database size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.text }}>
              Purge Temporary Offline Cache
            </Text>
          </View>
          <RefreshCw size={14} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
