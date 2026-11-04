import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Trash2,
  FileText,
  Check,
  Sliders,
  ListFilter,
  ArrowUp,
  ArrowDown,
  X,
  Lock,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import api from "@/services/api";

export const isPermanentRequiredField = (field: any): boolean => {
  const name = String(field?.name || field?.id || '').toLowerCase().trim();
  const label = String(field?.label || '').toLowerCase().trim();

  const isName = (
    name === 'name' ||
    label === 'name' ||
    label.includes('vendor name') ||
    label.includes('firm name') ||
    label.includes('purchaser name') ||
    label.includes('subcontractor name') ||
    label.includes('company name') ||
    label.includes('full name') ||
    label.includes('supplier name') ||
    label === 'subcontractor / vendor name' ||
    label === 'scrap dealer / firm name' ||
    label === 'supplier / purchaser name'
  );

  const isPrimaryPhone = (
    name === 'contactphone' ||
    name === 'phone' ||
    name === 'phonenumber' ||
    name === 'mobile' ||
    name === 'mobilenumber' ||
    label.includes('primary phone') ||
    label.includes('mobile number') ||
    label === 'phone number' ||
    label.includes('primary phone number')
  ) && !name.includes('alternate') && !label.includes('alternate');

  return isName || isPrimaryPhone;
};

export default function FormDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSettingsIndex, setExpandedSettingsIndex] = useState<number | null>(null);
  const [expandedOptionsIndex, setExpandedOptionsIndex] = useState<number | null>(null);

  const loadForm = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await formService.getFormBySlug(slug);
      if (data) {
        if (Array.isArray(data.fields)) {
          const patchedFields = data.fields.map((f) => {
            if (isPermanentRequiredField(f)) {
              let vals = f.validations ? [...f.validations] : [];
              if (!vals.some((v: any) => v.type === "required")) {
                vals.push({ type: "required", message: `${(f.label || f.name).trim()} is required` });
              }
              return { ...f, required: true, validations: vals };
            }
            return f;
          });
          setFormDef({ ...data, fields: patchedFields });
        } else {
          setFormDef(data);
        }
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

  const updateField = (index: number, updates: Partial<FormFieldDefinition>) => {
    if (!formDef) return;
    const updated = formDef.fields.map((f, i) => {
      if (i !== index) return f;
      return { ...f, ...updates };
    });
    setFormDef({ ...formDef, fields: updated });
  };

  const toggleRequired = (index: number) => {
    if (!formDef) return;
    const field = formDef.fields[index];
    if (isPermanentRequiredField(field)) {
      Alert.alert(
        "Mandatory Field",
        "Name and Mobile Number are core system fields and cannot be made optional."
      );
      return;
    }
    const currentReq =
      Boolean(field.required) ||
      Boolean(field.validations?.some((v: any) => v.type === "required"));
    const nextReq = !currentReq;

    let nextValidations = field.validations ? [...field.validations] : [];
    if (nextReq) {
      if (!nextValidations.some((v: any) => v.type === "required")) {
        nextValidations.push({
          type: "required",
          message: `${field.label || "This field"} is required`,
        });
      }
    } else {
      nextValidations = nextValidations.filter((v: any) => v.type !== "required");
    }

    updateField(index, { required: nextReq, validations: nextValidations });
  };

  const reorderFields = (from: number, to: number) => {
    if (!formDef || to < 0 || to >= formDef.fields.length) return;
    const updated = [...formDef.fields];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setFormDef({
      ...formDef,
      fields: updated.map((f, i) => ({ ...f, order: i })),
    });
  };

  const addOption = (fieldIndex: number) => {
    if (!formDef) return;
    const field = formDef.fields[fieldIndex];
    const currentOpts = field.options || [];
    const optNum = currentOpts.length + 1;
    const newOpt = { label: `Option ${optNum}`, value: `option_${optNum}` };
    updateField(fieldIndex, { options: [...currentOpts, newOpt] });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    if (!formDef) return;
    const field = formDef.fields[fieldIndex];
    const currentOpts = [...(field.options || [])];
    currentOpts.splice(optIndex, 1);
    updateField(fieldIndex, { options: currentOpts });
  };

  const updateOptionLabel = (fieldIndex: number, optIndex: number, newLabel: string) => {
    if (!formDef) return;
    const field = formDef.fields[fieldIndex];
    const currentOpts = [...(field.options || [])];
    const opt: any = currentOpts[optIndex];
    const optObj =
      typeof opt === "string"
        ? { label: opt, value: opt.toLowerCase().replace(/\s+/g, "_") }
        : { ...opt };
    optObj.label = newLabel;
    if (!optObj.value || optObj.value.startsWith("option_")) {
      optObj.value = newLabel.trim()
        ? newLabel.toLowerCase().replace(/[^a-z0-9_]/gi, "_")
        : `option_${optIndex + 1}`;
    }
    currentOpts[optIndex] = optObj;
    updateField(fieldIndex, { options: currentOpts });
  };

  const handleDeleteField = (indexToDelete: number) => {
    if (!formDef) return;
    const targetField = formDef.fields[indexToDelete];
    if (targetField && isPermanentRequiredField(targetField)) {
      Alert.alert(
        "Cannot Remove Field",
        `"${targetField.label || targetField.name}" is a core system field and cannot be deleted.`
      );
      return;
    }
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
                order: i,
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
      const sanitizedFields = (formDef.fields || []).map((f, i) => {
        const isPermanent = isPermanentRequiredField(f);
        const isReq = isPermanent || Boolean(f.required || (Array.isArray(f.validations) && f.validations.some(v => v.type === 'required')));
        let vals = f.validations ? [...f.validations] : [];
        if (isReq) {
          if (!vals.some((v: any) => v.type === 'required')) {
            vals.push({ type: 'required', message: `${(f.label || f.name).trim()} is required` });
          }
        } else {
          vals = vals.filter((v: any) => v.type !== 'required');
        }
        return {
          ...f,
          id: f.id || f.name || `field_${i}`,
          order: i,
          required: isReq,
          validations: vals,
        };
      });

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
      adminOnly={true}
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
          {!formDef?.fields || formDef.fields.length === 0 ? (
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
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textSecondary,
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                No custom dynamic fields added to this schema yet.
              </Text>
              <Button
                title="Add First Field"
                size="sm"
                onPress={() => router.push(`/settings/forms/${slug}/add-field` as any)}
              />
            </View>
          ) : (
            formDef.fields.map((field, idx) => {
              const isPermanent = isPermanentRequiredField(field);
              const isRequired =
                isPermanent ||
                Boolean(field.required) ||
                Boolean(
                  field.validations?.some((v: any) => v.type === "required")
                );
              const isSettingsOpen = expandedSettingsIndex === idx;
              const isOptionsOpen = expandedOptionsIndex === idx;
              const isChoiceField =
                field.type === "select" ||
                field.type === "radio" ||
                field.type === "checkbox";

              return (
                <View
                  key={field.name || field.id || idx}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor:
                      isSettingsOpen || isOptionsOpen
                        ? theme.primary
                        : theme.cardBorder,
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Field Header Row */}
                  <View style={{ padding: 14 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      {/* Left: Reorder arrows & Field # & Label */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: theme.isDark ? "#1E293B" : "#F1F5F9",
                            borderRadius: 8,
                            padding: 2,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => reorderFields(idx, idx - 1)}
                            disabled={idx === 0}
                            style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                            accessibilityLabel="Move up"
                          >
                            <ArrowUp size={13} color={theme.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => reorderFields(idx, idx + 1)}
                            disabled={idx === formDef.fields.length - 1}
                            style={{
                              padding: 4,
                              opacity:
                                idx === formDef.fields.length - 1 ? 0.3 : 1,
                            }}
                            accessibilityLabel="Move down"
                          >
                            <ArrowDown size={13} color={theme.text} />
                          </TouchableOpacity>
                        </View>

                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: theme.isDark
                              ? "rgba(79, 70, 229, 0.2)"
                              : "#EEF2FF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: theme.primary,
                            }}
                          >
                            #{idx + 1}
                          </Text>
                        </View>

                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "bold",
                            color: theme.text,
                            flexShrink: 1,
                          }}
                          numberOfLines={1}
                        >
                          {field.label || field.name}
                        </Text>
                      </View>

                      {/* Right: Delete button */}
                      {isPermanent ? (
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: theme.isDark ? "rgba(100, 116, 139, 0.2)" : "#F1F5F9",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.5,
                          }}
                        >
                          <Lock size={14} color={theme.textMuted} />
                        </View>
                      ) : (
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
                      )}
                    </View>

                    {/* Sub-bar: Type badge, Key & Placeholder */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <Badge
                        label={field.type || "text"}
                        size="sm"
                        variant="neutral"
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: theme.textMuted,
                        }}
                      >
                        Key: {field.name}
                      </Text>
                      {field.placeholder ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.textSecondary,
                            fontStyle: "italic",
                          }}
                        >
                          • "{field.placeholder}"
                        </Text>
                      ) : null}
                    </View>

                    {/* Action Controls Bar: Required Toggle, Options & Settings buttons */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderColor: theme.divider,
                      }}
                    >
                      {/* 1. Required Toggle Button */}
                      <TouchableOpacity
                        activeOpacity={isPermanent ? 1 : 0.7}
                        onPress={() => toggleRequired(idx)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: isRequired
                            ? theme.isDark
                              ? "rgba(79, 70, 229, 0.25)"
                              : "#EEF2FF"
                            : theme.isDark
                            ? "#1E293B"
                            : "#F8FAFC",
                          borderWidth: 1.5,
                          borderColor: isRequired ? theme.primary : theme.border,
                          opacity: isPermanent ? 0.95 : 1,
                        }}
                      >
                        {isPermanent ? (
                          <Lock size={12} color={theme.primary} />
                        ) : (
                          <View
                            style={{
                              width: 15,
                              height: 15,
                              borderRadius: 4,
                              borderWidth: 1.5,
                              borderColor: isRequired
                                ? theme.primary
                                : theme.textMuted,
                              backgroundColor: isRequired
                                ? theme.primary
                                : "transparent",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isRequired && (
                              <Check
                                size={11}
                                color="#FFFFFF"
                                strokeWidth={3}
                              />
                            )}
                          </View>
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isRequired
                              ? theme.primary
                              : theme.textSecondary,
                          }}
                        >
                          {isPermanent ? "Required (Always)" : "Required"}
                        </Text>
                      </TouchableOpacity>

                      {/* 2. Options Button (for Select / Radio / Checkbox) */}
                      {isChoiceField && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setExpandedOptionsIndex(
                              isOptionsOpen ? null : idx
                            );
                            setExpandedSettingsIndex(null);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 10,
                            backgroundColor: isOptionsOpen
                              ? theme.primary
                              : theme.isDark
                              ? "#1E293B"
                              : "#F8FAFC",
                            borderWidth: 1.5,
                            borderColor: isOptionsOpen
                              ? theme.primary
                              : theme.border,
                          }}
                        >
                          <ListFilter
                            size={13}
                            color={
                              isOptionsOpen ? "#FFFFFF" : theme.textSecondary
                            }
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: isOptionsOpen
                                ? "#FFFFFF"
                                : theme.textSecondary,
                            }}
                          >
                            {field.options?.length || 0} Options
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* 3. Settings Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setExpandedSettingsIndex(
                            isSettingsOpen ? null : idx
                          );
                          setExpandedOptionsIndex(null);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: isSettingsOpen
                            ? theme.primary
                            : theme.isDark
                            ? "#1E293B"
                            : "#F8FAFC",
                          borderWidth: 1.5,
                          borderColor: isSettingsOpen
                            ? theme.primary
                            : theme.border,
                        }}
                      >
                        <Sliders
                          size={13}
                          color={
                            isSettingsOpen ? "#FFFFFF" : theme.textSecondary
                          }
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isSettingsOpen
                              ? "#FFFFFF"
                              : theme.textSecondary,
                          }}
                        >
                          Settings
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* COLLAPSIBLE OPTIONS DRAWER */}
                  {isOptionsOpen && (
                    <View
                      style={{
                        backgroundColor: theme.isDark ? "#181E29" : "#F8FAFC",
                        padding: 14,
                        borderTopWidth: 1,
                        borderColor: theme.divider,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: theme.text,
                          }}
                        >
                          Selectable Options for "{field.label}"
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => addOption(idx)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: theme.primary,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Plus size={12} color="#FFFFFF" />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: "#FFFFFF",
                            }}
                          >
                            Add Option
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {!field.options || field.options.length === 0 ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.textSecondary,
                            fontStyle: "italic",
                          }}
                        >
                          No options added yet. Tap "Add Option" to create dropdown choices.
                        </Text>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {field.options.map((opt: any, optIdx: number) => {
                            const optLabel =
                              typeof opt === "object" ? opt.label : opt;
                            return (
                              <View
                                key={optIdx}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 8,
                                  backgroundColor: theme.card,
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: theme.textMuted,
                                  }}
                                >
                                  #{optIdx + 1}
                                </Text>
                                <TextInput
                                  style={{
                                    flex: 1,
                                    fontSize: 13,
                                    color: theme.text,
                                    paddingVertical: 6,
                                  }}
                                  value={optLabel}
                                  onChangeText={(val) =>
                                    updateOptionLabel(idx, optIdx, val)
                                  }
                                  placeholder="Option label"
                                  placeholderTextColor={theme.textMuted}
                                />
                                <TouchableOpacity
                                  onPress={() => removeOption(idx, optIdx)}
                                  style={{ padding: 4 }}
                                >
                                  <X size={14} color={theme.danger} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  {/* COLLAPSIBLE SETTINGS DRAWER */}
                  {isSettingsOpen && (
                    <View
                      style={{
                        backgroundColor: theme.isDark ? "#181E29" : "#F8FAFC",
                        padding: 14,
                        borderTopWidth: 1,
                        borderColor: theme.divider,
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.text,
                        }}
                      >
                        Field Configuration & Validation Settings
                      </Text>

                      {/* Edit Field Name / Label */}
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: theme.textSecondary,
                            marginBottom: 4,
                          }}
                        >
                          Field Label / Name
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: theme.card,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 13,
                            color: theme.text,
                          }}
                          value={field.label}
                          onChangeText={(text) =>
                            updateField(idx, { label: text })
                          }
                          placeholder="e.g. Employee Name, Department"
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>

                      {/* Input Type Selector */}
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: theme.textSecondary,
                            marginBottom: 6,
                          }}
                        >
                          Input Type
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          {[
                            "text",
                            "number",
                            "email",
                            "select",
                            "textarea",
                            "switch",
                            "date",
                          ].map((t) => {
                            const isSelected = field.type === t;
                            return (
                              <TouchableOpacity
                                key={t}
                                onPress={() => updateField(idx, { type: t })}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  backgroundColor: isSelected
                                    ? theme.primary
                                    : theme.card,
                                  borderWidth: 1,
                                  borderColor: isSelected
                                    ? theme.primary
                                    : theme.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: isSelected ? "#FFFFFF" : theme.text,
                                  }}
                                >
                                  {t}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Placeholder Text */}
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: theme.textSecondary,
                            marginBottom: 4,
                          }}
                        >
                          Placeholder Text
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: theme.card,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 13,
                            color: theme.text,
                          }}
                          value={field.placeholder || ""}
                          onChangeText={(text) =>
                            updateField(idx, { placeholder: text })
                          }
                          placeholder="e.g. Enter value..."
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>

                      {/* Helper Description */}
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: theme.textSecondary,
                            marginBottom: 4,
                          }}
                        >
                          Helper / Description Text
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: theme.card,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 13,
                            color: theme.text,
                          }}
                          value={
                            field.description ||
                            (field as any).helperText ||
                            ""
                          }
                          onChangeText={(text) =>
                            updateField(idx, { description: text })
                          }
                          placeholder="e.g. As shown on official document"
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>

                      {/* Special Validation Rules */}
                      <View
                        style={{
                          paddingTop: 6,
                          borderTopWidth: 1,
                          borderColor: theme.divider,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: theme.textSecondary,
                            marginBottom: 6,
                          }}
                        >
                          Special Validation Rules
                        </Text>

                        {field.type === "text" && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              let vals = field.validations
                                ? [...field.validations]
                                : [];
                              const hasAlpha = vals.some(
                                (v: any) => v.type === "alphanumeric"
                              );
                              if (!hasAlpha) {
                                vals.push({
                                  type: "alphanumeric",
                                  message: "Must be alphanumeric",
                                });
                              } else {
                                vals = vals.filter(
                                  (v: any) => v.type !== "alphanumeric"
                                );
                              }
                              updateField(idx, { validations: vals });
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                borderWidth: 1.5,
                                borderColor: field.validations?.some(
                                  (v: any) => v.type === "alphanumeric"
                                )
                                  ? theme.primary
                                  : theme.textMuted,
                                backgroundColor: field.validations?.some(
                                  (v: any) => v.type === "alphanumeric"
                                )
                                  ? theme.primary
                                  : "transparent",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {field.validations?.some(
                                (v: any) => v.type === "alphanumeric"
                              ) && (
                                <Check
                                  size={11}
                                  color="#FFFFFF"
                                  strokeWidth={3}
                                />
                              )}
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.text,
                              }}
                            >
                              Enforce Alphanumeric Characters Only
                            </Text>
                          </TouchableOpacity>
                        )}

                        {field.type === "email" && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              let vals = field.validations
                                ? [...field.validations]
                                : [];
                              const hasEmail = vals.some(
                                (v: any) => v.type === "email"
                              );
                              if (!hasEmail) {
                                vals.push({
                                  type: "email",
                                  message: "Must be a valid email",
                                });
                              } else {
                                vals = vals.filter(
                                  (v: any) => v.type !== "email"
                                );
                              }
                              updateField(idx, { validations: vals });
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                borderWidth: 1.5,
                                borderColor: field.validations?.some(
                                  (v: any) => v.type === "email"
                                )
                                  ? theme.primary
                                  : theme.textMuted,
                                backgroundColor: field.validations?.some(
                                  (v: any) => v.type === "email"
                                )
                                  ? theme.primary
                                  : "transparent",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {field.validations?.some(
                                (v: any) => v.type === "email"
                              ) && (
                                <Check
                                  size={11}
                                  color="#FFFFFF"
                                  strokeWidth={3}
                                />
                              )}
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.text,
                              }}
                            >
                              Must be valid email format
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
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
