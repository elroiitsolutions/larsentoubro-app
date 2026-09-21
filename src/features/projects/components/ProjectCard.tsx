import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  FolderGit2,
  MapPin,
  User,
  Calendar,
  DollarSign,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react-native";
import { ProjectRecord } from "../types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";

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
  return (
    <Card className="p-4 mb-3">
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        {/* Top Row: Icon, Title, Status */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 items-center justify-center mr-3">
              <FolderGit2 size={20} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-bold text-slate-900 dark:text-white"
                numberOfLines={1}
              >
                {project.name}
              </Text>
              <Text className="text-[11px] font-mono text-slate-400">
                ID: {project._id.substring(project._id.length - 6).toUpperCase()}
                {project.projectCode ? ` • ${project.projectCode}` : ""}
              </Text>
            </View>
          </View>

          <StatusBadge status={project.status || "Active"} size="sm" />
        </View>

        {/* Details Grid */}
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3 gap-1.5 border border-slate-100 dark:border-slate-800">
          {(project.lead || project.incharge) && (
            <View className="flex-row items-center">
              <User size={12} color="#64748B" className="mr-1.5" />
              <Text className="text-xs text-slate-500 mr-1.5">Lead:</Text>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {project.lead || project.incharge}
              </Text>
            </View>
          )}

          {(project.location || project.department) && (
            <View className="flex-row items-center">
              <MapPin size={12} color="#64748B" className="mr-1.5" />
              <Text className="text-xs text-slate-500 mr-1.5">Location:</Text>
              <Text className="text-xs text-slate-700 dark:text-slate-300">
                {project.location || project.department}
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 mt-1">
            {project.budget ? (
              <View className="flex-row items-center">
                <DollarSign size={12} color="#10B981" />
                <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {typeof project.budget === "number"
                    ? `₹${project.budget.toLocaleString()}`
                    : project.budget}
                </Text>
              </View>
            ) : (
              <View />
            )}

            {project.deadline || project.endDate ? (
              <View className="flex-row items-center">
                <Calendar size={12} color="#94A3B8" className="mr-1" />
                <Text className="text-[11px] text-slate-400">
                  {project.deadline || project.endDate}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom Actions Row */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
              View Stores & Inventory
            </Text>
            <ChevronRight size={14} color="#4F46E5" />
          </View>

          {canManage && (
            <View className="flex-row items-center gap-1">
              {onEdit && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <Edit2 size={14} color="#475569" />
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50"
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};
