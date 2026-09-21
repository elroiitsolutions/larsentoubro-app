import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import api from "@/services/api";
import { Plus, X, ListPlus } from "lucide-react-native";

const FIELD_TYPES = ["text", "number", "textarea", "select", "date"];

export default function AddFieldScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddOption = (valueToAdd?: string) => {
    const raw = valueToAdd !== undefined ? valueToAdd : optionInput;
    if (!raw.trim()) return;

    // Support comma-separated batch additions (e.g. "Main Yard, Warehouse 1, Site B")
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const next = [...options];
    for (const part of parts) {
      if (!next.includes(part)) {
        next.push(part);
      }
    }
    setOptions(next);
    setOptionInput("");
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptions(options.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApplyPreset = (presetOptions: string[]) => {
    const next = [...options];
    for (const opt of presetOptions) {
      if (!next.includes(opt)) {
        next.push(opt);
      }
    }
    setOptions(next);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert("Validation Error", "Field label is required.");
      return;
    }

    // Auto-capture any pending option user typed without clicking Add
    let finalOptions = [...options];
    if (type === "select" && optionInput.trim()) {
      const pendingParts = optionInput
        .split(/[,;\n]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      for (const p of pendingParts) {
        if (!finalOptions.includes(p)) {
          finalOptions.push(p);
        }
      }
      setOptions(finalOptions);
      setOptionInput("");
    }

    if (type === "select" && finalOptions.length === 0) {
      Alert.alert(
        "Options Required",
        "Please provide at least one option for this Select dropdown field."
      );
      return;
    }

    const fieldKey =
      name.trim() ||
      label
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "_");

    const newField: FormFieldDefinition = {
      id: fieldKey,
      name: fieldKey,
      label: label.trim(),
      type,
      required,
      ...(type === "select"
        ? {
            options: finalOptions.map((opt, optIndex) => ({
              id: opt.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_") || `opt_${optIndex}`,
              label: opt,
              value: opt,
            })),
          }
        : {}),
    };

    setSaving(true);
    try {
      const current = await formService.getFormBySlug(slug);
      const existingFields = (current?.fields || []).map((f, idx) => ({
        ...f,
        id: f.id || f.name || `field_${idx}`,
      }));

      const updated: FormDefinition = {
        slug,
        name: current?.name || slug.replace(/-/g, " "),
        description: current?.description || `Dynamic schema for ${slug}`,
        fields: [...existingFields, newField],
      };

      await api.post("/api/forms", updated);
      Alert.alert("Success", `Field "${label}" added to schema!`);
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Save Alert",
        err?.response?.data?.message || err?.message || "Could not save field"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title="Add Dynamic Field"
      subtitle={`Adding field to /${slug}`}
      showBackButton={true}
      scrollable={true}
    >
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
        <Input
          label="Field Label *"
          placeholder="e.g. Inspector License No"
          value={label}
          onChangeText={(val) => {
            setLabel(val);
            if (!name) {
              // auto-generate key preview
            }
          }}
        />

        <Input
          label="Field Key / System Name"
          placeholder="e.g. inspectorLicenseNo (auto-generated if blank)"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
        />

        {/* Field Type Selection Pills */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: theme.textSecondary,
              marginBottom: 8,
            }}
          >
            Field Input Type
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FIELD_TYPES.map((t) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  onPress={() => setType(t)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: isSelected ? theme.primary : theme.isDark ? "#1E293B" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : theme.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Dropdown Options Configuration (Visible only when type === 'select') */}
        {type === "select" && (
          <View
            style={{
              marginBottom: 18,
              padding: 14,
              borderRadius: 14,
              backgroundColor: theme.isDark ? "#0F172A" : "#F8FAFC",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ListPlus size={16} color={theme.primary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: theme.text,
                  }}
                >
                  Dropdown Options *
                </Text>
              </View>
              {options.length > 0 && (
                <Badge
                  label={`${options.length} added`}
                  size="sm"
                  variant="primary"
                />
              )}
            </View>

            <Text
              style={{
                fontSize: 11,
                color: theme.textSecondary,
                marginBottom: 12,
                lineHeight: 16,
              }}
            >
              Add selectable options for this dropdown. Enter single choices or paste comma-separated values (e.g. "Main Yard, Site B, Warehouse").
            </Text>

            {/* Quick Presets */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Quick Presets:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {[
                  { label: "+ Yes / No", items: ["Yes", "No"] },
                  { label: "+ Active / Inactive", items: ["Active", "Inactive"] },
                  { label: "+ High / Med / Low", items: ["High", "Medium", "Low"] },
                  { label: "+ Pending / Approved", items: ["Pending", "Approved", "Rejected"] },
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    activeOpacity={0.7}
                    onPress={() => handleApplyPreset(preset.items)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: theme.isDark ? "#1E293B" : "#EDF2F7",
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.primary,
                        fontWeight: "600",
                      }}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input Row */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 12,
                  height: 44,
                }}
              >
                <TextInput
                  value={optionInput}
                  onChangeText={setOptionInput}
                  onSubmitEditing={() => handleAddOption()}
                  placeholder="e.g. In Transit, Delivered"
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    color: theme.text,
                    fontSize: 13,
                    height: "100%",
                  }}
                  returnKeyType="done"
                />
                {optionInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setOptionInput("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleAddOption()}
                style={{
                  height: 44,
                  paddingHorizontal: 14,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {/* Configured Options List */}
            {options.length === 0 ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textMuted, textAlign: "center" }}>
                  No options added yet. Type an option above and tap "Add" or pick a quick preset.
                </Text>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: theme.textSecondary,
                    }}
                  >
                    Configured Choices:
                  </Text>
                  <TouchableOpacity
                    onPress={() => setOptions([])}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 11, color: theme.danger, fontWeight: "600" }}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {options.map((opt, idx) => (
                    <View
                      key={`${opt}-${idx}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.isDark ? "#1E293B" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: theme.isDark ? "#334155" : "#CBD5E1",
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingLeft: 10,
                        paddingRight: 6,
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: theme.isDark ? "#334155" : "#E2E8F0",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: theme.textSecondary,
                          }}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {opt}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleRemoveOption(idx)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: theme.dangerLight,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 2,
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={12} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Mandatory Switch */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            borderTopWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
        >
          <View>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: theme.text }}>
              Mandatory Constraint
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>
              Require users to populate this field before saving records
            </Text>
          </View>
          <Switch
            value={required}
            onValueChange={setRequired}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => router.back()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Add to Schema"
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}
