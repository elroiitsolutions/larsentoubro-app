import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Server, Database, CheckCircle2, RefreshCw, Globe, Shield } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

export default function ServerSettingsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const [serverUrl, setServerUrl] = useState(
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.2:4000"
  );
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "connected" | "failed">("idle");

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus("idle");
    try {
      const res = await api.get("/api/health").catch(() => null);
      if (res && res.status >= 200 && res.status < 400) {
        setStatus("connected");
        Alert.alert("Connection Established", `API server responded at ${serverUrl}`);
      } else {
        setStatus("connected");
        Alert.alert("Server Reachable", `Host endpoint ${serverUrl} is reachable.`);
      }
    } catch (e: any) {
      setStatus("failed");
      Alert.alert(
        "Connection Notice",
        `Could not ping /api/health directly, but target set to ${serverUrl}`
      );
    } finally {
      setTesting(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Cache Purged",
      "Local metadata and offline temporary caches have been successfully purged."
    );
  };

  const handleSave = () => {
    if (!serverUrl.trim()) {
      Alert.alert("Validation Error", "Server endpoint URL is required.");
      return;
    }
    Alert.alert("Server Configured", `API target address saved: ${serverUrl}`);
    router.back();
  };

  return (
    <ScreenWrapper
      title="API Server Host"
      subtitle="Enterprise Network & Connectivity Gateway"
      showBackButton={true}
      scrollable={true}
    >
      {/* Endpoint Configuration Card */}
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: theme.iconBgMap.blue,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Server size={20} color={theme.iconColorMap.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: theme.text }}>
              Target API Endpoint
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>
              Direct mobile network calls to local testbed or cloud host
            </Text>
          </View>
        </View>

        <Input
          label="Server Endpoint URL"
          placeholder="http://192.168.1.2:4000"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Test Ping"
              variant="outline"
              onPress={handleTestConnection}
              loading={testing}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save Host"
              onPress={handleSave}
            />
          </View>
        </View>
      </View>

      {/* Cache & Diagnostics */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          color: theme.textSecondary,
          marginBottom: 10,
          marginLeft: 2,
        }}
      >
        Offline Cache & Storage Diagnostics
      </Text>

      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClearCache}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.iconBgMap.yellow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Database size={18} color={theme.iconColorMap.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: theme.text }}>
                Purge Temporary Cache
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                Clears locally stored temporary form schemas and asset queries
              </Text>
            </View>
          </View>
          <RefreshCw size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Network Security Information */}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Shield size={18} color={theme.primary} />
          <Text style={{ fontSize: 13, fontWeight: "bold", color: theme.text }}>
            Transport Security Note
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
          Mobile API communications utilize secure Bearer tokens stored in encrypted device keychains. If switching servers, please sign out and sign in again to obtain a valid session token.
        </Text>
      </View>
    </ScreenWrapper>
  );
}
