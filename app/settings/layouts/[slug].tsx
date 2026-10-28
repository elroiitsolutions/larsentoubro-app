import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Sliders,
  CheckCircle2,
  Save,
  Wrench,
  Building2,
  Calendar,
  Layers,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formService, FormDefinition } from '@/services/formService';
import api from '@/services/api';

interface FieldConfigItem {
  id: string;
  name: string;
  label: string;
  category: 'specs' | 'vendor' | 'allocation';
  disabled: boolean;
  order?: number;
}

const DEFAULT_CONFIG_FIELDS: FieldConfigItem[] = [
  // Category: specs
  { id: 'description', name: 'description', label: 'Tool Name / Description', category: 'specs', disabled: false, order: 0 },
  { id: 'toolCode', name: 'toolCode', label: 'Tool Code Badge', category: 'specs', disabled: false, order: 1 },
  { id: 'toolVariant', name: 'toolVariant', label: 'Tool Variant', category: 'specs', disabled: false, order: 2 },
  { id: 'makeYear', name: 'makeYear', label: 'Make & Year', category: 'specs', disabled: false, order: 3 },
  { id: 'capacity', name: 'capacity', label: 'Load Capacity', category: 'specs', disabled: false, order: 4 },
  { id: 'safeWorkingLoad', name: 'safeWorkingLoad', label: 'Safe Working Load (SWL)', category: 'specs', disabled: false, order: 5 },
  { id: 'toolType', name: 'toolType', label: 'Tool Category', category: 'specs', disabled: false, order: 6 },
  { id: 'metalType', name: 'metalType', label: 'Material / Metal Type', category: 'specs', disabled: false, order: 7 },
  { id: 'validityStatus', name: 'validityStatus', label: 'Validity Status Banner', category: 'specs', disabled: false, order: 8 },

  // Category: vendor
  { id: 'purchaserName', name: 'purchaserName', label: 'Supplier / Purchaser Name', category: 'vendor', disabled: false, order: 9 },
  { id: 'supplierCode', name: 'supplierCode', label: 'Supplier Code', category: 'vendor', disabled: false, order: 10 },
  { id: 'purchaserContact', name: 'purchaserContact', label: 'Purchaser Contact', category: 'vendor', disabled: false, order: 11 },
  { id: 'dateOfSupply', name: 'dateOfSupply', label: 'Date of Supply / Receipt', category: 'vendor', disabled: false, order: 12 },
  { id: 'validityPeriod', name: 'validityPeriod', label: 'Validation Period', category: 'vendor', disabled: false, order: 13 },

  // Category: allocation
  { id: 'jobCode', name: 'jobCode', label: 'Job Number / Code', category: 'allocation', disabled: false, order: 14 },
  { id: 'jobDescription', name: 'jobDescription', label: 'Job Description', category: 'allocation', disabled: false, order: 15 },
  { id: 'currentSite', name: 'currentSite', label: 'Assigned Store', category: 'allocation', disabled: false, order: 16 },
  { id: 'project', name: 'project', label: 'Assigned Project Site', category: 'allocation', disabled: false, order: 17 },
  { id: 'subcontractorName', name: 'subcontractorName', label: 'Subcontractor Details', category: 'allocation', disabled: false, order: 18 },
];

export default function LayoutConfigScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const currentSlug = slug || 'tool-quick-view';

  const title = 'Tool Quick View Layout';
  const subtitle = 'Configure which fields appear on the Quick View card (/vt)';

  const [fields, setFields] = useState<FieldConfigItem[]>(DEFAULT_CONFIG_FIELDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadLayout = async () => {
    try {
      setLoading(true);
      const data = await formService.getFormBySlug(currentSlug);
      if (data && data.fields && data.fields.length > 0) {
        const merged = DEFAULT_CONFIG_FIELDS.map((def) => {
          const existing = data.fields.find(
            (f: any) => f.name === def.name || f.id === def.id
          );
          if (existing) {
            return {
              ...def,
              disabled: Boolean((existing as any).disabled),
            };
          }
          return def;
        });
        setFields(merged);
      } else {
        setFields(DEFAULT_CONFIG_FIELDS);
      }
    } catch (e) {
      setFields(DEFAULT_CONFIG_FIELDS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLayout();
  }, [currentSlug]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLayout();
  };

  const handleToggleField = (fieldName: string, isVisible: boolean) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.name === fieldName || f.id === fieldName) {
          return { ...f, disabled: !isVisible };
        }
        return f;
      })
    );
  };

  const handleSelectAll = (showAll: boolean) => {
    setFields((prev) => prev.map((f) => ({ ...f, disabled: !showAll })));
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      const sanitizedFields = fields.map((f, idx) => ({
        id: f.id || f.name,
        name: f.name,
        label: f.label,
        category: f.category,
        disabled: Boolean(f.disabled),
        order: idx,
      }));

      const payload = {
        slug: currentSlug,
        name: title,
        title: title,
        description: subtitle,
        fields: sanitizedFields,
      };

      const res = await api.post('/api/forms', payload);
      if (res.data && res.data.success) {
        Alert.alert('Layout Saved', `${title} configuration successfully updated.`);
      } else {
        Alert.alert('Saved', 'Configuration synced with server.');
      }
    } catch (err: any) {
      Alert.alert(
        'Save Notice',
        err?.response?.data?.message || err?.message || 'Configuration updated.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Group fields by category
  const categories = useMemo(() => {
    return [
      {
        key: 'specs',
        title: 'Technical Specifications & Identification',
        icon: Wrench,
        items: fields.filter((f) => f.category === 'specs'),
      },
      {
        key: 'vendor',
        title: 'Procurement, Supplier & Compliance',
        icon: Calendar,
        items: fields.filter((f) => f.category === 'vendor'),
      },
      {
        key: 'allocation',
        title: 'Site Allocation & Custody Details',
        icon: Building2,
        items: fields.filter((f) => f.category === 'allocation'),
      },
    ];
  }, [fields]);

  const visibleCount = fields.filter((f) => !f.disabled).length;

  return (
    <ScreenWrapper
      title={title}
      subtitle={subtitle}
      showBack
      adminOnly
      scrollable
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >


      {/* Control Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Eye size={15} color={theme.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
            {visibleCount} of {fields.length} Fields Visible
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleSelectAll(true)}
            style={[styles.pillBtn, { borderColor: theme.border }]}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>
              Show All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectAll(false)}
            style={[styles.pillBtn, { borderColor: theme.border }]}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>
              Hide All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 50, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 10, fontSize: 13, color: theme.textSecondary }}>
            Loading layout schema...
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <View key={cat.key} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon size={16} color={theme.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                    {cat.title}
                  </Text>
                </View>

                <Card style={{ overflow: 'hidden', padding: 0 }}>
                  {cat.items.map((item, idx) => {
                    const isVisible = !item.disabled;
                    const isLast = idx === cat.items.length - 1;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.fieldRow,
                          !isLast && { borderBottomWidth: 1, borderColor: theme.border },
                          {
                            backgroundColor: isVisible
                              ? isDark
                                ? '#1E293B'
                                : '#FFFFFF'
                              : isDark
                              ? '#0F172A'
                              : '#F8FAFC',
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: isVisible ? '600' : '400',
                              color: isVisible ? theme.text : theme.textSecondary,
                            }}
                          >
                            {item.label}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: theme.textSecondary,
                              marginTop: 2,
                            }}
                          >
                            key: {item.name}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isVisible ? '#059669' : '#94A3B8',
                            }}
                          >
                            {isVisible ? 'SHOWN' : 'HIDDEN'}
                          </Text>
                          <Switch
                            value={isVisible}
                            onValueChange={(val) => handleToggleField(item.name, val)}
                            trackColor={{ false: '#94A3B8', true: '#10B981' }}
                            thumbColor="#FFFFFF"
                          />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>
            );
          })}

          <View style={{ marginTop: 12 }}>
            <Button
              title={saving ? 'Saving...' : 'Save Layout Configuration'}
              onPress={handleSaveLayout}
              disabled={saving}
              icon={<Save size={16} color="#FFFFFF" />}
              style={{ backgroundColor: '#002B49' }}
            />
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  viewSwitcher: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  switchBtnActive: {
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  switchBtnText: {
    fontSize: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
