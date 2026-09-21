import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Clock, Info, Check } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { toolService } from '../services/toolService';

interface BulkEditModalProps {
  visible: boolean;
  onClose: () => void;
  toolIds: string[];
  storeId?: string;
  onSuccess: () => void;
}

const STATUS_OPTIONS = ['Available', 'Issued', 'Under Maintenance', 'Inspection Due', 'Damaged', 'Scrap'];
const VALIDATION_PRESETS = ['1 Year', '2 Years', '3 Years', '5 Years'];

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  visible,
  onClose,
  toolIds,
  storeId,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [validation, setValidation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApplyBulkEdit = async () => {
    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (category) updates.category = category;
    if (validation) {
      updates.validityPeriod = validation;
      updates.validation = validation;
    }

    if (Object.keys(updates).length === 0) {
      Alert.alert('Notice', 'Please select at least one field to update.');
      return;
    }

    try {
      setSubmitting(true);
      await toolService.bulkEditTools(storeId, {
        toolIds,
        updates,
      });

      Alert.alert(
        'Success',
        `Bulk update applied to ${toolIds.length} equipment units.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Bulk Edit Failed', err?.message || 'Could not apply updates.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Bulk Edit (${toolIds.length} Units)`}
    >
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: theme.textSecondary,
              marginBottom: 8,
            }}
          >
            Update Operational Status
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {STATUS_OPTIONS.map((s) => {
              const isSelected = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  activeOpacity={0.7}
                  onPress={() => setStatus(isSelected ? '' : s)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: isSelected ? '#FFFFFF' : theme.text,
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Validation */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Clock size={14} color="#D97706" />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: theme.textSecondary,
              }}
            >
              Add Validation Period
            </Text>
          </View>

          {/* Presets */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {VALIDATION_PRESETS.map((v) => {
              const isSelected = validation === v;
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.7}
                  onPress={() => setValidation(isSelected ? '' : v)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#D97706' : isDark ? '#1E293B' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected ? '#D97706' : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: isSelected ? '#FFFFFF' : theme.text,
                    }}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additive logic notice */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              backgroundColor: isDark ? '#1E2530' : '#F0FDF4',
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? '#2D3748' : '#DCFCE7',
              gap: 8,
            }}
          >
            <Info size={15} color="#16A34A" style={{ marginTop: 1 }} />
            <Text
              style={{
                fontSize: 11,
                color: isDark ? '#86EFAC' : '#15803D',
                flex: 1,
                lineHeight: 16,
              }}
            >
              Entering/selecting validation years in bulk edit automatically adds with each tool's existing validation years (e.g. Tool with 1 Year + 2 Years = 3 Years).
            </Text>
          </View>
        </View>

        <Input
          label="Update Category (Optional)"
          placeholder="e.g. Rigging & Lifting"
          value={category}
          onChangeText={setCategory}
        />
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button
            title="Apply to All"
            loading={submitting}
            onPress={handleApplyBulkEdit}
          />
        </View>
      </View>
    </Modal>
  );
};
