import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import {
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  Store as StoreIcon,
  Users,
  Check,
  CheckCircle2,
  Layers,
  Wrench,
  Truck,
  AlertTriangle,
  ClipboardCheck,
  Archive,
  ShieldCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { ProjectRecord } from '@/features/projects/types';
import { StoreRecord } from '@/features/stores/types';
import { ProfileRecord } from '@/features/profiles/types';
import { ReportFilterState, DEFAULT_REPORT_FILTERS } from '../types';

interface ReportFilterModalProps {
  visible: boolean;
  onClose: () => void;
  activeTab: string;
  filters: ReportFilterState;
  onApply: (newFilters: ReportFilterState) => void;
  onReset: () => void;
  projects: ProjectRecord[];
  stores: StoreRecord[];
  vendors: ProfileRecord[];
  scrapDealers: ProfileRecord[];
}

const DATE_PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This Month' },
  { key: '30days', label: 'Last 30 Days' },
];

const TOOL_STATUSES = [
  'All',
  'Available',
  'Moving',
  'Issued',
  'Repair',
  'Missing',
  'Scrapped',
];

const TOOL_CATEGORIES = [
  'All',
  'Electrical Tools',
  'Mechanical Tools',
  'Lifting & Rigging',
  'Hydraulic Equipment',
  'Safety Equipment',
  'Welding & Cutting',
  'Measuring Instruments',
  'Pneumatic Tools',
  'General Stores',
];

const CHALLAN_TYPES = [
  { value: 'All', label: 'All Types' },
  { value: 'Delivery', label: 'Delivery (DC)' },
  { value: 'Return', label: 'Return (RC)' },
  { value: 'Transfer', label: 'Store Transfer (STC)' },
  { value: 'Scrap', label: 'Scrap (SDC)' },
];

const CHALLAN_STATUSES = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active (Issued)' },
  { value: 'Completed', label: 'Completed (Returned)' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const MISSING_STATUSES = [
  'All',
  'Missing',
  'Found',
  'Reconciled',
  'WrittenOff',
];

const INSPECTION_COMPLIANCE = [
  { value: 'All', label: 'All Compliance' },
  { value: 'Overdue', label: 'Overdue Only' },
  { value: 'DueSoon', label: 'Due in 30 Days' },
  { value: 'Valid', label: 'Valid & Certified' },
  { value: 'LifeExtended', label: 'Life Extended' },
];

const LIFE_EXTENSIONS = [
  { value: 'All', label: 'All Extensions' },
  { value: '1', label: '+1 Year' },
  { value: '2', label: '+2 Years' },
  { value: 'None', label: 'No Extension' },
];

const SCRAP_DISPOSAL_STATUSES = [
  { value: 'All', label: 'All Disposal States' },
  { value: 'Pending', label: 'Pending Disposal' },
  { value: 'Disposed', label: 'Disposed via SDC' },
];

const SUBCONTRACTOR_TIERS = [
  { value: 'All', label: 'All Tiers' },
  { value: 'High', label: 'High (≥90%)' },
  { value: 'Medium', label: 'Medium (60-90%)' },
  { value: 'Low', label: 'Low (<60%)' },
];

const LOGIN_ROLES = [
  'All',
  'Admin',
  'User',
  'Subuser',
  'Vendor',
  'Guest',
];

const LOGIN_STATUSES = [
  'All',
  'Success',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Failed',
];

export const ReportFilterModal: React.FC<ReportFilterModalProps> = ({
  visible,
  onClose,
  activeTab,
  filters,
  onApply,
  onReset,
  projects,
  stores,
  vendors,
  scrapDealers,
}) => {
  const { theme, isDark } = useAppTheme();
  const [localFilters, setLocalFilters] = useState<ReportFilterState>(filters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  // Filter stores according to selected project
  const availableStores = useMemo(() => {
    if (!localFilters.project || localFilters.project === 'All') {
      return stores;
    }
    return stores.filter((s) => {
      const projId = typeof s.project === 'object' && s.project ? s.project._id : s.project;
      return String(projId) === String(localFilters.project);
    });
  }, [stores, localFilters.project]);

  // Handle Preset Selection
  const handleDatePresetSelect = (presetKey: 'all' | 'today' | 'month' | '30days') => {
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];

    if (presetKey === 'all') {
      setLocalFilters((prev) => ({
        ...prev,
        datePreset: 'all',
        startDate: '',
        endDate: '',
      }));
    } else if (presetKey === 'today') {
      setLocalFilters((prev) => ({
        ...prev,
        datePreset: 'today',
        startDate: toStr,
        endDate: toStr,
      }));
    } else if (presetKey === 'month') {
      const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      setLocalFilters((prev) => ({
        ...prev,
        datePreset: 'month',
        startDate: fromDate.toISOString().split('T')[0],
        endDate: toStr,
      }));
    } else if (presetKey === '30days') {
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - 30);
      setLocalFilters((prev) => ({
        ...prev,
        datePreset: '30days',
        startDate: fromDate.toISOString().split('T')[0],
        endDate: toStr,
      }));
    }
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleResetLocal = () => {
    setLocalFilters(DEFAULT_REPORT_FILTERS);
    onReset();
  };

  // Helper chip renderer
  const renderChip = (
    label: string,
    isSelected: boolean,
    onPress: () => void,
    key?: string
  ) => (
    <TouchableOpacity
      key={key || label}
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected
            ? theme.primary
            : isDark
            ? '#1E293B'
            : '#F1F5F9',
          borderColor: isSelected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: isSelected ? '#FFFFFF' : theme.text,
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Filter ${activeTab.toUpperCase()} Register`}
    >
      <ScrollView
        style={{ maxHeight: 460 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* SECTION: Date Range & Presets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={13} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Timeframe / Date Range
            </Text>
          </View>
          <View style={styles.chipRow}>
            {DATE_PRESETS.map((p) =>
              renderChip(
                p.label,
                localFilters.datePreset === p.key,
                () => handleDatePresetSelect(p.key as any),
                p.key
              )
            )}
          </View>

          {/* Manual Date Inputs */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>From Date</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                value={localFilters.startDate || ''}
                onChangeText={(txt) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    startDate: txt,
                    datePreset: 'all',
                  }))
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>To Date</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                value={localFilters.endDate || ''}
                onChangeText={(txt) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    endDate: txt,
                    datePreset: 'all',
                  }))
                }
              />
            </View>
          </View>
        </View>

        {/* SECTION: Project Scoping (All tabs except logins) */}
        {activeTab !== 'logins' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Building2 size={13} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Project
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChipRow}>
              {renderChip('All Projects', localFilters.project === 'All', () =>
                setLocalFilters((prev) => ({ ...prev, project: 'All', store: 'All' }))
              )}
              {projects.map((p) =>
                renderChip(
                  p.name,
                  localFilters.project === p._id,
                  () =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      project: p._id,
                      store: 'All',
                    })),
                  p._id
                )
              )}
            </ScrollView>
          </View>
        )}

        {/* SECTION: Store / HUB (All tabs except logins and subcontractors) */}
        {activeTab !== 'logins' && activeTab !== 'subcontractors' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <StoreIcon size={13} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Store / HUB
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChipRow}>
              {renderChip('All Stores', localFilters.store === 'All', () =>
                setLocalFilters((prev) => ({ ...prev, store: 'All' }))
              )}
              {availableStores.map((s) =>
                renderChip(
                  s.name,
                  localFilters.store === s._id,
                  () => setLocalFilters((prev) => ({ ...prev, store: s._id })),
                  s._id
                )
              )}
            </ScrollView>
          </View>
        )}

        {/* SECTION: Vendor / Subcontractor (tools, challans, missing) */}
        {(activeTab === 'tools' || activeTab === 'challans' || activeTab === 'missing') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={13} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Vendor / Subcontractor
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChipRow}>
              {renderChip('All Vendors', localFilters.vendor === 'All', () =>
                setLocalFilters((prev) => ({ ...prev, vendor: 'All' }))
              )}
              {vendors.map((v) =>
                renderChip(
                  v.name,
                  localFilters.vendor === v.name || localFilters.vendor === v._id,
                  () => setLocalFilters((prev) => ({ ...prev, vendor: v.name })),
                  v._id
                )
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB SPECIFIC: TOOLS */}
        {activeTab === 'tools' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Tool Status
              </Text>
              <View style={styles.chipRow}>
                {TOOL_STATUSES.map((st) =>
                  renderChip(
                    st,
                    localFilters.toolStatus === st,
                    () => setLocalFilters((prev) => ({ ...prev, toolStatus: st })),
                    st
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                QR Label Status
              </Text>
              <View style={styles.chipRow}>
                {[
                  { value: 'All', label: 'All QR' },
                  { value: 'Yes', label: 'QR Printed' },
                  { value: 'No', label: 'Not Printed' },
                ].map((item) =>
                  renderChip(
                    item.label,
                    localFilters.toolPrinted === item.value,
                    () => setLocalFilters((prev) => ({ ...prev, toolPrinted: item.value })),
                    item.value
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Equipment Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChipRow}>
                {TOOL_CATEGORIES.map((cat) =>
                  renderChip(
                    cat,
                    localFilters.toolType === cat,
                    () => setLocalFilters((prev) => ({ ...prev, toolType: cat })),
                    cat
                  )
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* TAB SPECIFIC: CHALLANS */}
        {activeTab === 'challans' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Challan Type
              </Text>
              <View style={styles.chipRow}>
                {CHALLAN_TYPES.map((ct) =>
                  renderChip(
                    ct.label,
                    localFilters.challanType === ct.value,
                    () => setLocalFilters((prev) => ({ ...prev, challanType: ct.value })),
                    ct.value
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Challan Status
              </Text>
              <View style={styles.chipRow}>
                {CHALLAN_STATUSES.map((cs) =>
                  renderChip(
                    cs.label,
                    localFilters.challanStatus === cs.value,
                    () => setLocalFilters((prev) => ({ ...prev, challanStatus: cs.value })),
                    cs.value
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Return Reconciliation
              </Text>
              <View style={styles.chipRow}>
                {renderChip(
                  'All Movements',
                  !localFilters.outstandingOnly,
                  () => setLocalFilters((prev) => ({ ...prev, outstandingOnly: false }))
                )}
                {renderChip(
                  'Outstanding Only (Pending Return)',
                  localFilters.outstandingOnly,
                  () => setLocalFilters((prev) => ({ ...prev, outstandingOnly: true }))
                )}
              </View>
            </View>
          </>
        )}

        {/* TAB SPECIFIC: MISSING */}
        {activeTab === 'missing' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
              Incident Status
            </Text>
            <View style={styles.chipRow}>
              {MISSING_STATUSES.map((ms) =>
                renderChip(
                  ms,
                  localFilters.missingStatus === ms,
                  () => setLocalFilters((prev) => ({ ...prev, missingStatus: ms })),
                  ms
                )
              )}
            </View>
          </View>
        )}

        {/* TAB SPECIFIC: INSPECTIONS */}
        {activeTab === 'inspections' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Compliance Status
              </Text>
              <View style={styles.chipRow}>
                {INSPECTION_COMPLIANCE.map((ic) =>
                  renderChip(
                    ic.label,
                    localFilters.inspectionCompliance === ic.value,
                    () => setLocalFilters((prev) => ({ ...prev, inspectionCompliance: ic.value })),
                    ic.value
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Life Extension
              </Text>
              <View style={styles.chipRow}>
                {LIFE_EXTENSIONS.map((le) =>
                  renderChip(
                    le.label,
                    localFilters.lifeExtension === le.value,
                    () => setLocalFilters((prev) => ({ ...prev, lifeExtension: le.value })),
                    le.value
                  )
                )}
              </View>
            </View>
          </>
        )}

        {/* TAB SPECIFIC: SCRAP */}
        {activeTab === 'scrap' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Disposal Status
              </Text>
              <View style={styles.chipRow}>
                {SCRAP_DISPOSAL_STATUSES.map((sd) =>
                  renderChip(
                    sd.label,
                    localFilters.scrapDisposalStatus === sd.value,
                    () => setLocalFilters((prev) => ({ ...prev, scrapDisposalStatus: sd.value })),
                    sd.value
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Certified Scrap Dealer
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChipRow}>
                {renderChip('All Scrap Dealers', localFilters.scrapDealer === 'All', () =>
                  setLocalFilters((prev) => ({ ...prev, scrapDealer: 'All' }))
                )}
                {scrapDealers.map((d) =>
                  renderChip(
                    d.name,
                    localFilters.scrapDealer === d._id,
                    () => setLocalFilters((prev) => ({ ...prev, scrapDealer: d._id })),
                    d._id
                  )
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* TAB SPECIFIC: SUBCONTRACTORS */}
        {activeTab === 'subcontractors' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
              Return Compliance Tier
            </Text>
            <View style={styles.chipRow}>
              {SUBCONTRACTOR_TIERS.map((tier) =>
                renderChip(
                  tier.label,
                  localFilters.complianceTier === tier.value,
                  () => setLocalFilters((prev) => ({ ...prev, complianceTier: tier.value })),
                  tier.value
                )
              )}
            </View>
          </View>
        )}

        {/* TAB SPECIFIC: LOGINS */}
        {activeTab === 'logins' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                User Role
              </Text>
              <View style={styles.chipRow}>
                {LOGIN_ROLES.map((r) =>
                  renderChip(
                    r,
                    localFilters.loginRole === r,
                    () => setLocalFilters((prev) => ({ ...prev, loginRole: r })),
                    r
                  )
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Authentication Status
              </Text>
              <View style={styles.chipRow}>
                {LOGIN_STATUSES.map((ls) =>
                  renderChip(
                    ls,
                    localFilters.loginStatus === ls,
                    () => setLocalFilters((prev) => ({ ...prev, loginStatus: ls })),
                    ls
                  )
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Actions */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleResetLocal}
          style={[
            styles.resetBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <RotateCcw size={14} color={theme.textSecondary} />
          <Text style={[styles.resetBtnText, { color: theme.textSecondary }]}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleApply}
          style={[styles.applyBtn, { backgroundColor: theme.primary }]}
        >
          <Check size={14} color="#FFFFFF" />
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scrollChipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
