import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { formService, FormFieldDefinition, FormDefinition } from "@/services/formService";
import { Input } from "@/components/ui/Input";
import { useAppTheme } from "@/context/ThemeContext";
import { Sliders } from "lucide-react-native";

interface DynamicFieldsSectionProps {
  slug: string;
  values: Record<string, any>;
  onChange: (fieldKey: string, val: any) => void;
  onFieldsLoaded?: (fields: FormFieldDefinition[]) => void;
  excludeFieldNames?: string[];
}

export const DynamicFieldsSection: React.FC<DynamicFieldsSectionProps> = ({
  slug,
  values,
  onChange,
  onFieldsLoaded,
  excludeFieldNames = [],
}) => {
  const { theme } = useAppTheme();
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSchema() {
      try {
        setLoading(true);
        const schema = await formService.getFormBySlug(slug);
        if (isMounted && schema && Array.isArray(schema.fields)) {
          const excludedLower = excludeFieldNames.map((n) => n.toLowerCase());
          const activeFields = schema.fields.filter(
            (f) => !excludedLower.includes(f.name.toLowerCase())
          );
          setFields(activeFields);
          if (onFieldsLoaded) {
            onFieldsLoaded(activeFields);
          }
        }
      } catch (err) {
        // Silently fail if schema cannot be fetched
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSchema();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 12, alignItems: "center" }}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
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
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: theme.divider,
        }}
      >
        <Sliders size={16} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
            Custom Dynamic Fields
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
            Configured in Forms Management schema (/{slug})
          </Text>
        </View>
      </View>

      {/* Field Items */}
      {fields.map((field) => {
        const fieldKey = field.name;
        const fieldValue = values[fieldKey];

        // 1. Select Field Type
        if (
          field.type === "select" &&
          Array.isArray(field.options) &&
          field.options.length > 0
        ) {
          return (
            <View key={fieldKey} style={{ marginBottom: 16 }}>
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
                {field.label} {field.required ? "*" : ""}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {field.options.map((opt: any, optIdx: number) => {
                  const optVal =
                    typeof opt === "object" && opt !== null
                      ? opt.value !== undefined
                        ? opt.value
                        : opt.label
                      : opt;
                  const optLabel =
                    typeof opt === "object" && opt !== null
                      ? opt.label !== undefined
                        ? opt.label
                        : opt.value
                      : opt;

                  const isSelected =
                    fieldValue !== undefined &&
                    String(fieldValue).toLowerCase() === String(optVal).toLowerCase();

                  return (
                    <TouchableOpacity
                      key={`${fieldKey}-opt-${optIdx}`}
                      activeOpacity={0.7}
                      onPress={() => onChange(fieldKey, optVal)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.isDark
                          ? "#1E293B"
                          : "#F1F5F9",
                        borderWidth: 1,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected ? "#FFFFFF" : theme.text,
                        }}
                      >
                        {String(optLabel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }

        // 2. Switch Field Type
        if (field.type === "switch") {
          const switchVal = Boolean(fieldValue);
          return (
            <View
              key={fieldKey}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderTopWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                {field.label} {field.required ? "*" : ""}
              </Text>
              <Switch
                value={switchVal}
                onValueChange={(val) => onChange(fieldKey, val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          );
        }

        // 3. Text / Textarea / Number / Date Field Types
        return (
          <Input
            key={fieldKey}
            label={`${field.label} ${field.required ? "*" : ""}`}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            value={fieldValue !== undefined ? String(fieldValue) : ""}
            onChangeText={(text) => onChange(fieldKey, text)}
            multiline={field.type === "textarea"}
            numberOfLines={field.type === "textarea" ? 3 : 1}
            keyboardType={
              field.type === "number"
                ? "numeric"
                : field.type === "phone"
                ? "phone-pad"
                : field.type === "email"
                ? "email-address"
                : "default"
            }
          />
        );
      })}
    </View>
  );
};
