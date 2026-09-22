import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  Wrench,
  Shield,
  Calendar,
  Layers,
  Tag,
  Hash,
  Building,
  Clock,
  CalendarCheck,
  Building2,
  FileCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  ToolRecord,
  resolveValidationValue,
  calculateValidUntilDate,
} from '../types';

interface ToolPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  tool?: ToolRecord | null;
  onViewFullDetails?: () => void;
}

export const ToolPreviewModal: React.FC<ToolPreviewModalProps> = ({
  visible,
  onClose,
  tool,
  onViewFullDetails,
}) => {
  if (!tool) return null;

  const validationVal = resolveValidationValue(tool);
  const validUntilVal = calculateValidUntilDate(tool.dateOfSupply, validationVal);

  return (
    <Modal visible={visible} onClose={onClose} title="Tool Quick Preview">
      <ScrollView
        style={{ maxHeight: 460 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {/* Tool Header Card */}
        <View className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {tool.name || tool.description || tool.toolType || 'Industrial Equipment'}
              </Text>
              <Text className="text-xs font-mono text-slate-400 mt-0.5">
                ID: {tool.toolId || tool.toolCode || tool._id.substring(tool._id.length - 6).toUpperCase()}{tool.toolCode && tool.toolId ? ` • Code: ${tool.toolCode}` : ""}
              </Text>
            </View>
            <StatusBadge status={tool.status || 'Available'} size="md" />
          </View>
        </View>

        {/* Validation & Compliance Banner (Highlighting Validation) */}
        <View className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Clock size={15} color="#D97706" />
              <Text className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Validation
              </Text>
            </View>
            <Text className="text-xs font-bold text-amber-900 dark:text-amber-100">
              {validationVal}
            </Text>
          </View>

          {validUntilVal !== '-' && (
            <View className="flex-row items-center justify-between mt-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40">
              <View className="flex-row items-center gap-1.5">
                <CalendarCheck size={14} color="#D97706" />
                <Text className="text-[11px] text-amber-800 dark:text-amber-300">
                  Valid Until
                </Text>
              </View>
              <Text className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                {validUntilVal}
              </Text>
            </View>
          )}
        </View>

        {/* Specs Details List */}
        <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 gap-2.5 border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Tag size={14} color="#64748B" className="mr-2" />
              <Text className="text-xs text-slate-500">Category</Text>
            </View>
            <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {tool.category || tool.toolType || 'General'}
            </Text>
          </View>

          {tool.serialNumber && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <Hash size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Serial No</Text>
              </View>
              <Text className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                {tool.serialNumber}
              </Text>
            </View>
          )}

          {tool.capacity && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <Layers size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Capacity</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tool.capacity}
              </Text>
            </View>
          )}

          {tool.safeWorkingLoad && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <Shield size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Safe Working Load (SWL)</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tool.safeWorkingLoad}
              </Text>
            </View>
          )}

          {tool.dateOfSupply && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <Calendar size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Date of Supply</Text>
              </View>
              <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {tool.dateOfSupply}
              </Text>
            </View>
          )}

          {tool.purchaserName && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <Building size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Purchaser</Text>
              </View>
              <Text className="text-xs font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                {tool.purchaserName}
              </Text>
            </View>
          )}

          {tool.testCertificate && (
            <View className="flex-row items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
              <View className="flex-row items-center">
                <FileCheck size={14} color="#10B981" className="mr-2" />
                <Text className="text-xs text-slate-500">Test Certificate</Text>
              </View>
              <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {tool.testCertificate}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Close" variant="outline" onPress={onClose} />
        </View>
        {onViewFullDetails && (
          <View className="flex-1">
            <Button
              title="Full Details"
              onPress={() => {
                onClose();
                onViewFullDetails();
              }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};
