import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";

interface NoAccessStateProps {
  requiredPermission?: string;
  customMessage?: string;
}

export const NoAccessState: React.FC<NoAccessStateProps> = ({
  requiredPermission,
  customMessage,
}) => {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { user } = useAuthStore();

  const handleReturn = () => {
    if (user?.role === "Guest") {
      router.replace("/scanner" as any);
      return;
    }
    const allowed = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
    if (allowed.includes("/dashboard")) {
      router.replace("/(tabs)" as any);
    } else if (allowed.includes("/stores")) {
      router.replace("/(tabs)/stores" as any);
    } else if (allowed.includes("/projects")) {
      router.replace("/(tabs)/projects" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: isDark ? "rgba(244, 63, 94, 0.15)" : "#FFE4E6",
          borderWidth: 1,
          borderColor: isDark ? "rgba(244, 63, 94, 0.3)" : "#FECDD3",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <ShieldAlert size={40} color="#E11D48" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Lock size={20} color="#E11D48" />
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: theme.text,
            letterSpacing: -0.3,
          }}
        >
          Access Restricted
        </Text>
      </View>

      <Text
        style={{
          fontSize: 13,
          lineHeight: 20,
          color: theme.textSecondary,
          textAlign: "center",
          maxWidth: 320,
          marginBottom: 24,
        }}
      >
        {customMessage ||
          "You do not have permission to view or interact with this section. This restriction is enforced by L&T RBAC platform security. Please contact your system Administrator if you require access."}
      </Text>

      {requiredPermission && (
        <View
          style={{
            backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8F0",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: isDark ? "#94A3B8" : "#475569",
            }}
          >
            Required Privilege: {requiredPermission}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleReturn}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: theme.primary,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 14,
        }}
      >
        <ArrowLeft size={16} color="#FFFFFF" />
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>
          Return to Allowed Area
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default NoAccessState;
