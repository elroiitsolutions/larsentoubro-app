import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  FolderKanban,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { projectService } from "@/features/projects/services/projectService";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import { DynamicFormRenderer } from "@/components/common/DynamicFormRenderer";

const FALLBACK_FIELDS: FormFieldDefinition[] = [
  {
    name: "projectName",
    label: "Project Name",
    type: "text",
    required: true,
    placeholder: "e.g. Metro Rail Phase 2 - Elevated Corridor",
  },
  {
    name: "projectCode",
    label: "Project Code",
    type: "text",
    placeholder: "e.g. PRJ-MR-02",
  },
];

export default function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Dynamic Form Schema configured in Form Management
      let loadedFields: FormFieldDefinition[] = FALLBACK_FIELDS;
      try {
        const schema = await formService.getFormBySlug("create-project");
        if (schema && Array.isArray(schema.fields) && schema.fields.length > 0) {
          setFormDef(schema);
          loadedFields = schema.fields;
          setFields(schema.fields);
        } else {
          setFormDef({
            slug: "create-project",
            name: "Create Project",
            description: "Dynamic schema and validation rules for creating new enterprise projects.",
            fields: FALLBACK_FIELDS,
          });
          setFields(FALLBACK_FIELDS);
        }
      } catch (e) {
        setFields(FALLBACK_FIELDS);
      }

      // 2. If editing existing project, fetch project details
      if (id) {
        try {
          const p = await projectService.getProjectById(id);
          if (p) {
            const initialVals: Record<string, any> = { ...p };
            // Ensure bidirectional compatibility between `name` and `projectName`
            const pAny = p as any;
            if (p.name && !initialVals.projectName) {
              initialVals.projectName = p.name;
            }
            if (pAny.projectName && !initialVals.name) {
              initialVals.name = pAny.projectName;
            }
            setValues(initialVals);
          }
        } catch (err) {
          Alert.alert("Notice", "Could not fetch existing project data.");
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
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

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
      // Sync name & projectName
      if (fieldName === "projectName") {
        next.name = value;
      } else if (fieldName === "name") {
        next.projectName = value;
      }
      return next;
    });

    // Clear error for this field if present
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    // 1. Validate fields according to the dynamic schema
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const isRequired = Boolean(
        field.required ||
          (Array.isArray(field.validations) &&
            field.validations.some((v: any) => v.type === "required"))
      );
      const val = values[field.name];
      if (
        isRequired &&
        (val === undefined || val === null || String(val).trim() === "")
      ) {
        newErrors[field.name] = `${field.label || field.name} is required`;
      }
    }

    // Always ensure project name is present
    const resolvedName = (values.name || values.projectName || "").trim();
    if (!resolvedName) {
      newErrors["projectName"] = "Project Name is required";
      newErrors["name"] = "Project Name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...values,
        name: resolvedName,
        projectName: resolvedName,
      };

      if (isEditing && id) {
        await projectService.updateProject(id, payload);
        Alert.alert("Success", "Project updated successfully!");
      } else {
        await projectService.createProject(payload);
        Alert.alert("Success", "Project created successfully!");
      }

      router.back();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Creation Failed",
        err?.response?.data?.message || err?.message || "Failed to save project."
      );
    } finally {
      setSaving(false);
    }
  };

  const projectCode =
    values.projectCode || (id ? id.substring(id.length - 6).toUpperCase() : "PRJ");
  const projectName = values.name || values.projectName || "New Project";

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Project" : "Add Project"}
      subtitle={
        isEditing
          ? `Project #${projectCode} • ${projectName}`
          : formDef?.description || "Dynamic Form Management Schema"
      }
      showBackButton={true}
      requiredPage="/projects"
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
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 13,
              fontWeight: "500",
              marginTop: 12,
            }}
          >
            Loading form schema from Form Management...
          </Text>
        </View>
      ) : (
        <View style={{ paddingBottom: 40 }}>
          {/* Form Schema Info Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
          </View>
          {/* DYNAMIC FORM FIELDS (Rendered directly from Form Management schema) */}
          <DynamicFormRenderer
            fields={fields}
            values={values}
            onChange={handleChange}
            errors={errors}
            cardStyle={true}
          />

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 6,
              paddingTop: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                title={isEditing ? "Update Project" : "Create Project"}
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
