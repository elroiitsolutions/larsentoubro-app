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
import { projectService } from "@/features/projects/services/projectService";
import { DynamicFieldsSection } from "@/components/common/DynamicFieldsSection";
import { FormFieldDefinition } from "@/services/formService";

const STATUS_OPTIONS = ["Active", "In Progress", "On Hold", "Completed", "Pending"];

export default function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const isEditing = !!id;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [dynamicFields, setDynamicFields] = useState<FormFieldDefinition[]>([]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [department, setDepartment] = useState("");
  const [lead, setLead] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Active");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    async function loadProject() {
      try {
        setLoading(true);
        const p = await projectService.getProjectById(id!);
        if (p) {
          setName(p.name || "");
          setProjectCode(p.projectCode || "");
          setDepartment(p.department || "");
          setLead(p.lead || p.incharge || "");
          setLocation(p.location || "");
          setStatus(p.status || "Active");
          setBudget(p.budget ? String(p.budget) : "");
          setDeadline(p.deadline || "");
          setDescription(p.description || "");

          const pAny = p as any;
          const dynInit: Record<string, any> = {};
          if (pAny.customFields && typeof pAny.customFields === "object") {
            Object.assign(dynInit, pAny.customFields);
          }
          const coreKeys = [
            "name", "projectName", "projectCode", "department", "lead", "incharge",
            "location", "status", "budget", "deadline", "description", "_id", "id",
            "createdAt", "updatedAt", "__v", "customFields"
          ];
          Object.keys(pAny).forEach((key) => {
            if (!coreKeys.includes(key)) {
              dynInit[key] = pAny[key];
            }
          });
          setDynamicValues(dynInit);
        }
      } catch (err) {
        Alert.alert("Notice", "Could not fetch existing project data.");
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Project name is required.");
      return;
    }

    // Validate required custom dynamic fields
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
        projectName: name.trim(),
        projectCode: projectCode.trim() || undefined,
        department: department.trim() || undefined,
        lead: lead.trim() || undefined,
        location: location.trim() || undefined,
        status,
        budget: budget.trim() ? Number(budget.trim()) : undefined,
        description: description.trim() || undefined,
        deadline: deadline.trim() || undefined,
        ...dynamicValues,
        customFields: dynamicValues,
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

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Project" : "Create New Project"}
      subtitle={isEditing ? `Updating project code ${projectCode || id}` : "Enterprise Construction & Infrastructure"}
      showBackButton={true}
      scrollable={true}
    >
      {loading ? (
        <View style={{ paddingVertical: 50, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading project information...
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
            label="Project Name *"
            placeholder="e.g. Metro Rail Phase 2 - Elevated Corridor"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Project Code"
                placeholder="e.g. PRJ-MR-02"
                value={projectCode}
                onChangeText={setProjectCode}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Department"
                placeholder="e.g. Heavy Civil"
                value={department}
                onChangeText={setDepartment}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Project Incharge / Lead"
                placeholder="e.g. Rajesh Sharma"
                value={lead}
                onChangeText={setLead}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Site Location"
                placeholder="e.g. Sector 62, Noida"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Status Selection */}
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
              Project Lifecycle Status
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Estimated Budget (INR)"
                placeholder="e.g. 50000000"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Target Deadline"
                placeholder="YYYY-MM-DD"
                value={deadline}
                onChangeText={setDeadline}
              />
            </View>
          </View>

          <Input
            label="Project Description & Scope"
            placeholder="Detailed scope, milestone summary, and execution specs..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Custom Dynamic Fields Configured from Settings */}
          <DynamicFieldsSection
            slug="create-project"
            values={dynamicValues}
            onChange={(key, val) =>
              setDynamicValues((prev) => ({ ...prev, [key]: val }))
            }
            onFieldsLoaded={setDynamicFields}
            excludeFieldNames={[
              "name",
              "projectName",
              "projectCode",
              "department",
              "lead",
              "location",
              "status",
              "budget",
              "deadline",
              "description",
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
