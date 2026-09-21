import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Trash2, Save, FileText, CheckCircle2 } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import api from "@/services/api";

export default function FormDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadForm = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await formService.getFormBySlug(slug);
      if (data) {
        setFormDef(data);
      } else {
        // Fallback default structure
        setFormDef({
          slug,
          name: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          description: `Dynamic schema configuration for ${slug}`,
          fields: [],
        });
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadForm();
  }, [slug]);

  const onRefresh = () => {
    setRefreshing(true);
    loadForm();
  };

  const handleDeleteField = (indexToDelete: number) => {
    if (!formDef) return;
    const fieldName = formDef.fields[indexToDelete]?.label || "this field";
    Alert.alert(
      "Remove Field",
      `Are you sure you want to remove "${fieldName}" from the schema?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedFields = formDef.fields
              .filter((_, i) => i !== indexToDelete)
              .map((f, i) => ({
                ...f,
                id: f.id || f.name || `field_${i}`,
              }));
            const updated: FormDefinition = { ...formDef, fields: updatedFields };
            setFormDef(updated);
            try {
              await api.post("/api/forms", updated);
            } catch (err) {
              // Ignore save error on delete
            }
          },
        },
      ]
    );
  };

  const handleSaveSchema = async () => {
    if (!formDef) return;
    setSaving(true);
    try {
      const sanitizedFields = (formDef.fields || []).map((f, i) => ({
        ...f,
        id: f.id || f.name || `field_${i}`,
      }));
      const payload: FormDefinition = {
        ...formDef,
        fields: sanitizedFields,
      };

      const response = await api.post<{ success: boolean; message?: string }>(
        "/api/forms",
        payload
      );
      if (response.data && response.data.success) {
        Alert.alert("Success", "Dynamic form schema saved and synchronized with server!");
      } else {
        Alert.alert("Notice", response.data.message || "Schema updated locally.");
      }
    } catch (err: any) {
      Alert.alert(
        "Save Alert",
        err?.response?.data?.message || err?.message || "Schema updated locally."
      );
    } finally {
      setSaving(false);
    }
  };

  const title = formDef?.name || slug?.replace(/-/g, " ") || "Form Schema";

  return (
    <ScreenWrapper
      title={title}
      subtitle={`/${slug} Schema Configuration`}
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
      headerRight={
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/settings/forms/${slug}/add-field` as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: theme.primary,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
          }}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
            Add Field
          </Text>
        </TouchableOpacity>
      }
    >
      {loading ? (
        <View style={{ paddingVertical: 50, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading dynamic schema...
          </Text>
        </View>
      ) : (
        <View>
          {/* Form Overview Card */}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: theme.iconBgMap.indigo,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={18} color={theme.iconColorMap.indigo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: theme.text }}>
                  {formDef?.name || title}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "monospace", color: theme.textMuted }}>
                  Target Route: /{slug}
                </Text>
              </View>
            </View>

            {formDef?.description && (
              <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                {formDef.description}
              </Text>
            )}
          </View>

          {/* Section Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: theme.textSecondary,
              }}
            >
              Configured Fields ({(formDef?.fields || []).length})
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/settings/forms/${slug}/add-field` as any)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Plus size={14} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary }}>
                Add New Field
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Field Items */}
          {(!formDef?.fields || formDef.fields.length === 0) ? (
            <View
              style={{
                padding: 24,
                backgroundColor: theme.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                borderStyle: "dashed",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: "center", marginBottom: 12 }}>
                No custom dynamic fields added to this schema yet.
              </Text>
              <Button
                title="Add First Field"
                size="sm"
                onPress={() => router.push(`/settings/forms/${slug}/add-field` as any)}
              />
            </View>
          ) : (
            formDef.fields.map((field, idx) => (
              <View
                key={field.name || idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: theme.text }}>
                      {field.label || field.name}
                    </Text>
                    {field.required && (
                      <Badge label="Required" size="sm" variant="destructive" />
                    )}
                    <Badge label={field.type || "text"} size="sm" variant="neutral" />
                    {field.type === "select" && Array.isArray(field.options) && (
                      <Badge
                        label={`${field.options.length} options`}
                        size="sm"
                        variant="primary"
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: theme.textMuted,
                      marginTop: 2,
                    }}
                  >
                    Key: {field.name}
                  </Text>
                  {field.type === "select" && Array.isArray(field.options) && field.options.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {field.options.map((opt, optIdx) => {
                        const optLabel = typeof opt === "object" ? opt.label : opt;
                        return (
                          <View
                            key={optIdx}
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: theme.isDark ? "#1E293B" : "#F1F5F9",
                              borderWidth: 1,
                              borderColor: theme.border,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: "600" }}>
                              {optLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDeleteField(idx)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: theme.dangerLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel="Delete field"
                >
                  <Trash2 size={15} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Bottom Save Action Button */}
          <View style={{ marginTop: 12, marginBottom: 30 }}>
            <Button
              title="Save Schema to Server"
              onPress={handleSaveSchema}
              loading={saving}
            />
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
