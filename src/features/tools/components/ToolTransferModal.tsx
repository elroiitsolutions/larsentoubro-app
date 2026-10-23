import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { ArrowRightLeft, Building2, Check, Search, AlertCircle, FileText } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { storeService } from '@/features/stores/services/storeService';
import { StoreRecord } from '@/features/stores/types';
import { toolService } from '../services/toolService';
import { ToolRecord } from '../types';

interface ToolTransferModalProps {
  visible: boolean;
  onClose: () => void;
  sourceStoreId: string;
  sourceStoreName?: string;
  toolIds: string[];
  selectedTools?: ToolRecord[];
  onSuccess: () => void;
}

export const ToolTransferModal: React.FC<ToolTransferModalProps> = ({
  visible,
  onClose,
  sourceStoreId,
  sourceStoreName,
  toolIds,
  selectedTools = [],
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loadingStores, setLoadingStores] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && sourceStoreId) {
      loadStoreAndSiblings();
    } else {
      resetForm();
    }
  }, [visible, sourceStoreId]);

  const resetForm = () => {
    setDestinationStoreId('');
    setRemarks('');
    setStoreSearch('');
    setStores([]);
  };

  const loadStoreAndSiblings = async () => {
    try {
      setLoadingStores(true);
      const res = await storeService.getStoreById(sourceStoreId);
      if (res) {
        const storeData = res;
        const proj = storeData.project as any;
        const projId = storeData.projectId || (typeof proj === 'object' ? proj?._id : proj);
        const pName = typeof proj === 'object' ? proj?.name : '';
        setProjectId(projId || null);
        setProjectName(pName || '');

        if (projId) {
          // L&T Business Rule Parity: Fetch sibling stores in the SAME project only
          const siblingStores = await storeService.getStores(projId);
          const validDestinations = (siblingStores || []).filter(
            (s: StoreRecord) => String(s._id) !== String(sourceStoreId)
          );
          setStores(validDestinations);
          if (validDestinations.length > 0) {
            setDestinationStoreId(validDestinations[0]._id);
          }
        } else {
          // Fallback if no project linked
          const allStores = await storeService.getStores();
          const validDestinations = (allStores || []).filter(
            (s: StoreRecord) => String(s._id) !== String(sourceStoreId)
          );
          setStores(validDestinations);
          if (validDestinations.length > 0) {
            setDestinationStoreId(validDestinations[0]._id);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load store for transfer:', err);
      Alert.alert('Notice', 'Could not load stores in this project.');
    } finally {
      setLoadingStores(false);
    }
  };

  const filteredStores = useMemo(() => {
    if (!storeSearch.trim()) return stores;
    const q = storeSearch.toLowerCase();
    return stores.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.storeCode?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q)
    );
  }, [stores, storeSearch]);

  const handleTransfer = async () => {
    if (!destinationStoreId) {
      Alert.alert('Validation Error', 'Please select a destination store within the same project.');
      return;
    }

    if (toolIds.length === 0) {
      Alert.alert('Validation Error', 'No equipment selected for transfer.');
      return;
    }

    // Check repair status
    const hasRepair = selectedTools.some((t) => (t.status || '').toLowerCase() === 'repair');
    if (hasRepair) {
      Alert.alert('Transfer Blocked', 'Selected equipment includes tools under Repair. Cannot transfer tools under Repair.');
      return;
    }

    // Check printed status
    const unprinted = selectedTools.filter((t) => !t.isPrinted);
    if (unprinted.length > 0) {
      Alert.alert(
        'QR Label Required',
        `All ${toolIds.length} tools must be marked as Printed before performing an inter-store transfer.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await toolService.transferTools({
        sourceStoreId,
        destinationStoreId,
        toolIds,
        remarks,
      });

      const selectedDest = stores.find((s) => s._id === destinationStoreId);
      const challanNo = (res as any)?.challan?.challanNumber || (res as any)?.data?.transferRef || '';

      Alert.alert(
        'Transfer Completed',
        `Successfully transferred ${toolIds.length} equipment unit(s) to ${
          selectedDest?.name || 'Destination Store'
        }.${challanNo ? `\n\nTransfer Challan Reference: ${challanNo}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Transfer Failed',
        err?.response?.data?.message || err?.message || 'Could not complete equipment transfer.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Transfer Equipment (${toolIds.length})`}
    >
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {/* Source Store & Project Banner */}
        <View
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
              Source Store / Facility
            </Text>
            {projectName ? (
              <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                Project: {projectName}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginTop: 3 }}>
            {sourceStoreName || 'Current Store Facility'}
          </Text>
        </View>

        {/* Policy Notice: Same Project Restriction */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            padding: 8,
            borderRadius: 8,
            backgroundColor: isDark ? '#1E2538' : '#EEF2FF',
            marginBottom: 12,
          }}
        >
          <AlertCircle size={13} color="#4F46E5" />
          <Text style={{ fontSize: 10, color: isDark ? '#C7D2FE' : '#3730A3', flex: 1 }}>
            L&T Policy: Equipment can only be transferred between stores belonging to the same project.
          </Text>
        </View>

        {/* Destination Facility Selector */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: theme.textSecondary,
              }}
            >
              Destination Facility ({stores.length} eligible)
            </Text>
          </View>

          {/* Quick Search if more than 3 stores */}
          {stores.length > 3 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isDark ? '#0F172A' : '#FAFAFA',
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 8,
              }}
            >
              <Search size={13} color={theme.textMuted} />
              <TextInput
                value={storeSearch}
                onChangeText={setStoreSearch}
                placeholder="Search destination facility..."
                placeholderTextColor={theme.textMuted}
                style={{ fontSize: 11, color: theme.text, flex: 1, padding: 0 }}
              />
            </View>
          )}

          {loadingStores ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                Loading sibling stores...
              </Text>
            </View>
          ) : stores.length === 0 ? (
            <View
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, textAlign: 'center' }}>
                No other stores exist in this project. Cross-project transfers are prohibited.
              </Text>
            </View>
          ) : (
            filteredStores.map((s) => {
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
                    padding: 10,
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
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                      {s.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                      Code: {s.storeCode || 'N/A'} • Location: {s.location || 'Site Facility'}
                    </Text>
                  </View>
                  {isSelected && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Transfer Remarks */}
        <Input
          label="Transfer Purpose / Movement Remarks"
          placeholder="e.g. Relocating to Pier 4, Section B assembly..."
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={2}
        />
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            title="Execute Transfer"
            disabled={stores.length === 0 || !destinationStoreId || submitting}
            loading={submitting}
            onPress={handleTransfer}
            icon={<ArrowRightLeft size={14} color="#FFFFFF" />}
          />
        </View>
      </View>
    </Modal>
  );
};
