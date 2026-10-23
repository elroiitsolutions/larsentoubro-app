import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Clock,
  Info,
  AlertTriangle,
  Building2,
  ChevronDown,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { profileService } from '@/features/profiles/services/profileService';
import { ProfileRecord } from '@/features/profiles/types';
import { toolService } from '../services/toolService';

interface BulkEditModalProps {
  visible: boolean;
  onClose: () => void;
  toolIds: string[];
  storeId?: string;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  'Available',
  'In Use',
  'Moving',
  'Maintenance',
  'Damaged',
  'Expired',
  'Missing',
];

const VALIDATION_PRESETS = ['1 Year', '2 Years', '3 Years', '5 Years'];

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  visible,
  onClose,
  toolIds,
  storeId,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<ProfileRecord[]>([]);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  // Form Fields
  const [status, setStatus] = useState('');
  const [validityPeriod, setValidityPeriod] = useState('');
  const [dateOfSupply, setDateOfSupply] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserContact, setPurchaserContact] = useState('');
  const [toolVariant, setToolVariant] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [makeYear, setMakeYear] = useState('');
  const [safeWorkingLoad, setSafeWorkingLoad] = useState('');
  const [metalType, setMetalType] = useState('');
  const [category, setCategory] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (visible) {
      profileService
        .getProfiles('Supplier')
        .then((data) => {
          if (Array.isArray(data)) {
            setSuppliers(data);
          }
        })
        .catch((err) => console.warn('Failed to fetch suppliers for bulk edit:', err));
    } else {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setStatus('');
    setValidityPeriod('');
    setDateOfSupply('');
    setSupplierCode('');
    setPurchaserName('');
    setPurchaserContact('');
    setToolVariant('');
    setJobCode('');
    setMakeYear('');
    setSafeWorkingLoad('');
    setMetalType('');
    setCategory('');
    setRemarks('');
    setIsConfirmStep(false);
    setShowSupplierPicker(false);
  };

  const getActiveUpdates = () => {
    const updates: Record<string, string> = {};
    if (status.trim()) updates.status = status.trim();
    if (validityPeriod.trim()) updates.validityPeriod = validityPeriod.trim();
    if (dateOfSupply.trim()) updates.dateOfSupply = dateOfSupply.trim();
    if (supplierCode.trim()) updates.supplierCode = supplierCode.trim();
    if (purchaserName.trim()) updates.purchaserName = purchaserName.trim();
    if (purchaserContact.trim()) updates.purchaserContact = purchaserContact.trim();
    if (toolVariant.trim()) updates.toolVariant = toolVariant.trim();
    if (jobCode.trim()) updates.jobCode = jobCode.trim();
    if (makeYear.trim()) updates.makeYear = makeYear.trim();
    if (safeWorkingLoad.trim()) updates.safeWorkingLoad = safeWorkingLoad.trim();
    if (metalType.trim()) updates.metalType = metalType.trim();
    if (category.trim()) updates.category = category.trim();
    if (remarks.trim()) updates.remarks = remarks.trim();
    return updates;
  };

  const activeUpdates = getActiveUpdates();
  const activeFieldCount = Object.keys(activeUpdates).length;

  const handleProceedToReview = () => {
    if (activeFieldCount === 0) {
      Alert.alert('Notice', 'Please fill in at least one attribute to update.');
      return;
    }
    setIsConfirmStep(true);
  };

  const handleConfirmUpdate = async () => {
    if (activeFieldCount === 0) return;
    if (toolIds.length === 0) {
      Alert.alert('Error', 'No tools selected for bulk edit.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await toolService.bulkEditTools(storeId, {
        toolIds,
        updates: activeUpdates,
      });

      Alert.alert(
        'Success',
        res.message || `Successfully updated ${res.data?.count || toolIds.length} tools.`
      );
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Bulk Edit Failed',
        err?.response?.data?.message || err?.message || 'Could not apply bulk updates.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSupplier = (supplier: ProfileRecord) => {
    setPurchaserName(supplier.name);
    if (supplier.code) {
      setSupplierCode(supplier.code);
    }
    const phone = supplier.contactPhone || supplier.alternatePhone;
    if (phone) {
      setPurchaserContact(phone);
    }
    setShowSupplierPicker(false);
  };

  const formatFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      status: 'Operational Status',
      validityPeriod: 'Validation Period',
      dateOfSupply: 'Date of Supply',
      supplierCode: 'Supplier Code',
      purchaserName: 'Purchaser / Supplier',
      purchaserContact: 'Purchaser Contact',
      toolVariant: 'Tool Variant',
      jobCode: 'Job Code',
      makeYear: 'Make Year',
      safeWorkingLoad: 'Safe Working Load',
      metalType: 'Metal Type',
      category: 'Category',
      remarks: 'Remarks',
    };
    return labels[key] || key.replace(/([A-Z])/g, ' $1');
  };

  return (
    <Modal
      visible={visible}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={isConfirmStep ? 'Review Bulk Changes' : `Bulk Edit (${toolIds.length} Tools)`}
    >
      {!isConfirmStep ? (
        <ScrollView
          style={{ maxHeight: 500 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Header Description */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 10,
              borderRadius: 10,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: theme.textSecondary,
                lineHeight: 16,
              }}
            >
              Update common attributes across all {toolIds.length} selected equipment units. Blank fields will remain unchanged.
            </Text>
          </View>

          {/* Operational Status */}
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
              Operational Status
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
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
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

          {/* Validation Period */}
          <View style={{ marginBottom: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
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
                Validation Period
              </Text>
            </View>

            {/* Presets */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 8,
              }}
            >
              {VALIDATION_PRESETS.map((v) => {
                const isSelected = validityPeriod === v;
                return (
                  <TouchableOpacity
                    key={v}
                    activeOpacity={0.7}
                    onPress={() => setValidityPeriod(isSelected ? '' : v)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isSelected
                        ? '#D97706'
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
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

            <Input
              placeholder="Or enter custom (e.g. 31-12-2028 or 2 Years)"
              value={validityPeriod}
              onChangeText={setValidityPeriod}
            />

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
                marginTop: 6,
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

          {/* Date of Supply */}
          <Input
            label="Date of Supply / Inspection (YYYY-MM-DD)"
            placeholder="e.g. 2026-05-15"
            value={dateOfSupply}
            onChangeText={setDateOfSupply}
          />

          {/* Supplier Picker / Purchaser Name */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: theme.textSecondary,
                marginBottom: 6,
              }}
            >
              Purchaser Name / Supplier
            </Text>
            {suppliers.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowSupplierPicker(!showSupplierPicker)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} color={theme.primary} />
                  <Text style={{ fontSize: 13, color: purchaserName ? theme.text : theme.textSecondary }}>
                    {purchaserName || 'Select from registered suppliers...'}
                  </Text>
                </View>
                <ChevronDown size={15} color={theme.textSecondary} />
              </TouchableOpacity>
            )}

            {showSupplierPicker && suppliers.length > 0 && (
              <View
                style={{
                  maxHeight: 160,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 8,
                  padding: 4,
                }}
              >
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {suppliers.map((s) => (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => handleSelectSupplier(s)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                        {s.name}
                      </Text>
                      {s.code && (
                        <Text style={{ fontSize: 10, color: theme.textSecondary, fontFamily: 'monospace' }}>
                          {s.code}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Input
              placeholder="Or type purchaser name..."
              value={purchaserName}
              onChangeText={setPurchaserName}
            />
          </View>

          {/* Supplier Code */}
          <Input
            label="Supplier Code"
            placeholder="e.g. SUPP-2026"
            value={supplierCode}
            onChangeText={setSupplierCode}
          />

          {/* Purchaser Contact */}
          <Input
            label="Purchaser Contact"
            placeholder="e.g. +91 98765 43210"
            value={purchaserContact}
            onChangeText={setPurchaserContact}
          />

          {/* Tool Variant */}
          <Input
            label="Tool Variant"
            placeholder="e.g. Standard 5T Heavy"
            value={toolVariant}
            onChangeText={setToolVariant}
          />

          {/* Job Code */}
          <Input
            label="Job Code"
            placeholder="e.g. LE25M037"
            value={jobCode}
            onChangeText={setJobCode}
          />

          {/* Make Year */}
          <Input
            label="Make Year"
            placeholder="e.g. 2025"
            value={makeYear}
            onChangeText={setMakeYear}
            keyboardType="numeric"
          />

          {/* Safe Working Load / Capacity */}
          <Input
            label="Capacity / Safe Working Load (SWL)"
            placeholder="e.g. 10 Tonnes"
            value={safeWorkingLoad}
            onChangeText={setSafeWorkingLoad}
          />

          {/* Metal Type */}
          <Input
            label="Metal Type"
            placeholder="e.g. Galvanized Steel / Alloy"
            value={metalType}
            onChangeText={setMetalType}
          />

          {/* Category */}
          <Input
            label="Category (Optional)"
            placeholder="e.g. Rigging & Lifting"
            value={category}
            onChangeText={setCategory}
          />

          {/* Remarks */}
          <Input
            label="Remarks / Notes"
            placeholder="Bulk update notes..."
            value={remarks}
            onChangeText={setRemarks}
          />
        </ScrollView>
      ) : (
        /* STEP 2: REVIEW & CONFIRMATION */
        <ScrollView
          style={{ maxHeight: 500 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Warning Banner */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <AlertTriangle size={20} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FCD34D' : '#92400E' }}>
                Confirmation Required
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? '#FDE68A' : '#78350F',
                  marginTop: 2,
                  lineHeight: 16,
                }}
              >
                You are about to apply updates to{' '}
                <Text style={{ fontWeight: 'bold' }}>{toolIds.length} selected equipment units</Text>. Are you sure you want to proceed?
              </Text>
            </View>
          </View>

          {/* Summary of Active Changes */}
          <View style={{ marginBottom: 16 }}>
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
              Summary of Updates to Apply ({activeFieldCount}):
            </Text>

            <View
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: 'hidden',
              }}
            >
              {Object.entries(activeUpdates).map(([key, val], idx) => (
                <View
                  key={key}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: idx < activeFieldCount - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
                    {formatFieldLabel(key)}
                  </Text>
                  <View
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.border,
                      maxWidth: '60%',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: theme.primary,
                        fontFamily: 'monospace',
                      }}
                    >
                      {val}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* FOOTER ACTIONS */}
      {!isConfirmStep ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                resetForm();
                onClose();
              }}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Button
              title={activeFieldCount > 0 ? `Review (${activeFieldCount} Fields)` : 'Review Changes'}
              disabled={activeFieldCount === 0}
              onPress={handleProceedToReview}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Back"
              variant="outline"
              disabled={submitting}
              onPress={() => setIsConfirmStep(false)}
            />
          </View>
          <View style={{ flex: 1.6 }}>
            <Button
              title={`Apply to ${toolIds.length} Tools`}
              loading={submitting}
              onPress={handleConfirmUpdate}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};
