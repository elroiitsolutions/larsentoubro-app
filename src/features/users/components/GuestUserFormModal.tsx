import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Phone,
  Mail,
  Building,
  FileText,
  Calendar,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineCalendarPicker } from '@/components/ui/InlineCalendarPicker';
import { useAppTheme } from '@/context/ThemeContext';
import { GuestUserRecord } from '../types';
import { guestUserService } from '../services/guestUserService';
import { DynamicFieldsSection } from '@/components/common/DynamicFieldsSection';
import { formService, FormFieldDefinition } from '@/services/formService';

interface GuestUserFormModalProps {
  visible: boolean;
  onClose: () => void;
  guest: GuestUserRecord | null;
  onSuccess: () => void;
}

export const GuestUserFormModal: React.FC<GuestUserFormModalProps> = ({
  visible,
  onClose,
  guest,
  onSuccess,
}) => {
  const { isDark, theme } = useAppTheme();
  const isEdit = Boolean(guest);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState<'Active' | 'Disabled'>('Active');
  const [expiresAt, setExpiresAt] = useState('');
  const [showExpiryCalendar, setShowExpiryCalendar] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [dynamicFieldsSchema, setDynamicFieldsSchema] = useState<FormFieldDefinition[]>([]);
  const [allFormFields, setAllFormFields] = useState<FormFieldDefinition[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch full guest-user-form schema to keep standard & custom fields in sync with Forms Management
  useEffect(() => {
    if (visible) {
      let isMounted = true;
      formService
        .getFormBySlug('guest-user-form')
        .then((schema) => {
          if (isMounted && schema && Array.isArray(schema.fields)) {
            setAllFormFields(schema.fields);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [visible]);

  // Dynamic definitions for standard fields from Forms Management schema
  const nameFieldDef = allFormFields.find(f => {
    const n = (f.name || '').toLowerCase();
    const l = (f.label || '').toLowerCase();
    return n === 'name' || l === 'name' || l.includes('full name');
  });

  const phoneFieldDef = allFormFields.find(f => {
    const n = (f.name || '').toLowerCase();
    const l = (f.label || '').toLowerCase();
    return n.includes('phone') || l.includes('phone') || l.includes('mobile');
  });

  const emailFieldDef = allFormFields.find(f => {
    const n = (f.name || '').toLowerCase();
    const l = (f.label || '').toLowerCase();
    return n.includes('email') || l.includes('email');
  });

  const orgFieldDef = allFormFields.find(f => {
    const n = (f.name || '').toLowerCase();
    const l = (f.label || '').toLowerCase();
    return n.includes('org') || l.includes('org') || l.includes('contractor') || l.includes('company');
  });

  const purposeFieldDef = allFormFields.find(f => {
    const n = (f.name || '').toLowerCase();
    const l = (f.label || '').toLowerCase();
    return n.includes('purpose') || l.includes('purpose');
  });

  const isEmailReq = Boolean(emailFieldDef?.required || emailFieldDef?.validations?.some((v: any) => v.type === 'required'));
  const emailCleanLabel = (emailFieldDef?.label || 'Email Address').replace(/\s*\(optional\)\s*$/i, '').trim();

  const isOrgReq = Boolean(orgFieldDef?.required || orgFieldDef?.validations?.some((v: any) => v.type === 'required'));
  const orgCleanLabel = (orgFieldDef?.label || 'Organization / Company').replace(/\s*\(optional\)\s*$/i, '').trim();

  const isPurposeReq = Boolean(purposeFieldDef?.required || purposeFieldDef?.validations?.some((v: any) => v.type === 'required'));
  const purposeCleanLabel = (purposeFieldDef?.label || 'Purpose / Visit Reason').replace(/\s*\(optional\)\s*$/i, '').trim();

  useEffect(() => {
    if (visible) {
      if (guest) {
        setName(guest.name || '');
        setPhone(guest.phone || '');
        setEmail(guest.email || '');
        setOrganization(guest.organization || '');
        setPurpose(guest.purpose || '');
        setStatus(guest.status === 'Disabled' ? 'Disabled' : 'Active');
        if (guest.expiresAt) {
          const d = new Date(guest.expiresAt);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setExpiresAt(`${y}-${m}-${day}`);
        } else {
          setExpiresAt('');
        }

        const raw = guest as any;
        const initialCustom: Record<string, any> = {};
        if (raw.customFields && typeof raw.customFields === 'object') {
          Object.assign(initialCustom, raw.customFields);
        }
        // Also pickup any dynamic properties returned directly on the guest object
        for (const [k, v] of Object.entries(raw)) {
          const std = ['_id', 'id', 'name', 'phone', 'formattedPhone', 'email', 'organization', 'purpose', 'status', 'expiresAt', 'createdAt', 'updatedAt', 'customFields'];
          if (!std.includes(k) && v !== undefined) {
            initialCustom[k] = v;
          }
        }
        setCustomFields(initialCustom);
        setShowExpiryCalendar(false);
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setOrganization('');
        setPurpose('');
        setStatus('Active');
        setExpiresAt('');
        setShowExpiryCalendar(false);
        setCustomFields({});
      }
    }
  }, [visible, guest]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Required Field', 'Please enter the guest user full name.');
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      Alert.alert('Invalid Mobile', 'Please provide a valid 10-digit mobile number for SMS/OTP verification.');
      return;
    }
    const cleanPhone = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;

    // Validate standard fields if marked required in Forms Management
    if (isEmailReq && !email.trim()) {
      Alert.alert('Required Field', `Please enter ${emailCleanLabel}.`);
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }

    if (isOrgReq && !organization.trim()) {
      Alert.alert('Required Field', `Please enter ${orgCleanLabel}.`);
      return;
    }

    if (isPurposeReq && !purpose.trim()) {
      Alert.alert('Required Field', `Please enter ${purposeCleanLabel}.`);
      return;
    }

    // Validate any required custom fields defined in Forms Management
    for (const field of dynamicFieldsSchema) {
      const isReq =
        Boolean(field.required) ||
        Boolean(field.validations?.some((v: any) => v.type === 'required'));
      const val = customFields[field.name];
      if (isReq && (val === undefined || val === null || String(val).trim() === '')) {
        Alert.alert('Required Field', `Please fill in ${field.label || field.name}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: trimmedName,
        phone: cleanPhone,
        email: email.trim() || undefined,
        organization: organization.trim() || undefined,
        purpose: purpose.trim() || undefined,
        customFields: { ...customFields },
        ...customFields,
      };

      if (isEdit && guest) {
        payload.status = status;
        payload.expiresAt = expiresAt || undefined;
        await guestUserService.updateGuestUser(guest._id, payload);
        Alert.alert('Success', `Guest user "${trimmedName}" updated successfully.`);
      } else {
        await guestUserService.createGuestUser(payload as any);
        Alert.alert('Success', `Guest user "${trimmedName}" created with automatic 15-day access!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to save guest user.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!guest) return;
    Alert.alert(
      'Delete Guest Account',
      `Are you sure you want to permanently delete guest account for "${guest.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await guestUserService.deleteGuestUser(guest._id);
              Alert.alert('Deleted', 'Guest account deleted successfully.');
              onSuccess();
              onClose();
            } catch (err: any) {
              Alert.alert(
                'Delete Failed',
                err?.response?.data?.message || err?.message || 'Could not delete guest user.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit Guest User' : 'Create Guest User'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 520 }}
      >
        {/* Automatic 15-Day Notice Banner for Create */}
        {!isEdit && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              borderRadius: 12,
              backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
              borderColor: isDark ? '#047857' : '#A7F3D0',
              borderWidth: 1,
              marginBottom: 16,
            }}
          >
            <Clock size={16} color="#059669" />
            <Text
              style={{
                fontSize: 11.5,
                color: isDark ? '#A7F3D0' : '#065F46',
                fontWeight: '600',
                flex: 1,
              }}
            >
              Temporary external accounts are granted 15 days of automatic access with OTP login verification.
            </Text>
          </View>
        )}

        {/* Name */}
        <Input
          label={`${nameFieldDef?.label?.replace(/\s*\*+$/, '') || 'Full Name'} *`}
          placeholder={nameFieldDef?.placeholder || 'e.g. John Doe / Contractor'}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          leftIcon={<User size={16} color="#94A3B8" />}
        />

        {/* Mobile Number */}
        <Input
          label={`${phoneFieldDef?.label?.replace(/\s*\*+$/, '') || 'Mobile Number (India +91)'} *`}
          placeholder={phoneFieldDef?.placeholder || 'e.g. 9876543210'}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={16} color="#94A3B8" />}
        />

        {/* Email */}
        <Input
          label={`${emailCleanLabel} ${isEmailReq ? '*' : '(Optional)'}`}
          placeholder={emailFieldDef?.placeholder || 'e.g. guest@contractor.com'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={16} color="#94A3B8" />}
        />

        {/* Organization / Company */}
        <Input
          label={`${orgCleanLabel} ${isOrgReq ? '*' : '(Optional)'}`}
          placeholder={orgFieldDef?.placeholder || 'e.g. L&T Subcontractor / Inspection Agency'}
          value={organization}
          onChangeText={setOrganization}
          leftIcon={<Building size={16} color="#94A3B8" />}
        />

        {/* Purpose / Project notes */}
        <Input
          label={`${purposeCleanLabel} ${isPurposeReq ? '*' : '(Optional)'}`}
          placeholder={purposeFieldDef?.placeholder || 'e.g. QR Inspection & Equipment Lookup'}
          value={purpose}
          onChangeText={setPurpose}
          multiline={purposeFieldDef?.type === 'textarea' || true}
          numberOfLines={purposeFieldDef?.type === 'textarea' ? 3 : 2}
          leftIcon={<FileText size={16} color="#94A3B8" />}
        />

        {/* Dynamic Custom Fields from Forms Management (e.g. "testing guest") */}
        <DynamicFieldsSection
          slug="guest-user-form"
          values={customFields}
          onChange={(fieldKey, val) => {
            setCustomFields((prev) => ({ ...prev, [fieldKey]: val }));
          }}
          onFieldsLoaded={(fields) => setDynamicFieldsSchema(fields)}
          excludeFieldNames={[
            'name',
            'phone',
            'phonenumber',
            'email',
            'organization',
            'purpose',
            'status',
            'expiresat',
          ]}
        />

        {/* If Edit mode: Status & Expiry Date */}
        {isEdit && (
          <>
            {/* Status Switcher */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: isDark ? '#94A3B8' : '#64748B',
                  marginBottom: 6,
                }}
              >
                Account Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setStatus('Active')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: status === 'Active' ? '#059669' : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderWidth: 1,
                    borderColor: status === 'Active' ? '#047857' : (isDark ? '#334155' : '#E2E8F0'),
                  }}
                >
                  <CheckCircle2 size={14} color={status === 'Active' ? '#FFFFFF' : '#94A3B8'} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: status === 'Active' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
                    }}
                  >
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setStatus('Disabled')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: status === 'Disabled' ? '#DC2626' : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderWidth: 1,
                    borderColor: status === 'Disabled' ? '#B91C1C' : (isDark ? '#334155' : '#E2E8F0'),
                  }}
                >
                  <XCircle size={14} color={status === 'Disabled' ? '#FFFFFF' : '#94A3B8'} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: status === 'Disabled' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
                    }}
                  >
                    Disabled
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Expiry Date with Calendar Option */}
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}
                >
                  Access Expiry Date
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowExpiryCalendar((prev) => !prev)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: showExpiryCalendar
                      ? isDark
                        ? '#064E3B'
                        : '#ECFDF5'
                      : 'transparent',
                  }}
                >
                  <Calendar size={12} color="#059669" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                    {showExpiryCalendar ? 'Hide Calendar' : 'Open Calendar'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowExpiryCalendar((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: showExpiryCalendar
                    ? '#059669'
                    : isDark
                    ? '#334155'
                    : '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Calendar size={18} color="#059669" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  >
                    {expiresAt || 'No Expiry Set'}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: showExpiryCalendar
                      ? isDark
                        ? '#064E3B'
                        : '#D1FAE5'
                      : '#059669',
                  }}
                >
                  <Calendar size={12} color={showExpiryCalendar ? '#059669' : '#FFFFFF'} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: showExpiryCalendar ? '#059669' : '#FFFFFF',
                    }}
                  >
                    {showExpiryCalendar ? 'Close' : 'Calendar'}
                  </Text>
                </View>
              </TouchableOpacity>

              {showExpiryCalendar && (
                <InlineCalendarPicker
                  selectedDate={expiresAt}
                  onSelectDate={(d) => {
                    setExpiresAt(d);
                    setShowExpiryCalendar(false);
                  }}
                  onClose={() => setShowExpiryCalendar(false)}
                />
              )}
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={{ marginTop: 8, gap: 8 }}>
          <Button
            title={isEdit ? 'Save Changes' : 'Create Guest User'}
            onPress={handleSubmit}
            loading={submitting}
          />

          {isEdit && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDelete}
              disabled={deleting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Trash2 size={15} color="#DC2626" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>
                    Delete Guest User
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={submitting || deleting}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

export default GuestUserFormModal;
