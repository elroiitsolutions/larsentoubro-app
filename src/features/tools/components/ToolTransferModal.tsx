import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowRightLeft, Building2, Check } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { storeService } from '@/features/stores/services/storeService';
import { StoreRecord } from '@/features/stores/types';
import { toolService } from '../services/toolService';

interface ToolTransferModalProps {
  visible: boolean;
  onClose: () => void;
  sourceStoreId: string;
  sourceStoreName?: string;
  toolIds: string[];
  onSuccess: () => void;
}

export const ToolTransferModal: React.FC<ToolTransferModalProps> = ({
  visible,
  onClose,
  sourceStoreId,
  sourceStoreName,
  toolIds,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadStores();
    }
  }, [visible]);

  const loadStores = async () => {
    try {
      const allStores = await storeService.getStores();
      // Filter out source store
      const destCandidates = allStores.filter((s) => s._id !== sourceStoreId);
      setStores(destCandidates);
      if (destCandidates.length > 0) {
        setDestinationStoreId(destCandidates[0]._id);
      }
    } catch {
      // Ignored
    }
  };

  const handleTransfer = async () => {
    if (!destinationStoreId) {
      Alert.alert('Error', 'Please select a destination store.');
      return;
    }

    try {
      setSubmitting(true);
      await toolService.transferTools({
        sourceStoreId,
        destinationStoreId,
        toolIds,
        remarks,
      });

      Alert.alert('Success', `${toolIds.length} equipment units transferred successfully.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Transfer Failed', err?.message || 'Could not transfer tools.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Transfer ${toolIds.length} Equipment Unit${toolIds.length === 1 ? '' : 's'}`}
    >
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        {/* Source Store */}
        <View
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            padding: 12,
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
            Source Store / Facility
          </Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginTop: 2 }}>
            {sourceStoreName || 'Current Store'}
          </Text>
        </View>

        {/* Destination Store Selector */}
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
            Destination Facility
          </Text>

          {stores.map((s) => {
            const isSelected = destinationStoreId === s._id;
            return (
              <TouchableOpacity
                key={s._id}
                activeOpacity={0.7}
                onPress={() => setDestinationStoreId(s._id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isSelected
                    ? isDark
                      ? '#1E2538'
                      : '#EEF2FF'
                    : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                  marginBottom: 6,
                }}
              >
                <View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                    {s.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    {s.location || 'Store Facility'}
                  </Text>
                </View>
                {isSelected && <Check size={16} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Transfer Purpose / Movement Remarks"
          placeholder="e.g. Dispatched for Project Pier casting work..."
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={2}
        />
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button
            title="Execute Transfer"
            loading={submitting}
            onPress={handleTransfer}
          />
        </View>
      </View>
    </Modal>
  );
};
