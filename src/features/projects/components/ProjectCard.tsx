import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import {
  FolderGit2,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react-native";
import { ProjectRecord } from "../types";
import { useAppTheme } from "@/context/ThemeContext";

interface ProjectCardProps {
  project: ProjectRecord;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onPress,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const { theme, isDark } = useAppTheme();

  const getStatusMeta = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return {
          color: "#059669",
          bg: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
          border: isDark ? "#065F46" : "#A7F3D0",
          label: "Active",
        };
      case "in progress":
        return {
          color: "#2563EB",
          bg: isDark ? "rgba(37, 99, 235, 0.2)" : "#EFF6FF",
          border: isDark ? "#1E40AF" : "#BFDBFE",
          label: "In Progress",
        };
      case "on hold":
        return {
          color: "#D97706",
          bg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FFFBEB",
          border: isDark ? "#92400E" : "#FDE68A",
          label: "On Hold",
        };
      case "completed":
        return {
          color: "#7C3AED",
          bg: isDark ? "rgba(124, 58, 237, 0.2)" : "#FAF5FF",
          border: isDark ? "#5B21B6" : "#E9D5FF",
          label: "Completed",
        };
      default:
        return {
          color: "#6f6acbff",
          bg: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
          border: isDark ? "#3730A3" : "#C7D2FE",
          label: status || "Active",
        };
    }
  };

  const statusMeta = getStatusMeta(project.status);
  const projectCode = project.projectCode || project._id.substring(project._id.length - 6).toUpperCase();

  return (
    <View
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#E2E8F0",
        position: "relative",
        overflow: "hidden",
        ...Platform.select({
          web: { boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.06)" },
          default: { elevation: 2 },
        }),
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ padding: 15 }}
      >
        {/* Header Row: Icon, Title, ID, and Status Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(79, 70, 229, 0.18)" : "#EEF2FF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                borderWidth: 1,
                borderColor: isDark ? "#3730A3" : "#C7D2FE",
              }}
            >
              <FolderGit2 size={20} color="#4F46E5" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: theme.text,
                  letterSpacing: -0.3,
                  lineHeight: 19,
                }}
                numberOfLines={1}
              >
                {project.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                <View
                  style={{
                    backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: "700",
                      color: theme.textSecondary,
                    }}
                  >
                    #{projectCode}
                  </Text>
                </View>
                {project.department && (
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: theme.textSecondary,
                      fontWeight: "500",
                    }}
                    numberOfLines={1}
                  >
                    • {project.department}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: statusMeta.bg,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: statusMeta.border,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusMeta.color,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: statusMeta.color,
                letterSpacing: 0.2,
                textTransform: "uppercase",
              }}
            >
              {statusMeta.label}
            </Text>
          </View>
        </View>

        {/* Footer: Explore Action Link & Manage Buttons */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: -0.1,
              }}
            >
              Stores & Facilities
            </Text>
            <ChevronRight size={14} color={theme.primary} strokeWidth={2.5} />
          </View>

          {canManage && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {onEdit && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  }}
                  accessibilityLabel="Edit Project"
                >
                  <Edit2 size={13} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEE2E2",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "#7F1D1D" : "#FECACA",
                  }}
                  accessibilityLabel="Delete Project"
                >
                  <Trash2 size={13} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ProjectCard;
