import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProjectRecord, ProjectFormValues } from "../types";
import { projectService } from "../services/projectService";

interface ProjectFormModalProps {
  visible: boolean;
  onClose: () => void;
  project?: ProjectRecord | null;
  onSuccess: () => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  visible,
  onClose,
  project,
  onSuccess,
}) => {
  const isEditing = !!project;
  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [department, setDepartment] = useState("");
  const [lead, setLead] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Active");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setProjectCode(project.projectCode || "");
      setDepartment(project.department || "");
      setLead(project.lead || project.incharge || "");
      setLocation(project.location || "");
      setStatus(project.status || "Active");
      setBudget(project.budget ? String(project.budget) : "");
      setDescription(project.description || "");
      setDeadline(project.deadline || "");
    } else {
      setName("");
      setProjectCode("");
      setDepartment("");
      setLead("");
      setLocation("");
      setStatus("Active");
      setBudget("");
      setDescription("");
      setDeadline("");
    }
  }, [project, visible]);

  const statuses = ["Active", "In Progress", "On Hold", "Completed", "Pending"];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        projectName: name.trim(),
        projectCode: projectCode.trim() || undefined,
        department: department.trim() || undefined,
        lead: lead.trim() || undefined,
        location: location.trim() || undefined,
        status,
        budget: budget.trim() || undefined,
        description: description.trim() || undefined,
        deadline: deadline.trim() || undefined,
      };

      if (isEditing && project?._id) {
        await projectService.updateProject(project._id, payload);
        Alert.alert("Success", "Project updated successfully!");
      } else {
        await projectService.createProject(payload);
        Alert.alert("Success", "Project created successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Creation Failed",
        err?.response?.data?.message || err?.message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Edit Project" : "Create New Project"}
    >
      <ScrollView className="max-h-[480px]" showsVerticalScrollIndicator={false}>
        <Input
          label="Project Name *"
          placeholder="e.g. Metro Line 3 Extension"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <Input
          label="Project Code"
          placeholder="e.g. PRJ-2026-001"
          value={projectCode}
          onChangeText={setProjectCode}
          editable={!loading}
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Department"
              placeholder="e.g. Civil Works"
              value={department}
              onChangeText={setDepartment}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Lead / In-Charge"
              placeholder="e.g. Rajesh Sharma"
              value={lead}
              onChangeText={setLead}
              editable={!loading}
            />
          </View>
        </View>

        <Input
          label="Site Location"
          placeholder="e.g. Mumbai Metro Site A"
          value={location}
          onChangeText={setLocation}
          editable={!loading}
        />

        {/* Status Selection */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Project Status
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {statuses.map((st) => {
              const isSelected = status === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setStatus(st)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Budget"
              placeholder="e.g. ₹5,000,000"
              value={budget}
              onChangeText={setBudget}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Deadline"
              placeholder="e.g. Dec 2026"
              value={deadline}
              onChangeText={setDeadline}
              editable={!loading}
            />
          </View>
        </View>

        <Input
          label="Description / Scope"
          placeholder="Brief description of project requirements"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          editable={!loading}
        />
      </ScrollView>

      <View className="flex-row gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} />
        </View>
        <View className="flex-1">
          <Button
            title={isEditing ? "Save Changes" : "Create Project"}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
};
