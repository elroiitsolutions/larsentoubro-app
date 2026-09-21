import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { RotateCcw, Check, Package } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { challanService } from '../services/challanService';
import { ChallanRecord } from '../types';

interface CreateReturnChallanModalProps {
  visible: boolean;
  onClose: () => void;
  deliveryChallan: ChallanRecord;
  onSuccess: () => void;
}

export const CreateReturnChallanModal: React.FC<CreateReturnChallanModalProps> = ({
  visible,
  onClose,
  deliveryChallan,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [selectedItemIndexes, setSelectedItemIndexes] = useState<number[]>(
    deliveryChallan.items?.map((_, idx) => idx) || []
  );
  const [returnRemarks, setReturnRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleItem = (index: number) => {
    setSelectedItemIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleCreateReturn = async () => {
    if (selectedItemIndexes.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one item to return.');
      return;
    }

    try {
      setSubmitting(true);
      const itemsToReturn = selectedItemIndexes.map((idx) => {
        const item = deliveryChallan.items[idx];
        return {
          toolId: item.toolId || (item as any).tool,
          toolCode: item.toolCode,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'NOS',
          returnStatus: 'Returned',
          condition: 'Good',
        };
      });

      const payload = {
        referenceDcId: deliveryChallan._id,
        vendorId: deliveryChallan.vendor?._id || deliveryChallan.vendor,
        storeId: deliveryChallan.store?._id || deliveryChallan.store,
        challanDate: new Date().toISOString().split('T')[0],
        remarks: returnRemarks,
        items: itemsToReturn,
      };

      await challanService.createReturnChallan(payload);
      Alert.alert('Success', 'Return Challan (RC) created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not generate return challan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Create Return Challan (RC)"
    >
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
          Select equipment items to accept back into store inventory from DC #{deliveryChallan.challanNumber || deliveryChallan._id}:
        </Text>

        {/* Item Selection List */}
        {deliveryChallan.items?.map((item, index) => {
          const isSelected = selectedItemIndexes.includes(index);
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => toggleItem(index)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                backgroundColor: isSelected
                  ? isDark
                    ? '#1E2538'
                    : '#EEF2FF'
                  : isDark
                  ? '#1E293B'
                  : '#F8FAFC',
                borderWidth: 1,
                borderColor: isSelected ? theme.primary : theme.border,
                marginBottom: 8,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: isSelected ? theme.primary : 'transparent',
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                  {item.description || `Item #${index + 1}`}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'monospace', color: theme.textMuted }}>
                  Code: {item.toolCode || 'N/A'} • Qty: {item.quantity} {item.unit || 'NOS'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Input
          label="Return Inspection / Inward Remarks"
          placeholder="Condition verified upon receipt, bay location..."
          value={returnRemarks}
          onChangeText={setReturnRemarks}
          multiline
          numberOfLines={2}
        />
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View style={{ flex: 1.3 }}>
          <Button
            title="Generate RC"
            loading={submitting}
            onPress={handleCreateReturn}
            icon={<RotateCcw size={14} color="#FFFFFF" />}
          />
        </View>
      </View>
    </Modal>
  );
};
