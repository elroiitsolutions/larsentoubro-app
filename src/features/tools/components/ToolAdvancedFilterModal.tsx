import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Filter, X, Check, RotateCcw, ChevronDown, ChevronUp, Printer, SlidersHorizontal } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { toolService } from '../services/toolService';

export interface ToolFilterState {
  status: string;
  printStatus?: string;
  category: string;
  validation: string;
  makeYear: string;
  toolCode?: string;
  toolId?: string;
  capacity?: string;
  safeWorkingLoad?: string;
  metalType?: string;
  toolVariant?: string;
  purchaserName?: string;
  supplierCode?: string;
  jobCode?: string;
  remarks?: string;
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
  const [showDeepFilters, setShowDeepFilters] = useState(false);

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
    'Moving',
    'Repair',
  ];

  const printStatusList = ['All', 'Printed', 'Not Printed'];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.status && localFilters.status !== 'All') count++;
    if (localFilters.printStatus && localFilters.printStatus !== 'All') count++;
    if (localFilters.category && localFilters.category !== 'All') count++;
    if (localFilters.validation && localFilters.validation !== 'All') count++;
    if (localFilters.makeYear && localFilters.makeYear !== 'All') count++;
    const deepKeys: (keyof ToolFilterState)[] = [
      'toolCode',
      'toolId',
      'capacity',
      'safeWorkingLoad',
      'metalType',
      'toolVariant',
      'purchaserName',
      'supplierCode',
      'jobCode',
      'remarks',
    ];
    for (const k of deepKeys) {
      if (localFilters[k] && String(localFilters[k]).trim() !== '') {
        count++;
      }
    }
    return count;
  }, [localFilters]);

  const handleReset = () => {
    const empty: ToolFilterState = {
      status: 'All',
      printStatus: 'All',
      category: 'All',
      validation: 'All',
      makeYear: 'All',
      toolCode: '',
      toolId: '',
      capacity: '',
      safeWorkingLoad: '',
      metalType: '',
      toolVariant: '',
      purchaserName: '',
      supplierCode: '',
      jobCode: '',
      remarks: '',
    };
    setLocalFilters(empty);
    onApply(empty);
    onClose();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const updateField = (key: keyof ToolFilterState, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const renderOptionGroup = (
    title: string,
    currentValue: string,
    options: string[],
    onSelect: (val: string) => void,
    icon?: React.ReactNode
  ) => (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            color: theme.textSecondary,
          }}
        >
          {title}
        </Text>
      </View>
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

  const renderDeepInputField = (label: string, field: keyof ToolFilterState, placeholder: string) => {
    const value = localFilters[field] || '';
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>
            {label}
          </Text>
          {value.trim() !== '' && (
            <TouchableOpacity onPress={() => updateField(field, '')}>
              <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          value={value}
          onChangeText={(txt) => updateField(field, txt)}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          style={{
            fontSize: 12,
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            color: theme.text,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: value.trim() ? theme.primary : theme.border,
          }}
        />
      </View>
    );
  };

  const modalTitle = activeFilterCount > 0 ? `Filter Equipment (${activeFilterCount})` : 'Filter Equipment';

  return (
    <Modal visible={visible} onClose={onClose} title={modalTitle}>
      <ScrollView
        style={{ maxHeight: 520 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        {/* Print Status Filter */}
        {renderOptionGroup(
          'QR Print Status',
          localFilters.printStatus || 'All',
          printStatusList,
          (val) => setLocalFilters((prev) => ({ ...prev, printStatus: val })),
          <Printer size={13} color={theme.textSecondary} />
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

        {/* Validation Period Group */}
        {renderOptionGroup(
          'Validation Period',
          localFilters.validation,
          validations,
          (val) => setLocalFilters((prev) => ({ ...prev, validation: val }))
        )}

        {/* Make Year if available */}
        {makeYears.length > 0 &&
          renderOptionGroup(
            'Make Year',
            localFilters.makeYear,
            makeYears,
            (val) => setLocalFilters((prev) => ({ ...prev, makeYear: val }))
          )}

        {/* Deep Field Filters Accordion */}
        <View style={{ marginTop: 4, marginBottom: 10 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDeepFilters(!showDeepFilters)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: isDark ? '#1E2538' : '#F1F5F9',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={14} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                Advanced Field Specifications
              </Text>
            </View>
            {showDeepFilters ? (
              <ChevronUp size={16} color={theme.textSecondary} />
            ) : (
              <ChevronDown size={16} color={theme.textSecondary} />
            )}
          </TouchableOpacity>

          {showDeepFilters && (
            <View
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? '#0F172A' : '#FAFAFA',
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {renderDeepInputField('Tool / Equipment Code', 'toolCode', 'e.g. TC-4029, SH-102...')}
              {renderDeepInputField('Tool ID', 'toolId', 'e.g. 5555...')}
              {renderDeepInputField('Safe Working Load (SWL)', 'safeWorkingLoad', 'e.g. 5 Ton, 10T...')}
              {renderDeepInputField('Capacity', 'capacity', 'e.g. 50kN, 200bar...')}
              {renderDeepInputField('Purchaser Name', 'purchaserName', 'e.g. L&T Power, Third Party...')}
              {renderDeepInputField('Supplier Code', 'supplierCode', 'e.g. SUP-100...')}
              {renderDeepInputField('Job Code', 'jobCode', 'e.g. JOB-890...')}
              {renderDeepInputField('Remarks', 'remarks', 'Search remarks...')}
            </View>
          )}
        </View>
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
