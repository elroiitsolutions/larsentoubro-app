import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { storeService } from "@/features/stores/services/storeService";
import { DynamicFieldsSection } from "@/components/common/DynamicFieldsSection";
import { FormFieldDefinition } from "@/services/formService";

const STORE_TYPES = ["Store", "HUB"];
const STORE_STATUSES = ["Operational", "Maintenance", "Inactive"];

export default function StoreFormScreen() {
  const { id, projectId } = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const isEditing = !!id;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [dynamicFields, setDynamicFields] = useState<FormFieldDefinition[]>([]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [incharge, setIncharge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [type, setType] = useState("Store");
  const [status, setStatus] = useState("Operational");

  useEffect(() => {
    if (!id) return;
    async function loadStore() {
      try {
        setLoading(true);
        const s = await storeService.getStoreById(id!);
        if (s) {
          setName(s.name || "");
          setLocation(s.location || "");
          setIncharge(s.incharge || "");
          setContactNumber(s.contactNumber || "");
          setType(s.type || "Store");
          setStatus(s.status || "Operational");

          const sAny = s as any;
          const dynInit: Record<string, any> = {};
          if (sAny.customFields && typeof sAny.customFields === "object") {
            Object.assign(dynInit, sAny.customFields);
          }
          const coreKeys = [
            "name", "storeName", "location", "incharge", "contactNumber",
            "type", "status", "projectId", "_id", "id", "createdAt", "updatedAt", "__v", "customFields"
          ];
          Object.keys(sAny).forEach((key) => {
            if (!coreKeys.includes(key)) {
              dynInit[key] = sAny[key];
            }
          });
          setDynamicValues(dynInit);
        }
      } catch (err) {
        Alert.alert("Notice", "Could not fetch store data.");
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Store name is required.");
      return;
    }

    // Validate required dynamic fields
    for (const df of dynamicFields) {
      if (
        df.required &&
        (dynamicValues[df.name] === undefined ||
          String(dynamicValues[df.name]).trim() === "")
      ) {
        Alert.alert("Validation Error", `${df.label || df.name} is required.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        storeName: name.trim(),
        location: location.trim() || undefined,
        incharge: incharge.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        type,
        status,
        projectId: projectId || undefined,
        ...dynamicValues,
        customFields: dynamicValues,
      };

      if (isEditing && id) {
        await storeService.updateStore(id, payload);
        Alert.alert("Success", "Store updated successfully!");
      } else {
        await storeService.createStore(payload);
        Alert.alert("Success", "Store created successfully!");
      }

      router.back();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Creation Failed",
        err?.response?.data?.message || err?.message || "Failed to save store."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Store / Hub" : "Create Store / Hub"}
      subtitle={isEditing ? `Updating ${name || id}` : "Equipment Storage & Dispatch Facility"}
      showBackButton={true}
      scrollable={true}
    >
      {loading ? (
        <View style={{ paddingVertical: 50, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading store details...
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
          <Input
            label="Store / Hub Name *"
            placeholder="e.g. Central Machinery Yard - Store 01"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Site Location / Yard Address"
            placeholder="e.g. Plot 14, Industrial Area, Sector 5"
            value={location}
            onChangeText={setLocation}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Store Incharge / Manager"
                placeholder="e.g. Amit Verma"
                value={incharge}
                onChangeText={setIncharge}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Phone"
                placeholder="e.g. +91 98765 43210"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Type Selector */}
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
              Facility Classification
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {STORE_TYPES.map((t) => {
                const isSelected = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.7}
                    onPress={() => setType(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? theme.primary : theme.isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
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

          {/* Status Selector */}
          <View style={{ marginBottom: 20 }}>
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
            <View style={{ flexDirection: "row", gap: 8 }}>
              {STORE_STATUSES.map((s) => {
                const isSelected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setStatus(s)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
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
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Custom Dynamic Fields Configured from Settings */}
          <DynamicFieldsSection
            slug="create-store"
            values={dynamicValues}
            onChange={(key, val) =>
              setDynamicValues((prev) => ({ ...prev, [key]: val }))
            }
            onFieldsLoaded={setDynamicFields}
            excludeFieldNames={[
              "name",
              "storeName",
              "location",
              "incharge",
              "contactNumber",
              "type",
              "status",
              "projectId",
            ]}
          />

          {/* Buttons */}
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
                title={isEditing ? "Update Store" : "Create Store"}
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
