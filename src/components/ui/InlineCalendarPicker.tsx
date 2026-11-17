import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';

interface InlineCalendarPickerProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  minDate?: string; // 'YYYY-MM-DD'
  highlightDate?: string; // 'YYYY-MM-DD', e.g. current expiry
  onClose?: () => void;
  title?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const InlineCalendarPicker: React.FC<InlineCalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  minDate,
  highlightDate,
  onClose,
  title,
}) => {
  const { isDark } = useAppTheme();

  // Helper to get today's YYYY-MM-DD
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();

  // Initialize view to selected date, or today
  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[0], 10);
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Whenever selectedDate changes from outside (e.g. clicking 15 Days / 45 Days preset), sync calendar view
  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Calculate calendar grid for viewYear and viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const daysGrid: Array<{ day: number | null; dateStr: string }> = [];

  // Empty leading cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push({ day: null, dateStr: '' });
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${mStr}-${dStr}`;
    daysGrid.push({ day: d, dateStr });
  }

  // Format header text
  const headerMonthText = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <View
      style={{
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isDark ? '#1E293B' : '#E2E8F0',
        padding: 12,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {title && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={14} color="#059669" />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: isDark ? '#F8FAFC' : '#0F172A',
                letterSpacing: 0.3,
              }}
            >
              {title}
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>
                Done
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Month Navigation Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 4,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePrevMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? '#1E293B' : '#EDF2F7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color={isDark ? '#E2E8F0' : '#334155'} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: isDark ? '#F8FAFC' : '#0F172A',
            }}
          >
            {headerMonthText}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? '#1E293B' : '#EDF2F7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color={isDark ? '#E2E8F0' : '#334155'} />
        </TouchableOpacity>
      </View>

      {/* Weekday Names Header */}
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 6,
          borderBottomWidth: 1,
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
          paddingBottom: 6,
        }}
      >
        {WEEKDAYS.map((wd, idx) => (
          <View key={`wd-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                color:
                  idx === 0 || idx === 6
                    ? isDark
                      ? '#F87171'
                      : '#EF4444'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
              }}
            >
              {wd}
            </Text>
          </View>
        ))}
      </View>

      {/* Days Grid (7 columns) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {daysGrid.map((item, index) => {
          if (item.day === null) {
            return (
              <View
                key={`empty-${index}`}
                style={{ width: `${100 / 7}%`, height: 34 }}
              />
            );
          }

          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;
          const isHighlight = item.dateStr === highlightDate;
          const isDisabled = Boolean(minDate && item.dateStr < minDate);

          return (
            <View
              key={`day-${item.dateStr}`}
              style={{
                width: `${100 / 7}%`,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 1,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isDisabled}
                onPress={() => onSelectDate(item.dateStr)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? '#059669'
                    : isHighlight
                    ? isDark
                      ? '#1E3A8A'
                      : '#DBEAFE'
                    : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: '#059669',
                  opacity: isDisabled ? 0.3 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? '700' : '500',
                    color: isSelected
                      ? '#FFFFFF'
                      : isHighlight
                      ? isDark
                        ? '#93C5FD'
                        : '#1D4ED8'
                      : isDark
                      ? '#E2E8F0'
                      : '#1E293B',
                  }}
                >
                  {item.day}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Legend & Quick Actions Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleJumpToday}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: isDark ? '#1E293B' : '#EDF2F7',
          }}
        >
          <RotateCcw size={11} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: isDark ? '#CBD5E1' : '#475569',
            }}
          >
            Today
          </Text>
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 4,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: '#059669',
            }}
          >
            <Check size={12} color="#FFFFFF" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
              Done
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default InlineCalendarPicker;

