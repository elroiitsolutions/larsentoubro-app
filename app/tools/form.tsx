import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Clock, Info } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toolService } from "@/features/tools/services/toolService";
import { resolveValidationValue } from "@/features/tools/types";
import { DynamicFieldsSection } from "@/components/common/DynamicFieldsSection";
import { FormFieldDefinition } from "@/services/formService";

const CATEGORY_OPTIONS = [
  "General",
  "Lifting Equipment",
  "Power Tools",
  "Safety Gear",
  "Measuring Instruments",
];

const STATUS_OPTIONS = [
  "Available",
  "Issued",
  "Under Maintenance",
  "Calibration Due",
  "Scrap",
];

const VALIDATION_PRESETS = ["1 Year", "2 Years", "3 Years", "5 Years"];

export default function ToolFormScreen() {
  const { id, storeId } = useLocalSearchParams<{ id?: string; storeId?: string }>();
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const isEditing = !!id;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [dynamicFields, setDynamicFields] = useState<FormFieldDefinition[]>([]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const [name, setName] = useState("");
  const [systemToolId, setSystemToolId] = useState("");
  const [toolCode, setToolCode] = useState("");
  const [category, setCategory] = useState("General");
  const [toolType, setToolType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [safeWorkingLoad, setSafeWorkingLoad] = useState("");
  const [makeYear, setMakeYear] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState("Available");
  const [purchaserName, setPurchaserName] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // Validation & Supply Date
  const [validation, setValidation] = useState("");
  const [initialValidation, setInitialValidation] = useState("");
  const [dateOfSupply, setDateOfSupply] = useState("");

  useEffect(() => {
    if (!id) return;
    async function loadTool() {
      try {
        setLoading(true);
        const t = await toolService.getToolById(id!);
        if (t) {
          setName(t.name || t.description || "");
          setSystemToolId(t.toolId || "");
          setToolCode(t.toolCode || "");
          setCategory(t.category || "General");
          setToolType(t.toolType || "");
          setCapacity(t.capacity || "");
          setSafeWorkingLoad(t.safeWorkingLoad || "");
          setMakeYear(t.makeYear ? String(t.makeYear) : "");
          setSerialNumber(t.serialNumber || "");
          setStatus(t.status || "Available");
          setPurchaserName(t.purchaserName || "");
          setSupplierCode(t.supplierCode || "");
          setRemarks(t.remarks || "");

          const resolvedVal = resolveValidationValue(t);
          setValidation(resolvedVal !== "-" ? resolvedVal : "");
          setInitialValidation(resolvedVal !== "-" ? resolvedVal : "");
          setDateOfSupply(t.dateOfSupply || "");

          if (t.customFields) {
            setDynamicValues(t.customFields);
          }
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to load tool details");
      } finally {
        setLoading(false);
      }
    }
    loadTool();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please provide a tool name.");
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        name,
        toolCode,
        category,
        toolType,
        capacity,
        safeWorkingLoad,
        makeYear,
        serialNumber,
        status,
        purchaserName,
        supplierCode,
        remarks,
        validityPeriod: validation.trim() || undefined,
        validation: validation.trim() || undefined,
        dateOfSupply: dateOfSupply.trim() || undefined,
        customFields: dynamicValues,
      };

      if (isEditing) {
        await toolService.updateTool(id!, payload);
        Alert.alert("Success", "Equipment details updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        if (!storeId) {
          Alert.alert("Error", "Store ID is required to register new tools.");
          return;
        }
        await toolService.createTool(storeId, payload);
        Alert.alert("Success", "Tool registered successfully in store catalog.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        "Save Failed",
        err?.response?.data?.message || err?.message || "Could not save tool."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Equipment" : "Register Equipment"}
      scrollable={true}
      showBack
    >
      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading tool specs...
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.cardBorder,
            padding: 18,
            marginBottom: 30,
          }}
        >
          {/* Official System Tool ID (Read-only, matching web portal) */}
          {Boolean(systemToolId) && (
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: theme.textSecondary,
                  marginBottom: 6,
                }}
              >
                Tool ID (System ID)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.primary, fontWeight: "bold", fontSize: 13 }}>#</Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: "700",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                      letterSpacing: 0.5,
                    }}
                    numberOfLines={1}
                  >
                    {systemToolId}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isDark ? "#064E3B" : "#DCFCE7",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: isDark ? "#A7F3D0" : "#15803D",
                    }}
                  >
                    System Generated
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4, marginLeft: 2 }}>
                Official tracking identifier generated by system algorithm & embedded in QR tag
              </Text>
            </View>
          )}

          <Input
            label="Equipment / Tool Name *"
            placeholder="e.g. Hydraulic Torque Wrench 5000 Nm"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Tool Code / Item Code"
                placeholder="e.g. 1SETM0005000000"
                value={toolCode}
                onChangeText={setToolCode}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Manufacturer Serial No"
                placeholder="e.g. SN-984210"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />
            </View>
          </View>

          {/* Category Selector */}
          <View style={{ marginBottom: 14 }}>
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
              Equipment Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {CATEGORY_OPTIONS.map((c) => {
                const isSelected = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    activeOpacity={0.7}
                    onPress={() => setCategory(c)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isSelected ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Validation & Validity Section */}
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Clock size={15} color="#D97706" />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: theme.textSecondary,
                }}
              >
                Validation
              </Text>
            </View>

            {/* Presets */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {VALIDATION_PRESETS.map((v) => {
                const isSelected = validation === v;
                return (
                  <TouchableOpacity
                    key={v}
                    activeOpacity={0.7}
                    onPress={() => setValidation(v)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isSelected ? "#D97706" : isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? "#D97706" : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Validation Period (Custom)"
              placeholder="e.g. 1 Year, 3 Years, or number of years"
              value={validation}
              onChangeText={setValidation}
            />

            {/* In edit mode: explain additive logic */}
            {isEditing && initialValidation && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  backgroundColor: isDark ? "#1E2530" : "#F0FDF4",
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDark ? "#2D3748" : "#DCFCE7",
                  marginTop: -6,
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <Info size={15} color="#16A34A" style={{ marginTop: 1 }} />
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? "#86EFAC" : "#15803D",
                    flex: 1,
                    lineHeight: 16,
                  }}
                >
                  Existing validation: <Text style={{ fontWeight: "700" }}>{initialValidation}</Text>. Entering or updating years will automatically add to the existing validation period.
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Date of Supply"
                placeholder="YYYY-MM-DD"
                value={dateOfSupply}
                onChangeText={setDateOfSupply}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Make Year"
                placeholder="e.g. 2023"
                value={makeYear}
                onChangeText={setMakeYear}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Rated Capacity"
                placeholder="e.g. 10 Ton"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Safe Working Load (SWL)"
                placeholder="e.g. 8.5 Ton"
                value={safeWorkingLoad}
                onChangeText={setSafeWorkingLoad}
              />
            </View>
          </View>

          {/* Status Selection */}
          <View style={{ marginBottom: 14 }}>
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
              Operational Status
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {STATUS_OPTIONS.map((s) => {
                const isSelected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setStatus(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isSelected ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Purchaser Name / Dept"
                placeholder="e.g. L&T Heavy Engineering"
                value={purchaserName}
                onChangeText={setPurchaserName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Supplier Code"
                placeholder="e.g. SUP-4029"
                value={supplierCode}
                onChangeText={setSupplierCode}
              />
            </View>
          </View>

          <Input
            label="Service Remarks & Fitness Notes"
            placeholder="Inspection status, calibration cert reference, storage bay..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
          />

          {/* Custom Dynamic Fields Configured from Settings */}
          <DynamicFieldsSection
            slug="tool-form"
            values={dynamicValues}
            onChange={(key, val) =>
              setDynamicValues((prev) => ({ ...prev, [key]: val }))
            }
            onFieldsLoaded={setDynamicFields}
            excludeFieldNames={[
              "name",
              "description",
              "toolCode",
              "toolId",
              "category",
              "toolType",
              "capacity",
              "safeWorkingLoad",
              "makeYear",
              "serialNumber",
              "status",
              "purchaserName",
              "supplierCode",
              "remarks",
              "storeId",
              "validation",
              "validityPeriod",
              "dateOfSupply",
            ]}
          />

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={isEditing ? "Update Tool" : "Save Tool"}
                onPress={handleSubmit}
                loading={saving}
              />
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
