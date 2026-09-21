import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { FileText, CheckCircle2, SlidersHorizontal, ChevronRight } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Card } from "@/components/ui/Card";
import api from "@/services/api";
import { FormDefinition } from "@/services/formService";

const FALLBACK_FORMS: FormDefinition[] = [
  {
    slug: "create-project",
    name: "Create Project",
    description: "Dynamic schema and validation rules for creating new enterprise projects.",
    fields: [],
  },
  {
    slug: "create-store",
    name: "Create Store",
    description: "Dynamic schema for site stores and regional equipment hubs.",
    fields: [],
  },
  {
    slug: "create-user",
    name: "Create User",
    description: "User registration schema with role assignments and site permissions.",
    fields: [],
  },
  {
    slug: "tool-form",
    name: "Add Tool Form",
    description: "Dynamic schema for equipment tracking, calibration specs, and load ratings.",
    fields: [],
  },
];

export default function FormsManagementScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [formsList, setFormsList] = useState<FormDefinition[]>(FALLBACK_FORMS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadForms = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: FormDefinition[] }>("/api/forms");
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const allowedSlugs = ["create-project", "create-store", "create-user", "tool-form"];
        const filtered = response.data.data.filter(
          (f: any) =>
            allowedSlugs.includes(f.slug) ||
            (f.slug !== "tool-quick-view" && f.slug !== "tool-details-view")
        );
        if (filtered.length > 0) {
          setFormsList(filtered);
        }
      }
    } catch (e) {
      // Keep fallbacks
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadForms();
  };

  return (
    <ScreenWrapper
      title="Forms Management"
      subtitle="Enterprise Dynamic Schema Configuration"
      showBackButton={true}
      scrollable={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSecondary,
            marginBottom: 4,
          }}
        >
          Dynamic Schemas ({formsList.length})
        </Text>
        <Text style={{ fontSize: 13, color: theme.textMuted }}>
          Select a dynamic form schema below to configure input fields, validations, and mandatory constraints:
        </Text>
      </View>

      {loading && formsList.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8 }}>
            Fetching schemas from server...
          </Text>
        </View>
      ) : (
        formsList.map((f, i) => (
          <TouchableOpacity
            key={f.slug || i}
            activeOpacity={0.75}
            onPress={() => router.push(`/settings/forms/${f.slug}` as any)}
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.cardBorder,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 16 }}>
              {/* Top Row: Icon & Status */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: theme.iconBgMap.indigo,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={20} color={theme.iconColorMap.indigo} />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: theme.successLight,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}
                >
                  <CheckCircle2 size={12} color={theme.success} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: theme.success,
                    }}
                  >
                    Active Schema
                  </Text>
                </View>
              </View>

              {/* Title & Slug */}
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "bold",
                  color: theme.text,
                }}
              >
                {f.name || f.slug}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: theme.isDark ? "#0F172A" : "#F1F5F9",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: theme.textSecondary,
                  }}
                >
                  /{f.slug}
                </Text>
              </View>

              {/* Description */}
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  lineHeight: 18,
                }}
              >
                {f.description ||
                  "Configure custom dynamic fields and validation rules for this schema."}
              </Text>
            </View>

            {/* Action Bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: theme.isDark ? "#111827" : "#F8FAFC",
                borderTopWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <SlidersHorizontal size={13} color={theme.textMuted} />
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: "500" }}>
                  {(f.fields && f.fields.length > 0) ? `${f.fields.length} Custom Fields` : "Manage Schema"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: theme.primary,
                  }}
                >
                  Configure Fields
                </Text>
                <ChevronRight size={14} color={theme.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScreenWrapper>
  );
}
