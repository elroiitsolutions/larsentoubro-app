import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { profileService } from '@/features/profiles/services/profileService';
import { ProfileRecord } from '@/features/profiles/types';
import { toolService } from '../services/toolService';
import { ToolRecord } from '../types';

const REASON_OPTIONS = [
  'Beyond Economical Repair',
  'Damaged Beyond Use',
  'Safe Life Expired',
  'Obsolete / Phased Out',
  'Failed Load Proof Test',
  'Other',
];

interface ScrapModalProps {
  visible: boolean;
  onClose: () => void;
  tool?: ToolRecord | null;
  toolIds?: string[];
  onSuccess: () => void;
}

export const ScrapModal: React.FC<ScrapModalProps> = ({
  visible,
  onClose,
  tool,
  toolIds,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [scrapDealers, setScrapDealers] = useState<ProfileRecord[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [scrapValue, setScrapValue] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDealers();
    }
  }, [visible]);

  const loadDealers = async () => {
    try {
      const dealers = await profileService.getProfiles('ScrapDealer');
      setScrapDealers(dealers);
      if (dealers.length > 0) {
        setSelectedDealerId(dealers[0]._id);
      }
    } catch {
      // Ignored fallback
    }
  };

  const handleConfirmScrap = async () => {
    const ids = toolIds && toolIds.length > 0 ? toolIds : tool ? [tool._id] : [];
    if (ids.length === 0) {
      Alert.alert('Error', 'No tools selected for scrapping.');
      return;
    }

    try {
      setSubmitting(true);
      const selectedDealer = scrapDealers.find((d) => d._id === selectedDealerId);

      await toolService.scrapTools({
        toolIds: ids,
        scrapDealerId: selectedDealerId || undefined,
        scrapDealerName: selectedDealer?.name || undefined,
        scrapReason: reason,
        scrapValue: scrapValue ? parseFloat(scrapValue) : undefined,
        remarks,
        scrapDate: new Date().toISOString().split('T')[0],
      });

      Alert.alert('Success', 'Equipment moved to Scrap Register successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Scrap Failed',
        err?.response?.data?.message || err?.message || 'Could not scrap tool.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const targetCount = toolIds?.length || (tool ? 1 : 0);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Scrap Equipment (${targetCount} Unit${targetCount === 1 ? '' : 's'})`}
    >
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        {tool && (
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 12,
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
              {tool.name || tool.description}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.textMuted }}>
              Code: {tool.toolCode || tool.toolId} • SN: {tool.serialNumber || 'N/A'}
            </Text>
          </View>
        )}

        {/* Reason Selector */}
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
            Scrap Reason
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {REASON_OPTIONS.map((r) => {
              const isSelected = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.7}
                  onPress={() => setReason(r)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? theme.danger : isDark ? '#1E293B' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected ? theme.danger : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: isSelected ? '#FFFFFF' : theme.text,
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Scrap Dealer Selector */}
        {scrapDealers.length > 0 && (
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
              Assigned Scrap Dealer
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {scrapDealers.map((d) => {
                const isSelected = selectedDealerId === d._id;
                return (
                  <TouchableOpacity
                    key={d._id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedDealerId(d._id)}
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
                      {d.name} ({d.code})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Input
          label="Recovered Scrap Value (INR)"
          placeholder="e.g. 5000"
          value={scrapValue}
          onChangeText={setScrapValue}
          keyboardType="numeric"
        />

        <Input
          label="Scrap Notes & Authorization Remarks"
          placeholder="Disposal certificate ref, surveyor approval..."
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={2}
        />
      </ScrollView>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button
            title="Confirm Scrap"
            variant="destructive"
            loading={submitting}
            onPress={handleConfirmScrap}
          />
        </View>
      </View>
    </Modal>
  );
};
