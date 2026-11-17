import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { formService, FormFieldDefinition } from "@/services/formService";
import { Input } from "@/components/ui/Input";
import { useAppTheme } from "@/context/ThemeContext";
import { InlineCalendarPicker } from "@/components/ui/InlineCalendarPicker";
import { Calendar as CalendarIcon } from "lucide-react-native";

interface DynamicFieldsSectionProps {
  slug: string;
  values: Record<string, any>;
  onChange: (fieldKey: string, val: any) => void;
  onFieldsLoaded?: (fields: FormFieldDefinition[]) => void;
  excludeFieldNames?: string[];
}

const DynamicDateFieldItem: React.FC<{
  label: string;
  isRequired: boolean;
  value: any;
  placeholder?: string;
  onChange: (val: string) => void;
  isDark: boolean;
  theme: any;
}> = ({ label, isRequired, value, placeholder, onChange, isDark, theme }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const dateStr = value !== undefined && value !== null ? String(value) : "";

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11.5,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: isDark ? "#CBD5E1" : "#334155",
          marginBottom: 6,
        }}
      >
        {label} {isRequired ? "*" : ""}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowCalendar((prev) => !prev)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
          borderWidth: 1.5,
          borderColor: showCalendar
            ? theme.primary
            : isDark
            ? "#334155"
            : "#E2E8F0",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <CalendarIcon size={18} color={theme.primary} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: dateStr
                ? isDark
                  ? "#F8FAFC"
                  : "#0F172A"
                : isDark
                ? "#64748B"
                : "#94A3B8",
            }}
          >
            {dateStr || placeholder || "Pick a date (YYYY-MM-DD)"}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: showCalendar
              ? isDark
                ? "#1E3A8A"
                : "#DBEAFE"
              : theme.primary,
          }}
        >
          <CalendarIcon size={12} color={showCalendar ? theme.primary : "#FFFFFF"} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: showCalendar ? theme.primary : "#FFFFFF",
            }}
          >
            {showCalendar ? "Close" : "Pick Date"}
          </Text>
        </View>
      </TouchableOpacity>

      {showCalendar && (
        <View style={{ marginTop: 8 }}>
          <InlineCalendarPicker
            selectedDate={dateStr}
            onSelectDate={(d) => {
              onChange(d);
              setShowCalendar(false);
            }}
            onClose={() => setShowCalendar(false)}
          />
        </View>
      )}
    </View>
  );
};

export const DynamicFieldsSection: React.FC<DynamicFieldsSectionProps> = ({
  slug,
  values,
  onChange,
  onFieldsLoaded,
  excludeFieldNames = [],
}) => {
  const { theme, isDark } = useAppTheme();
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
            (f) =>
              !excludedLower.includes(f.name.toLowerCase()) &&
              f.name !== "password" &&
              f.id !== "password"
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
    <View style={{ width: "100%" }}>
      {fields.map((field) => {
        const fieldKey = field.name;
        const fieldValue = values[fieldKey];
        const isRequired =
          Boolean(field.required) ||
          Boolean(field.validations?.some((v: any) => v.type === "required"));

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
                  fontSize: 11.5,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: isDark ? "#CBD5E1" : "#334155",
                  marginBottom: 6,
                }}
              >
                {field.label} {isRequired ? "*" : ""}
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
                    String(fieldValue).toLowerCase() ===
                      String(optVal).toLowerCase();

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
                          : isDark
                          ? "#1E293B"
                          : "#F1F5F9",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? theme.primary
                          : isDark
                          ? "#2E2E33"
                          : "#E2E8F0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected
                            ? "#FFFFFF"
                            : isDark
                            ? "#FFFFFF"
                            : "#0F172A",
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
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: isDark ? "#2E2E33" : "#E2E8F0",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                }}
              >
                {field.label} {isRequired ? "*" : ""}
              </Text>
              <Switch
                value={switchVal}
                onValueChange={(val) => onChange(fieldKey, val)}
                trackColor={{
                  false: isDark ? "#2E2E33" : "#CBD5E1",
                  true: theme.primary,
                }}
              />
            </View>
          );
        }

        // 3. Date / Calendar Field Type
        const fieldTypeLower = String(field.type || "").toLowerCase();
        if (fieldTypeLower === "date" || fieldTypeLower === "calendar" || fieldTypeLower === "calender") {
          return (
            <DynamicDateFieldItem
              key={fieldKey}
              label={field.label}
              isRequired={isRequired}
              value={fieldValue}
              placeholder={field.placeholder}
              onChange={(val) => onChange(fieldKey, val)}
              isDark={isDark}
              theme={theme}
            />
          );
        }

        // 4. Text / Textarea / Number Field Types
        return (
          <Input
            key={fieldKey}
            label={`${field.label} ${isRequired ? "*" : ""}`}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
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
export default DynamicFieldsSection;
