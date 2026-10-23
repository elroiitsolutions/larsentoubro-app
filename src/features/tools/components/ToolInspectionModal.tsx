import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Wrench,
  Archive,
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
  Layers,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formService } from '@/services/formService';
import { toolService } from '../services/toolService';
import { ToolRecord } from '../types';

interface ToolInspectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTools: ToolRecord[];
  onSuccess: () => void;
}

type StepType = 'SELECT_RESULT' | 'PASS_CONFIG' | 'FAIL_OPTIONS';

export const ToolInspectionModal: React.FC<ToolInspectionModalProps> = ({
  visible,
  onClose,
  selectedTools,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuthStore();

  const [step, setStep] = useState<StepType>('SELECT_RESULT');
  const [submitting, setSubmitting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Form options and values
  const [validationOptions, setValidationOptions] = useState<string[]>([
    '1 Year',
    '2 Years',
    '3 Years',
  ]);
  const [selectedValidation, setSelectedValidation] = useState<string>('1 Year');
  const [failAction, setFailAction] = useState<'Repair' | 'Scrap'>('Repair');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep('SELECT_RESULT');
      setRemarks('');
      setFailAction('Repair');
      return;
    }

    const fetchValidationOptions = async () => {
      setLoadingConfig(true);
      try {
        const res = await formService.getFormBySlug('tool-form');
        if (res && res.fields) {
          const valField = res.fields.find(
            (f: any) => f.name === 'validation' || f.id === 'validation'
          );
          if (valField && Array.isArray(valField.options) && valField.options.length > 0) {
            const opts = valField.options.map((o: any) =>
              typeof o === 'string' ? o : o.label || o.value || String(o)
            );
            setValidationOptions(opts);
            if (opts.length > 0) {
              setSelectedValidation(opts[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load validation options:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchValidationOptions();

    if (selectedTools.length === 1 && selectedTools[0].validityPeriod) {
      const raw = selectedTools[0].validityPeriod;
      if (raw && raw !== 'N/A' && raw !== '-') {
        setSelectedValidation(raw);
      }
    }
  }, [visible, selectedTools]);

  // Compute live expiry preview
  const expiryPreview = useMemo(() => {
    if (!selectedValidation) return null;
    const match = selectedValidation.match(/(\d+)/);
    const years = match ? parseInt(match[1], 10) : 1;

    if (selectedTools.length === 0) return null;
    const sampleTool = selectedTools[0];

    const parseDate = (val?: any): Date => {
      if (!val) return new Date();
      const str = String(val).trim();
      const parts = str.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 >= 1970 && p0 <= 2100) return new Date(p0, p1 - 1, p2);
        if (p2 >= 1970 && p2 <= 2100) {
          return new Date(p2, p1 - 1, p0);
        }
      }
      const fallback = new Date(str);
      return isNaN(fallback.getTime()) ? new Date() : fallback;
    };

    const startDate = parseDate(sampleTool.dateOfSupply || sampleTool.createdAt);
    const computed = new Date(startDate);
    computed.setFullYear(computed.getFullYear() + years);

    return computed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedValidation, selectedTools]);

  const totalSelected = selectedTools.length;

  const handleConfirmPass = async () => {
    if (!selectedValidation) {
      Alert.alert('Validation Error', 'Please select a valid validation period.');
      return;
    }

    setSubmitting(true);
    try {
      const toolIds = selectedTools.map((t) => t._id);
      const res = await toolService.inspectTools({
        toolIds,
        result: 'Pass',
        action: 'Pass',
        validation: selectedValidation,
        remarks: remarks.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Inspection Passed',
          res.message || `Successfully marked ${toolIds.length} tool(s) as Passed.`
        );
        onSuccess();
        onClose();
      } else {
        Alert.alert('Inspection Failed', res.message || 'Failed to submit inspection pass.');
      }
    } catch (error: any) {
      Alert.alert(
        'Inspection Failed',
        error?.response?.data?.message || error.message || 'Could not submit inspection pass.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmFail = async () => {
    setSubmitting(true);
    try {
      const toolIds = selectedTools.map((t) => t._id);
      const res = await toolService.inspectTools({
        toolIds,
        result: 'Fail',
        action: failAction,
        remarks: remarks.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Inspection Recorded',
          res.message ||
            (failAction === 'Repair'
              ? `Marked ${toolIds.length} tool(s) for Repair.`
              : `Moved ${toolIds.length} tool(s) to Scrap register.`)
        );
        onSuccess();
        onClose();
      } else {
        Alert.alert('Action Failed', res.message || 'Failed to submit inspection outcome.');
      }
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error?.response?.data?.message || error.message || 'Could not record inspection failure.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* STEP 1: SELECT RESULT */}
        {step === 'SELECT_RESULT' && (
          <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
                ]}
              >
                <ClipboardCheck size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]}>
                  Tool Quality Inspection
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Quality & safety verification for {totalSelected} selected tool
                  {totalSelected === 1 ? '' : 's'}.
                </Text>
              </View>
            </View>

            {/* Selected Tool Chips */}
            <View
              style={[
                styles.chipsContainer,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.chipsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color={theme.primary} />
                  <Text style={[styles.chipsTitle, { color: theme.text }]}>
                    Selected ({totalSelected})
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Inspector: {user?.name || 'Quality Team'}
                </Text>
              </View>
              <View style={styles.chipsWrap}>
                {selectedTools.slice(0, 10).map((t) => (
                  <View
                    key={t._id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipTextBold, { color: theme.text }]}>
                      {t.toolId || t.toolCode || 'Tool'}
                    </Text>
                    {t.description ? (
                      <Text
                        style={[styles.chipTextSub, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        ({t.description})
                      </Text>
                    ) : null}
                  </View>
                ))}
                {selectedTools.length > 10 && (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipTextSub, { color: theme.textSecondary }]}>
                      +{selectedTools.length - 10} more
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Cards */}
            <View style={styles.actionCards}>
              {/* Pass Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setStep('PASS_CONFIG')}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
                    borderColor: '#10B981',
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <CheckCircle2 size={22} color="#059669" />
                  </View>
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Text style={[styles.badgeText, { color: '#047857' }]}>Pass</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: '#047857' }]}>Mark as PASS</Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                  Tools meet safety specifications. Configure renewed Validation Period (1, 2, or 3
                  Years) and update expiry dates.
                </Text>
              </TouchableOpacity>

              {/* Fail Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setStep('FAIL_OPTIONS')}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                    borderColor: '#EF4444',
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <XCircle size={22} color="#DC2626" />
                  </View>
                  <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Fail</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: '#B91C1C' }]}>Mark as FAIL</Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                  Tools failed inspection or show defects. Route for internal/vendor Repair or move
                  to Scrap register for disposal.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* STEP 2A: PASS CONFIG */}
        {step === 'PASS_CONFIG' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <TouchableOpacity
                onPress={() => setStep('SELECT_RESULT')}
                style={[styles.backBtn, { borderColor: theme.border }]}
              >
                <ArrowLeft size={18} color={theme.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titleSmall, { color: theme.text }]}>
                  Inspection Passed
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Configure renewed validity period for {totalSelected} tool(s).
                </Text>
              </View>
            </View>

            {/* Validation Period Selection */}
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                <ShieldCheck size={16} color="#059669" />
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Validation Period
                </Text>
                {loadingConfig && <ActivityIndicator size="small" color={theme.primary} />}
              </View>

              <View style={styles.optionsGrid}>
                {validationOptions.map((opt) => {
                  const isSelected = selectedValidation === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      onPress={() => setSelectedValidation(opt)}
                      style={[
                        styles.optionPill,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.2)'
                              : '#ECFDF5'
                            : theme.surface,
                          borderColor: isSelected ? '#10B981' : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          {
                            color: isSelected ? '#047857' : theme.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Live Expiry Preview Banner */}
            {expiryPreview && (
              <View
                style={[
                  styles.previewBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Calendar size={20} color="#059669" />
                  <View>
                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>
                      Calculated Expiry Date
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#047857', marginTop: 2 }}>
                      {expiryPreview}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#059669' }}>
                  Based on {selectedValidation}
                </Text>
              </View>
            )}

            {/* Optional Remarks */}
            <View style={{ marginTop: 14 }}>
              <Input
                label="Inspection Remarks & Notes (Optional)"
                placeholder="e.g. Visual inspection passed, tested load capacity, calibrated sensors..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={[styles.buttonRow, { marginTop: 20 }]}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep('SELECT_RESULT')}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title={submitting ? 'Submitting...' : `Confirm Pass (${totalSelected})`}
                onPress={handleConfirmPass}
                disabled={submitting}
                style={{ flex: 1.5, backgroundColor: '#059669' }}
              />
            </View>
          </View>
        )}

        {/* STEP 2B: FAIL OPTIONS */}
        {step === 'FAIL_OPTIONS' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <TouchableOpacity
                onPress={() => setStep('SELECT_RESULT')}
                style={[styles.backBtn, { borderColor: theme.border }]}
              >
                <ArrowLeft size={18} color={theme.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titleSmall, { color: theme.text }]}>
                  Inspection Failed
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Select routing action for {totalSelected} failed tool(s).
                </Text>
              </View>
            </View>

            {/* Radio Cards: Repair vs Scrap */}
            <View style={[styles.actionCards, { marginTop: 14 }]}>
              {/* Send to Repair */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFailAction('Repair')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor:
                      failAction === 'Repair'
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.12)'
                          : '#FFFBEB'
                        : theme.surface,
                    borderColor: failAction === 'Repair' ? '#F59E0B' : theme.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                    <Wrench size={18} color="#D97706" />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: failAction === 'Repair' ? '#F59E0B' : theme.border,
                        backgroundColor: failAction === 'Repair' ? '#F59E0B' : 'transparent',
                      },
                    ]}
                  >
                    {failAction === 'Repair' && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={[styles.cardTitleSmall, { color: theme.text }]}>
                  Send to Repair
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                  Sets tool status to <Text style={{ fontWeight: '700' }}>Repair</Text>. Issuance and
                  transfers are restricted until maintenance is resolved.
                </Text>
              </TouchableOpacity>

              {/* Move to Scrap */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFailAction('Scrap')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor:
                      failAction === 'Scrap'
                        ? isDark
                          ? 'rgba(239, 68, 68, 0.12)'
                          : '#FEF2F2'
                        : theme.surface,
                    borderColor: failAction === 'Scrap' ? '#EF4444' : theme.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Archive size={18} color="#DC2626" />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: failAction === 'Scrap' ? '#EF4444' : theme.border,
                        backgroundColor: failAction === 'Scrap' ? '#EF4444' : 'transparent',
                      },
                    ]}
                  >
                    {failAction === 'Scrap' && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={[styles.cardTitleSmall, { color: theme.text }]}>
                  Move to Scrap
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                  Moves tools directly to the <Text style={{ fontWeight: '700' }}>Scrap register</Text>{' '}
                  for future scrap DC disposal with registered dealers.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Failure Reason input */}
            <View style={{ marginTop: 14 }}>
              <Input
                label="Defect Reason / Failure Notes *"
                placeholder={
                  failAction === 'Repair'
                    ? 'Specify defect details, required repairs, or servicing notes...'
                    : 'Specify scrap reason (e.g. beyond economical repair, structural damage)...'
                }
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={[styles.buttonRow, { marginTop: 20 }]}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep('SELECT_RESULT')}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title={
                  submitting
                    ? 'Submitting...'
                    : failAction === 'Repair'
                    ? `Confirm Repair (${totalSelected})`
                    : `Confirm Scrap (${totalSelected})`
                }
                onPress={handleConfirmFail}
                disabled={submitting}
                style={{
                  flex: 1.5,
                  backgroundColor: failAction === 'Repair' ? '#D97706' : '#DC2626',
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chipsContainer: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipTextBold: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextSub: {
    fontSize: 10,
    maxWidth: 90,
  },
  actionCards: {
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTitleSmall: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  optionPillText: {
    fontSize: 13,
  },
  previewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  optionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
