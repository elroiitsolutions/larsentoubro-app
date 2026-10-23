import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import {
  Building2,
  Hash,
  Briefcase,
  User,
  MapPin,
  Calendar,
  IndianRupee,
  FileText,
  Check,
  Tag,
  Mail,
  Phone,
  Layers,
} from "lucide-react-native";
import { FormFieldDefinition } from "@/services/formService";
import { Input } from "@/components/ui/Input";
import { useAppTheme } from "@/context/ThemeContext";

interface DynamicFormRendererProps {
  fields: FormFieldDefinition[];
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
  cardStyle?: boolean;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  values,
  onChange,
  errors = {},
  cardStyle = true,
}) => {
  const { theme, isDark } = useAppTheme();

  const getFieldIcon = (field: FormFieldDefinition) => {
    const n = `${field.name} ${field.label}`.toLowerCase();
    if (n.includes("name") || n.includes("title") || n.includes("project")) {
      return <Building2 size={16} color="#64748B" />;
    }
    if (n.includes("code") || n.includes("id")) {
      return <Hash size={15} color="#64748B" />;
    }
    if (
      n.includes("budget") ||
      n.includes("cost") ||
      n.includes("price") ||
      n.includes("rupee") ||
      n.includes("amount")
    ) {
      return <IndianRupee size={15} color="#059669" />;
    }
    if (
      n.includes("date") ||
      n.includes("deadline") ||
      n.includes("time") ||
      n.includes("schedule")
    ) {
      return <Calendar size={15} color="#64748B" />;
    }
    if (
      n.includes("lead") ||
      n.includes("incharge") ||
      n.includes("manager") ||
      n.includes("user") ||
      n.includes("person") ||
      n.includes("owner")
    ) {
      return <User size={15} color="#64748B" />;
    }
    if (
      n.includes("location") ||
      n.includes("site") ||
      n.includes("address") ||
      n.includes("city") ||
      n.includes("place")
    ) {
      return <MapPin size={15} color="#64748B" />;
    }
    if (
      n.includes("dept") ||
      n.includes("department") ||
      n.includes("division")
    ) {
      return <Briefcase size={15} color="#64748B" />;
    }
    if (n.includes("mail")) {
      return <Mail size={15} color="#64748B" />;
    }
    if (
      n.includes("phone") ||
      n.includes("mobile") ||
      n.includes("contact")
    ) {
      return <Phone size={15} color="#64748B" />;
    }
    if (
      n.includes("desc") ||
      n.includes("scope") ||
      n.includes("remark") ||
      n.includes("note") ||
      n.includes("spec")
    ) {
      return <FileText size={15} color="#64748B" />;
    }
    if (
      n.includes("type") ||
      n.includes("category") ||
      n.includes("class")
    ) {
      return <Layers size={15} color="#64748B" />;
    }
    return <Tag size={15} color="#64748B" />;
  };

  const containerStyle = cardStyle
    ? {
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#E2E8F0",
        padding: 16,
        marginBottom: 14,
        ...Platform.select({
          web: {
            boxShadow: isDark
              ? "0 4px 12px rgba(0,0,0,0.2)"
              : "0 2px 8px rgba(15,23,42,0.04)",
          },
          default: { elevation: 2 },
        }),
      }
    : {};

  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <View style={containerStyle}>
      {fields.map((field) => {
        const fieldKey = field.name || field.id || "";
        const fieldValue = values[fieldKey];
        const error = errors[fieldKey];

        const isRequired = Boolean(
          field.required ||
            (Array.isArray(field.validations) &&
              field.validations.some((v: any) => v.type === "required"))
        );

        const fieldLabel = `${field.label || field.name || "Field"}${
          isRequired ? " *" : ""
        }`;

        // 1. SELECT / DROPDOWN FIELD
        if (
          field.type === "select" &&
          Array.isArray(field.options) &&
          field.options.length > 0
        ) {
          return (
            <View key={fieldKey} style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: isDark ? "#94A3B8" : "#475569",
                  marginBottom: 8,
                }}
              >
                {fieldLabel}
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
                      activeOpacity={0.75}
                      onPress={() => onChange(fieldKey, optVal)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: isSelected
                          ? theme.primary
                          : isDark
                          ? "#0F172A"
                          : "#F1F5F9",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? theme.primary
                          : isDark
                          ? "#334155"
                          : "#E2E8F0",
                      }}
                    >
                      {isSelected ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isDark ? "#64748B" : "#94A3B8",
                          }}
                        />
                      )}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected
                            ? "#FFFFFF"
                            : isDark
                            ? "#E2E8F0"
                            : "#334155",
                        }}
                      >
                        {String(optLabel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error && (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#EF4444",
                    fontWeight: "600",
                    marginTop: 4,
                  }}
                >
                  {error}
                </Text>
              )}
            </View>
          );
        }

        // 2. SWITCH / BOOLEAN FIELD
        if (field.type === "switch" || field.type === "checkbox") {
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
                borderColor: isDark ? "#334155" : "#F1F5F9",
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.text,
                  }}
                >
                  {fieldLabel}
                </Text>
                {field.description && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {field.description}
                  </Text>
                )}
              </View>
              <Switch
                value={switchVal}
                onValueChange={(val) => onChange(fieldKey, val)}
                trackColor={{
                  false: isDark ? "#334155" : "#E2E8F0",
                  true: theme.primary,
                }}
              />
            </View>
          );
        }

        // 3. TEXT / TEXTAREA / NUMBER / EMAIL / PHONE / DATE INPUTS
        const isTextarea = field.type === "textarea";
        const isNumber = field.type === "number";
        const isEmail = field.type === "email";
        const isPhone = field.type === "phone";
        const isDate = field.type === "date";

        let keyboardType: any = "default";
        if (isNumber) keyboardType = "numeric";
        else if (isEmail) keyboardType = "email-address";
        else if (isPhone) keyboardType = "phone-pad";

        return (
          <Input
            key={fieldKey}
            label={fieldLabel}
            placeholder={
              field.placeholder ||
              (isDate ? "YYYY-MM-DD" : `Enter ${(field.label || field.name).toLowerCase()}`)
            }
            value={fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : ""}
            onChangeText={(text) => {
              if (isNumber) {
                onChange(fieldKey, text === "" ? "" : Number(text) || text);
              } else {
                onChange(fieldKey, text);
              }
            }}
            multiline={isTextarea}
            numberOfLines={isTextarea ? 3 : 1}
            keyboardType={keyboardType}
            leftIcon={getFieldIcon(field)}
            error={error}
            hint={field.description}
            autoCapitalize={
              fieldKey.toLowerCase().includes("code") ? "characters" : "sentences"
            }
          />
        );
      })}
    </View>
  );
};
export default DynamicFormRenderer;
