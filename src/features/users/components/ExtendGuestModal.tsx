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
  Calendar,
  CheckCircle,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineCalendarPicker } from '@/components/ui/InlineCalendarPicker';
import { useAppTheme } from '@/context/ThemeContext';
import { GuestUserRecord, ExtensionDuration } from '../types';
import { guestUserService } from '../services/guestUserService';

interface ExtendGuestModalProps {
  visible: boolean;
  onClose: () => void;
  guest: GuestUserRecord | null;
  onSuccess: () => void;
}

const DURATION_PILLS: Array<{
  label: string;
  days: number;
  value: ExtensionDuration;
}> = [
  { label: '15 Days', days: 15, value: '15 days' },
  { label: '45 Days', days: 45, value: '45 days' },
  { label: '1 Month', days: 30, value: '1 month' },
  { label: '3 Months', days: 90, value: '3 months' },
  { label: '6 Months', days: 180, value: '6 months' },
];

export const ExtendGuestModal: React.FC<ExtendGuestModalProps> = ({
  visible,
  onClose,
  guest,
  onSuccess,
}) => {
  const { isDark } = useAppTheme();

  const [selectedDuration, setSelectedDuration] = useState<string>('15 days');
  const [customDate, setCustomDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const toInputDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (visible && guest) {
      setShowCalendar(false);
      setIsManualInput(false);
      setSelectedDuration('15 days');
      const base =
        guest.expiresAt && new Date(guest.expiresAt).getTime() > Date.now()
          ? new Date(guest.expiresAt).getTime()
          : Date.now();
      const initialDate = new Date(base + 15 * 24 * 60 * 60 * 1000);
      setCustomDate(toInputDate(initialDate));
    }
  }, [visible, guest]);

  const handleSelectPill = (val: ExtensionDuration, days: number) => {
    setSelectedDuration(val);
    if (!guest) return;
    const base =
      guest.expiresAt && new Date(guest.expiresAt).getTime() > Date.now()
        ? new Date(guest.expiresAt).getTime()
        : Date.now();
    const newDate = new Date(base + days * 24 * 60 * 60 * 1000);
    setCustomDate(toInputDate(newDate));
  };

  const handleSelectCalendarDate = (dateStr: string) => {
    setCustomDate(dateStr);
    if (!guest) return;
    const base =
      guest.expiresAt && new Date(guest.expiresAt).getTime() > Date.now()
        ? new Date(guest.expiresAt).getTime()
        : Date.now();
    const match = DURATION_PILLS.find((pill) => {
      const pillDate = new Date(base + pill.days * 24 * 60 * 60 * 1000);
      return toInputDate(pillDate) === dateStr;
    });
    setSelectedDuration(match ? match.value : 'custom');
  };

  const handleConfirm = async () => {
    if (!guest) return;
    if (!customDate.trim()) {
      Alert.alert('Required Field', 'Please enter a valid extension expiry date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await guestUserService.extendGuestUser(
        guest._id,
        selectedDuration,
        customDate.trim()
      );
      Alert.alert(
        'Access Extended',
        `Guest access for "${guest.name}" successfully extended until ${formatDate(res.data.expiresAt)}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Extension Failed',
        err?.response?.data?.message || err?.message || 'Failed to extend guest access.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Confirm Access Extension"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 520 }}
      >
        {/* Subtitle / context description */}
        <Text
          style={{
            fontSize: 12,
            color: isDark ? '#94A3B8' : '#64748B',
            marginBottom: 14,
            lineHeight: 18,
          }}
        >
          Select or enter the new expiry date for{' '}
          <Text style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
            {guest?.name}
          </Text>
          {guest?.phone ? ` (+91 ${guest.phone})` : ''}. Current expiry:{' '}
          <Text style={{ fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155' }}>
            {formatDate(guest?.expiresAt)}
          </Text>
          .
        </Text>

        {/* Date Selector Area with Calendar Option */}
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
              Extension Expiry Date *
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowCalendar((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: showCalendar
                  ? isDark
                    ? '#064E3B'
                    : '#ECFDF5'
                  : 'transparent',
              }}
            >
              <Calendar size={12} color="#059669" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                {showCalendar ? 'Hide Calendar' : 'Open Calendar'}
              </Text>
            </TouchableOpacity>
          </View>

          {isManualInput ? (
            <View style={{ marginBottom: 6 }}>
              <Input
                placeholder="YYYY-MM-DD"
                value={customDate}
                onChangeText={(txt) => {
                  setCustomDate(txt);
                  setSelectedDuration('custom');
                }}
                leftIcon={<Calendar size={16} color="#059669" />}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsManualInput(false)}
                style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 8 }}
              >
                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>
                  Switch to Calendar Picker
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCalendar((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: showCalendar
                    ? '#059669'
                    : isDark
                    ? '#334155'
                    : '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isDark
                        ? 'rgba(5, 150, 105, 0.2)'
                        : '#ECFDF5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={18} color="#059669" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                      }}
                    >
                      {customDate || 'Select Date'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: isDark ? '#94A3B8' : '#64748B',
                        marginTop: 1,
                      }}
                    >
                      {customDate ? formatDate(customDate) : 'Tap to pick date'}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: showCalendar
                      ? isDark
                        ? '#064E3B'
                        : '#D1FAE5'
                      : '#059669',
                  }}
                >
                  <Calendar
                    size={13}
                    color={showCalendar ? '#059669' : '#FFFFFF'}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: showCalendar ? '#059669' : '#FFFFFF',
                    }}
                  >
                    {showCalendar ? 'Close' : 'Calendar'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: 4,
                  marginBottom: 2,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsManualInput(true)}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: isDark ? '#94A3B8' : '#64748B',
                      textDecorationLine: 'underline',
                    }}
                  >
                    Type date manually
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Interactive Calendar Option */}
          {showCalendar && (
            <InlineCalendarPicker
              selectedDate={customDate}
              onSelectDate={(d) => handleSelectCalendarDate(d)}
              minDate={toInputDate(new Date())}
              highlightDate={
                guest?.expiresAt
                  ? toInputDate(new Date(guest.expiresAt))
                  : undefined
              }
              onClose={() => setShowCalendar(false)}
            />
          )}
        </View>

        {/* Preset duration buttons in 1 row (compact, just like web) */}
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
            Quick Presets
          </Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {DURATION_PILLS.map((pill) => {
              const isSelected = selectedDuration === pill.value;
              return (
                <TouchableOpacity
                  key={pill.value}
                  activeOpacity={0.8}
                  onPress={() => handleSelectPill(pill.value, pill.days)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    paddingHorizontal: 2,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected
                      ? '#059669'
                      : isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected
                      ? '#047857'
                      : isDark
                      ? '#334155'
                      : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '700',
                      color: isSelected
                        ? '#FFFFFF'
                        : isDark
                        ? '#CBD5E1'
                        : '#475569',
                    }}
                    numberOfLines={1}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Validity Summary Preview Box (Starting Date & Expiry Date) */}
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
            padding: 12,
            marginBottom: 16,
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 11.5, color: isDark ? '#94A3B8' : '#64748B' }}>
              Starting Date:
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                fontFamily: 'monospace',
                color: isDark ? '#E2E8F0' : '#1E293B',
              }}
            >
              {formatDate(guest?.startDate || guest?.createdAt)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 6,
              borderTopWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#059669',
              }}
            >
              Expiry Date:
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                fontFamily: 'monospace',
                color: '#059669',
              }}
            >
              {formatDate(customDate || guest?.expiresAt)}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={submitting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: '#059669',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <CheckCircle size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
              {submitting ? 'Extending Access...' : 'Confirm Extension'}
            </Text>
          </TouchableOpacity>

          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

export default ExtendGuestModal;

