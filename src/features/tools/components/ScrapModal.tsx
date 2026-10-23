import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Archive, AlertCircle, Building2, Check, ArrowRight } from 'lucide-react-native';
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
  'Mechanical / Structural Failure',
  'Safe Life / Certificate Expired',
  'Obsolete / Phased Out',
  'Failed Load Proof Inspection',
  'Corroded / Extreme Weather Damage',
  'Other',
];

interface ScrapModalProps {
  visible: boolean;
  onClose: () => void;
  tool?: ToolRecord | null;
  toolIds?: string[];
  selectedTools?: ToolRecord[];
  onSuccess: () => void;
}

export const ScrapModal: React.FC<ScrapModalProps> = ({
  visible,
  onClose,
  tool,
  toolIds,
  selectedTools = [],
  onSuccess,
}) => {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [scrapDealers, setScrapDealers] = useState<ProfileRecord[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState('');
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
      setScrapDealers(dealers || []);
    } catch {
      // Ignored fallback
    }
  };

  const handleConfirmScrap = async () => {
    const ids = toolIds && toolIds.length > 0 ? toolIds : tool ? [tool._id] : [];
    if (ids.length === 0) {
      Alert.alert('Validation Error', 'No equipment selected for scrapping.');
      return;
    }

    // Validation 1: All tools must be printed before moving to scrap
    const unprinted = selectedTools.filter((t) => !t.isPrinted);
    if (unprinted.length > 0) {
      Alert.alert(
        'QR Label Required',
        `All selected equipment must be marked as Printed before moving to Scrap.`
      );
      return;
    }

    // Validation 2: Cannot scrap tools that are currently under Repair
    const repairTools = selectedTools.filter(
      (t) => (t.status || '').toLowerCase() === 'repair'
    );
    if (repairTools.length > 0) {
      Alert.alert(
        'Action Blocked',
        'Selected equipment includes tools under Repair. To move a tool under repair to scrap, complete the Inspection workflow.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const effectiveReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;
      const combinedReason = remarks.trim() ? `${effectiveReason} - ${remarks.trim()}` : effectiveReason;

      const selectedDealer = scrapDealers.find((d) => d._id === selectedDealerId);

      if (selectedDealerId) {
        await toolService.scrapTools({
          toolIds: ids,
          scrapDealerId: selectedDealerId,
          scrapDealerName: selectedDealer?.name || undefined,
          scrapReason: combinedReason,
          scrapValue: scrapValue ? parseFloat(scrapValue) : undefined,
          remarks: remarks.trim() || undefined,
          scrapDate: new Date().toISOString().split('T')[0],
        });
      } else {
        await toolService.bulkScrapTools(ids, combinedReason);
      }

      Alert.alert(
        'Moved to Scrap Register',
        `${ids.length} equipment unit(s) moved to Scrap successfully.`,
        [
          {
            text: 'View Scrap Register',
            onPress: () => {
              onSuccess();
              onClose();
              router.push('/scrap' as any);
            },
          },
          {
            text: 'Done',
            style: 'default',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Scrap Failed',
        err?.response?.data?.message || err?.message || 'Could not move equipment to scrap.'
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
      title={`Move to Scrap (${targetCount} Unit${targetCount === 1 ? '' : 's'})`}
    >
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: isDark ? '#78350F' : '#FDE68A',
          }}
        >
          <AlertCircle size={15} color="#D97706" style={{ marginTop: 1 }} />
          <Text style={{ fontSize: 11, color: isDark ? '#FDE68A' : '#92400E', flex: 1, lineHeight: 15 }}>
            Selected equipment will be decommissioned and transferred to the Scrap Register. Store associations are preserved.
          </Text>
        </View>

        {tool && (
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 10,
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
              {tool.name || tool.description || 'Equipment Item'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'monospace', color: theme.textSecondary, marginTop: 2 }}>
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
            Scrap Justification / Reason
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
                    backgroundColor: isSelected ? '#E11D48' : isDark ? '#1E293B' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected ? '#E11D48' : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? '700' : '500',
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

        {reason === 'Other' && (
          <Input
            label="Specific Scrap Reason"
            placeholder="Describe the condition or failure cause..."
            value={customReason}
            onChangeText={setCustomReason}
          />
        )}

        {/* Optional Scrap Dealer Assignment */}
        {scrapDealers.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: theme.textSecondary,
                marginBottom: 4,
              }}
            >
              Assign Scrap Dealer (Optional)
            </Text>
            <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 8 }}>
              You can assign now or issue a Scrap Delivery Challan (SDC) later from the Scrap Register.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedDealerId('')}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: !selectedDealerId ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: !selectedDealerId ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: !selectedDealerId ? '700' : '500',
                    color: !selectedDealerId ? '#FFFFFF' : theme.text,
                  }}
                >
                  None (Scrap Register Only)
                </Text>
              </TouchableOpacity>

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
                        fontWeight: isSelected ? '700' : '500',
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

        {selectedDealerId ? (
          <Input
            label="Estimated Recovered Scrap Value (INR)"
            placeholder="e.g. 5000"
            value={scrapValue}
            onChangeText={setScrapValue}
            keyboardType="numeric"
          />
        ) : null}

        <Input
          label="Authorization Remarks & Survey Notes"
          placeholder="e.g. Approved by Lead Engineer, disposal note ref #89..."
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
        <View style={{ flex: 1.4 }}>
          <Button
            title="Confirm Scrap"
            variant="destructive"
            loading={submitting}
            onPress={handleConfirmScrap}
            icon={<Archive size={14} color="#FFFFFF" />}
          />
        </View>
      </View>
    </Modal>
  );
};
