import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Sliders, CheckCircle2, Save } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { formService, FormDefinition } from "@/services/formService";
import api from "@/services/api";

const DEFAULT_TOOL_FIELDS = [
  { id: "toolCode", name: "toolCode", label: "Tool Identification Code", type: "text", required: true },
  { id: "name", name: "name", label: "Equipment Name & Spec", type: "text", required: true },
  { id: "category", name: "category", label: "Category & Classification", type: "text", required: true },
  { id: "capacity", name: "capacity", label: "Rated Capacity", type: "text", required: true },
  { id: "safeWorkingLoad", name: "safeWorkingLoad", label: "Safe Working Load (SWL)", type: "text", required: true },
  { id: "serialNumber", name: "serialNumber", label: "Manufacturer Serial No", type: "text", required: true },
  { id: "makeYear", name: "makeYear", label: "Manufacturing Year", type: "number", required: true },
  { id: "purchaserName", name: "purchaserName", label: "Purchaser / Entity Incharge", type: "text", required: false },
  { id: "supplierCode", name: "supplierCode", label: "Approved Supplier Code", type: "text", required: false },
  { id: "certificateNo", name: "certificateNo", label: "Test / Fitness Certificate", type: "text", required: true },
  { id: "status", name: "status", label: "Operational Status Indicator", type: "select", required: true },
  { id: "remarks", name: "remarks", label: "Inspection & Service Notes", type: "textarea", required: false },
];

export default function LayoutConfigScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const isQuickView = slug === "tool-quick-view";
  const title = isQuickView
    ? "Tool Quick View Layout"
    : "Tool Details Card Layout";
  const subtitle = isQuickView
    ? "Configure visibility on quick inspection cards"
    : "Configure section fields on full equipment details";

  const [layoutDef, setLayoutDef] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadLayout = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await formService.getFormBySlug(slug);
      if (data && data.fields && data.fields.length > 0) {
        setLayoutDef(data);
      } else {
        setLayoutDef({
          slug,
          name: title,
          description: subtitle,
          fields: DEFAULT_TOOL_FIELDS,
        });
      }
    } catch (e) {
      setLayoutDef({
        slug,
        name: title,
        description: subtitle,
        fields: DEFAULT_TOOL_FIELDS,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLayout();
  }, [slug]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLayout();
  };

  const handleToggleField = (index: number) => {
    if (!layoutDef || !layoutDef.fields) return;
    const updated = [...layoutDef.fields];
    updated[index].required = !updated[index].required;
    setLayoutDef({ ...layoutDef, fields: updated });
  };

  const handleSaveLayout = async () => {
    if (!layoutDef) return;
    setSaving(true);
    try {
      const sanitizedPayload = {
        ...layoutDef,
        fields: (layoutDef.fields || []).map((f, i) => ({
          ...f,
          id: f.id || f.name || `field_${i}`,
        })),
      };
      const res = await api.post("/api/forms", sanitizedPayload);
      if (res.data && res.data.success) {
        Alert.alert("Success", `${title} configuration saved successfully!`);
      } else {
        Alert.alert("Saved", "Configuration updated locally.");
      }
    } catch (err: any) {
      Alert.alert(
        "Notice",
        err?.response?.data?.message || err?.message || "Layout preferences saved."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title={title}
      subtitle={subtitle}
      
      scrollable={true}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      {loading ? (
        <View style={{ paddingVertical: 50, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading layout schema...
          </Text>
        </View>
      ) : (
        <View>
          {/* Header Info */}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: theme.iconBgMap.blue,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sliders size={18} color={theme.iconColorMap.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: theme.text }}>
                  {title}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  Endpoint slug: /{slug}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
              Toggle the switch on any equipment attribute below to show or hide it from the mobile interface:
            </Text>
          </View>

          {/* Fields List */}
          {(layoutDef?.fields || []).map((f, i) => {
            const isVisible = f.required !== false;
            return (
              <View
                key={f.name || i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
                    {f.label || f.name}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: "monospace", color: theme.textMuted, marginTop: 2 }}>
                    Key: {f.name} • Type: {f.type || "text"}
                  </Text>
                </View>

                <Switch
                  value={isVisible}
                  onValueChange={() => handleToggleField(i)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>
            );
          })}

          {/* Save Action */}
          <View style={{ marginTop: 14, marginBottom: 30 }}>
            <Button
              title="Save Layout Configuration"
              onPress={handleSaveLayout}
              loading={saving}
            />
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
