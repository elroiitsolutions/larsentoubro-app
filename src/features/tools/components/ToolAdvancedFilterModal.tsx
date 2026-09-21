import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Filter, X, Check, RotateCcw } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { toolService } from '../services/toolService';

export interface ToolFilterState {
  status: string;
  category: string;
  validation: string;
  makeYear: string;
}

interface ToolAdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ToolFilterState;
  onApply: (filters: ToolFilterState) => void;
  storeId?: string;
}

export const ToolAdvancedFilterModal: React.FC<ToolAdvancedFilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  storeId,
}) => {
  const { theme, isDark } = useAppTheme();

  const [localFilters, setLocalFilters] = useState<ToolFilterState>(filters);
  const [categories, setCategories] = useState<string[]>([]);
  const [validations, setValidations] = useState<string[]>([]);
  const [makeYears, setMakeYears] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      loadOptions();
    }
  }, [visible, filters]);

  const loadOptions = async () => {
    try {
      const opts = await toolService.getToolFilterOptions(storeId);

      // Categories
      const cats = opts.categories || [
        'Rigging & Lifting',
        'Hydraulic Tools',
        'Pneumatic Equipment',
        'Electrical & Power',
        'Measuring & Testing',
        'Safety & PPE',
        'General Machinery',
      ];
      setCategories(cats.filter(Boolean));

      // Validation options (1 Year, 2 Years, 3 Years, etc.)
      const rawVals = (opts.validationOptions || opts.validityPeriods || [
        '1 Year',
        '2 Years',
        '3 Years',
        '5 Years',
      ]).filter(Boolean);

      // Normalize validation labels
      const normalizedVals = Array.from(
        new Set(
          rawVals.map((v) => {
            const str = String(v).trim();
            if (str.toLowerCase().includes('year')) return str;
            return `${str} Year${str === '1' ? '' : 's'}`;
          })
        )
      );
      setValidations(normalizedVals);

      if (opts.makeYears) {
        setMakeYears(opts.makeYears.filter(Boolean));
      }
    } catch (e) {
      console.warn('Failed to load filter options', e);
    }
  };

  const statusList = [
    'All',
    'Available',
    'Issued',
    'Under Maintenance',
    'Inspection Due',
    'Damaged',
    'Scrap',
  ];

  const handleReset = () => {
    const empty: ToolFilterState = {
      status: 'All',
      category: 'All',
      validation: 'All',
      makeYear: 'All',
    };
    setLocalFilters(empty);
    onApply(empty);
    onClose();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const renderOptionGroup = (
    title: string,
    currentValue: string,
    options: string[],
    onSelect: (val: string) => void
  ) => (
    <View style={{ marginBottom: 18 }}>
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
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {['All', ...options.filter((o) => o !== 'All')].map((opt) => {
          const isSelected = currentValue === opt;
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.7}
              onPress={() => onSelect(opt)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: isSelected
                  ? theme.primary
                  : isDark
                  ? '#1E293B'
                  : '#F1F5F9',
                borderWidth: 1,
                borderColor: isSelected ? theme.primary : theme.border,
                gap: 4,
              }}
            >
              {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#FFFFFF' : theme.text,
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} onClose={onClose} title="Filter Equipment">
      <ScrollView
        style={{ maxHeight: 480 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        {/* Validation Filter Group */}
        {renderOptionGroup(
          'Validation Period',
          localFilters.validation,
          validations,
          (val) => setLocalFilters((prev) => ({ ...prev, validation: val }))
        )}

        {/* Operational Status */}
        {renderOptionGroup(
          'Operational Status',
          localFilters.status,
          statusList.filter((s) => s !== 'All'),
          (val) => setLocalFilters((prev) => ({ ...prev, status: val }))
        )}

        {/* Category */}
        {renderOptionGroup(
          'Category',
          localFilters.category,
          categories,
          (val) => setLocalFilters((prev) => ({ ...prev, category: val }))
        )}

        {/* Make Year if available */}
        {makeYears.length > 0 &&
          renderOptionGroup(
            'Make Year',
            localFilters.makeYear,
            makeYears,
            (val) => setLocalFilters((prev) => ({ ...prev, makeYear: val }))
          )}
      </ScrollView>

      {/* Footer Controls */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 14,
          borderTopWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            title="Reset"
            variant="outline"
            onPress={handleReset}
            icon={<RotateCcw size={14} color={theme.text} />}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button title="Apply Filters" onPress={handleApply} />
        </View>
      </View>
    </Modal>
  );
};
