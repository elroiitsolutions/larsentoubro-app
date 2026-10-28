import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Store as StoreIcon,
  CheckCircle2,
  SlidersHorizontal,
  FolderGit2,
  Building2,
  MapPin,
  Check,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { storeService } from "@/features/stores/services/storeService";
import { StoreFormValues } from "@/features/stores/types";
import { projectService } from "@/features/projects/services/projectService";
import { ProjectRecord } from "@/features/projects/types";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import { DynamicFormRenderer } from "@/components/common/DynamicFormRenderer";

const FALLBACK_FIELDS: FormFieldDefinition[] = [
  {
    name: "storeName",
    label: "Store / Hub Name",
    type: "text",
    required: true,
    placeholder: "e.g. Central Machinery Yard - Store 01",
  },
  {
    name: "location",
    label: "Site Location / Yard Address",
    type: "text",
    required: true,
    placeholder: "e.g. Plot 14, Industrial Area, Sector 5",
  },
  {
    name: "manager",
    label: "Store Manager / Incharge",
    type: "text",
    required: false,
    placeholder: "e.g. Amit Verma",
  },
  {
    name: "type",
    label: "Facility Classification",
    type: "select",
    options: ["Store", "HUB"],
    defaultValue: "Store",
  },
  {
    name: "status",
    label: "Operating Status",
    type: "select",
    options: ["Operational", "Maintenance", "Inactive"],
    defaultValue: "Operational",
  },
];

export default function StoreFormScreen() {
  const { id, projectId: paramProjectId } = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const isEditing = !!id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [fields, setFields] = useState<FormFieldDefinition[]>(FALLBACK_FIELDS);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Projects State
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(paramProjectId || "");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch available projects so a store can be assigned to a project
      let loadedProjects: ProjectRecord[] = [];
      try {
        loadedProjects = await projectService.getProjects();
        setProjects(loadedProjects);
      } catch (err) {
        console.warn("Could not fetch projects list:", err);
      }

      // 2. Fetch Dynamic Form Schema configured in Form Management
      let loadedFields: FormFieldDefinition[] = FALLBACK_FIELDS;
      try {
        const schema = await formService.getFormBySlug("create-store");
        if (schema && Array.isArray(schema.fields) && schema.fields.length > 0) {
          setFormDef(schema);
          loadedFields = schema.fields;
          setFields(schema.fields);
        } else {
          setFormDef({
            slug: "create-store",
            name: "Create Store",
            description: "Dynamic schema for site stores and regional equipment hubs.",
            fields: FALLBACK_FIELDS,
          });
          setFields(FALLBACK_FIELDS);
        }
      } catch (e) {
        setFields(FALLBACK_FIELDS);
      }

      // 3. If editing existing store, fetch store details
      if (id) {
        try {
          const s = await storeService.getStoreById(id);
          if (s) {
            const initialVals: Record<string, any> = { ...s };
            const sAny = s as any;
            if (s.name && !initialVals.storeName) {
              initialVals.storeName = s.name;
            }
            if (sAny.storeName && !initialVals.name) {
              initialVals.name = sAny.storeName;
            }
            if (sAny.customFields && typeof sAny.customFields === "object") {
              Object.assign(initialVals, sAny.customFields);
            }
            setValues(initialVals);

            // Pre-select project from existing store
            const storeProjId = s.projectId || (s.project && typeof s.project === "object" ? s.project._id : s.project);
            if (storeProjId) {
              setSelectedProjectId(String(storeProjId));
            }
          }
        } catch (err) {
          Alert.alert("Notice", "Could not fetch existing store data.");
        }
      } else {
        // Initialize default values defined in schema
        const initDefaults: Record<string, any> = {};
        loadedFields.forEach((f) => {
          if (f.defaultValue !== undefined) {
            initDefaults[f.name] = f.defaultValue;
          }
        });
        setValues(initDefaults);

        // Pre-select project
        if (paramProjectId) {
          setSelectedProjectId(paramProjectId);
        } else if (loadedProjects.length > 0) {
          setSelectedProjectId(loadedProjects[0]._id);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, paramProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleChange = (fieldName: string, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [fieldName]: value };
      if (fieldName === "storeName") {
        next.name = value;
      } else if (fieldName === "name") {
        next.storeName = value;
      }
      return next;
    });

    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const val = values[field.name];

      if (field.required) {
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);

        if (isEmpty) {
          if (field.name === "storeName" && values.name && String(values.name).trim()) {
            // satisfied
          } else if (field.name === "name" && values.storeName && String(values.storeName).trim()) {
            // satisfied
          } else {
            newErrors[field.name] = `${field.label || field.name} is required`;
          }
        }
      }

      if (field.validations && Array.isArray(field.validations) && val) {
        field.validations.forEach((rule) => {
          if (rule.type === "min" && typeof val === "string" && val.length < Number(rule.value)) {
            newErrors[field.name] = rule.message || `Minimum ${rule.value} characters required`;
          }
          if (rule.type === "max" && typeof val === "string" && val.length > Number(rule.value)) {
            newErrors[field.name] = rule.message || `Maximum ${rule.value} characters allowed`;
          }
        });
      }
    });

    const effectiveName = values.storeName || values.name;
    if (!effectiveName || !String(effectiveName).trim()) {
      newErrors["storeName"] = "Store name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        "Required Fields Missing",
        "Please fill in all mandatory fields before submitting."
      );
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = { ...values };

      const effectiveName = String(payload.storeName || payload.name || "").trim();
      const effectiveLocation = String(payload.location || "Main Yard").trim();
      const targetProjId = selectedProjectId || paramProjectId || (projects[0] ? projects[0]._id : undefined);

      const storePayload: StoreFormValues = {
        name: effectiveName,
        storeName: effectiveName,
        location: effectiveLocation,
        manager: payload.manager || "Unassigned",
        type: payload.type || "Store",
        status: payload.status || "Operational",
        ...payload,
        projectId: targetProjId,
        project: targetProjId,
      };

      if (isEditing && id) {
        await storeService.updateStore(id, storePayload);
        Alert.alert("Success", "Store facility updated successfully!");
      } else {
        await storeService.createStore(storePayload);
        Alert.alert("Success", "Store facility created successfully!");
      }

      router.back();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Creation Failed",
        err?.response?.data?.message || err?.message || "Failed to save store facility."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Store / Hub" : "Create Store / Hub"}
      subtitle={
        isEditing
          ? values.name || values.storeName || "Store Facility"
          : "Form Management Schema (create-store)"
      }
      showBack
      requiredPage="/stores"
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
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 80,
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text
            style={{
              marginTop: 14,
              fontSize: 13,
              fontWeight: "600",
              color: theme.textSecondary,
            }}
          >
            Loading store form schema...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingBottom: 40 }}>
          {/* Schema Indicator Banner */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: isDark ? "#262626" : "#F1F5F9",
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <SlidersHorizontal size={15} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: theme.text,
                  }}
                  numberOfLines={1}
                >
                  {formDef?.name || "Dynamic Store Schema"}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {fields.length} {fields.length === 1 ? "field" : "fields"} configured in Form Management
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: isDark ? "#064E3B" : "#D1FAE5",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle2 size={11} color="#059669" />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#059669",
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                }}
              >
                create-store
              </Text>
            </View>
          </View>

          {/* Project Assignment Section */}
          {projects.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <FolderGit2 size={16} color={theme.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
                    Assigned Project
                  </Text>
                </View>
                {selectedProject && (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: theme.primary }}>
                    {selectedProject.name}
                  </Text>
                )}
              </View>

              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 10 }}>
                Every store facility is cataloged under a parent engineering project.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {projects.map((proj) => {
                  const isSelected = proj._id === selectedProjectId;
                  return (
                    <TouchableOpacity
                      key={proj._id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedProjectId(proj._id)}
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
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                    >
                      {isSelected ? (
                        <Check size={13} color="#FFFFFF" />
                      ) : (
                        <FolderGit2 size={13} color={theme.textSecondary} />
                      )}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? "#FFFFFF" : theme.text,
                        }}
                      >
                        {proj.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Dynamic Form Renderer */}
          <DynamicFormRenderer
            fields={fields}
            values={values}
            errors={errors}
            onChange={handleChange}
            cardStyle={true}
          />

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 10,
              paddingTop: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
                disabled={saving}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                title={isEditing ? "Save Changes" : "Create Store"}
                onPress={handleSubmit}
                loading={saving}
                variant="primary"
                icon={<StoreIcon size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
