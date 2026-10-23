import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  Wrench,
  Truck,
  AlertTriangle,
  ClipboardCheck,
  Recycle,
  Users,
  ShieldCheck,
  Share2,
  Download,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { SearchBar } from '@/components/common/SearchBar';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { reportService } from '@/features/reports/services/reportService';
import {
  generateAndShareReportPdf,
  ColumnDefinition,
} from '@/features/reports/utils/reportPdfGenerator';

type ReportTabKey =
  | 'tools'
  | 'challans'
  | 'missing'
  | 'inspections'
  | 'scrap'
  | 'subcontractors'
  | 'logins';

interface TabDefinition {
  key: ReportTabKey;
  label: string;
  icon: any;
  color: string;
}

const TABS: TabDefinition[] = [
  { key: 'tools', label: 'Tools Master', icon: Wrench, color: '#4F46E5' },
  { key: 'challans', label: 'Challan Register', icon: Truck, color: '#059669' },
  { key: 'missing', label: 'Loss & Missing', icon: AlertTriangle, color: '#DC2626' },
  { key: 'inspections', label: 'Inspections', icon: ClipboardCheck, color: '#D97706' },
  { key: 'scrap', label: 'Scrap Register', icon: Recycle, color: '#7C3AED' },
  { key: 'subcontractors', label: 'Subcontractors', icon: Users, color: '#2563EB' },
  { key: 'logins', label: 'Login Audits', icon: ShieldCheck, color: '#0891B2' },
];

export default function ReportsHubScreen() {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<ReportTabKey>('tools');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportData, setReportData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({});

  const fetchTabReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        limit: 100,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      switch (activeTab) {
        case 'tools': {
          const res = await reportService.getToolsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'challans': {
          const res = await reportService.getChallansReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'missing': {
          const res = await reportService.getMissingToolsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'inspections': {
          const res = await reportService.getInspectionsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'scrap': {
          const res = await reportService.getScrapReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'subcontractors': {
          const res = await reportService.getSubcontractorsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'logins': {
          const res = await reportService.getLoginReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.stats || {});
          break;
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch report register.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchTabReport();
  }, [fetchTabReport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTabReport();
  };

  // Define table columns & titles for PDF Export
  const activeTabConfig = useMemo(() => {
    switch (activeTab) {
      case 'tools':
        return {
          title: 'Equipment & Tools Master Register',
          subtitle: 'Active Equipment Inventory across all L&T Facilities',
          stats: [
            { label: 'Total', value: summaryStats.total || reportData.length },
            { label: 'Available', value: summaryStats.available || '-' },
            { label: 'Issued', value: summaryStats.issued || '-' },
            { label: 'Maintenance', value: summaryStats.underMaintenance || '-' },
            { label: 'Inspection Due', value: summaryStats.inspectionDue || '-' },
          ],
          columns: [
            { title: 'Tool ID', key: 'toolId' },
            { title: 'Description', key: 'description' },
            { title: 'Category', key: 'category' },
            {
              title: 'Store / Site',
              key: 'currentSite',
              render: (r: any) => r.currentSite?.name || r.store?.name || '-',
            },
            { title: 'Status', key: 'status' },
            {
              title: 'Validation',
              key: 'validation',
              render: (r: any) => r.validation || r.validityPeriod || '-',
            },
          ] as ColumnDefinition[],
        };
      case 'challans':
        return {
          title: 'Movement & Delivery Challan Register',
          subtitle: 'Dispatch & Return Audit Records',
          stats: [
            { label: 'Total Challans', value: summaryStats.total || reportData.length },
            { label: 'Delivery DCs', value: summaryStats.delivery || '-' },
            { label: 'Return RCs', value: summaryStats.return || '-' },
            { label: 'Active / Pending', value: summaryStats.active || '-' },
          ],
          columns: [
            { title: 'Challan No', key: 'challanNumber' },
            { title: 'Type', key: 'challanType' },
            {
              title: 'Date',
              key: 'challanDate',
              render: (r: any) =>
                r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-GB') : '-',
            },
            {
              title: 'Receiver / Subcontractor',
              key: 'subcontractorName',
              render: (r: any) => r.subcontractorName || r.vendor?.name || r.receiverName || '-',
            },
            { title: 'Tools', key: 'toolCount' },
            { title: 'Status', key: 'status' },
          ] as ColumnDefinition[],
        };
      case 'missing':
        return {
          title: 'Loss & Missing Tools Register',
          subtitle: 'Discrepancy and Return Loss Tracking',
          stats: [
            { label: 'Missing Incidents', value: summaryStats.total || reportData.length },
            { label: 'Under Review', value: summaryStats.pending || '-' },
          ],
          columns: [
            { title: 'Tool ID', key: 'toolIdStr' },
            { title: 'Description', key: 'description' },
            {
              title: 'Missing Date',
              key: 'missingDate',
              render: (r: any) =>
                r.missingDate ? new Date(r.missingDate).toLocaleDateString('en-GB') : '-',
            },
            { title: 'DC Number', key: 'dcNumber' },
            { title: 'RC Number', key: 'rcNumber' },
            { title: 'Vendor / Custodian', key: 'vendorName' },
            { title: 'Loss Remarks', key: 'remarks' },
          ] as ColumnDefinition[],
        };
      case 'inspections':
        return {
          title: 'Statutory Inspections & Calibration Compliance',
          subtitle: 'Safety Audit Status & Renewals',
          stats: [
            { label: 'Total Inspected', value: summaryStats.total || reportData.length },
            { label: 'Compliant', value: summaryStats.compliant || '-' },
            { label: 'Due Soon', value: summaryStats.dueSoon || '-' },
            { label: 'Overdue', value: summaryStats.overdue || '-' },
          ],
          columns: [
            { title: 'Tool ID', key: 'toolId' },
            { title: 'Description', key: 'description' },
            {
              title: 'Last Inspected',
              key: 'lastInspectionDate',
              render: (r: any) =>
                r.lastInspectionDate
                  ? new Date(r.lastInspectionDate).toLocaleDateString('en-GB')
                  : '-',
            },
            {
              title: 'Expiry Date',
              key: 'nextInspectionDueDate',
              render: (r: any) =>
                r.nextInspectionDueDate
                  ? new Date(r.nextInspectionDueDate).toLocaleDateString('en-GB')
                  : '-',
            },
            { title: 'Status', key: 'complianceBadge' },
          ] as ColumnDefinition[],
        };
      case 'scrap':
        return {
          title: 'Scrap & Asset Disposal Register',
          subtitle: 'Retired and Decommissioned Equipment',
          stats: [
            { label: 'Total Scrapped', value: summaryStats.total || reportData.length },
            { label: 'Pending Disposal', value: summaryStats.pending || '-' },
            { label: 'Disposed', value: summaryStats.disposed || '-' },
          ],
          columns: [
            { title: 'Tool ID', key: 'toolId' },
            { title: 'Description', key: 'description' },
            {
              title: 'Scrapped Date',
              key: 'scrappedAt',
              render: (r: any) =>
                r.scrappedAt ? new Date(r.scrappedAt).toLocaleDateString('en-GB') : '-',
            },
            { title: 'Reason', key: 'scrapReason' },
            {
              title: 'Status',
              key: 'isDisposed',
              render: (r: any) => (r.isDisposed ? 'Disposed via DC' : 'Pending Disposal'),
            },
          ] as ColumnDefinition[],
        };
      case 'subcontractors':
        return {
          title: 'Subcontractor Custody Ledger',
          subtitle: 'Partner Holding & Return Compliance Metrics',
          stats: [
            { label: 'Contractors', value: reportData.length },
            {
              label: 'Total Dispatched',
              value: reportData.reduce((acc, c) => acc + (c.totalDispatched || 0), 0),
            },
            {
              label: 'Holding Count',
              value: reportData.reduce((acc, c) => acc + (c.holdingCount || 0), 0),
            },
          ],
          columns: [
            { title: 'Name', key: 'name' },
            { title: 'Code', key: 'code' },
            { title: 'Dispatched', key: 'totalDispatched' },
            { title: 'Returned', key: 'totalReturned' },
            { title: 'Missing', key: 'totalMissing' },
            { title: 'Currently Holding', key: 'holdingCount' },
            {
              title: 'Return Rate',
              key: 'returnComplianceRate',
              render: (r: any) => `${r.returnComplianceRate || 0}%`,
            },
          ] as ColumnDefinition[],
        };
      case 'logins':
        return {
          title: 'Login & Access Audit Activity',
          subtitle: 'User Session History & Security Events',
          stats: [
            { label: 'Total Logins', value: summaryStats.total || reportData.length },
            { label: 'Successful', value: summaryStats.success || '-' },
            { label: 'Failed', value: summaryStats.failed || '-' },
            { label: 'Pending Approval', value: summaryStats.pending || '-' },
          ],
          columns: [
            { title: 'User Name', key: 'userName' },
            { title: 'Role', key: 'role' },
            { title: 'Status', key: 'status' },
            {
              title: 'Login Time',
              key: 'loginAt',
              render: (r: any) =>
                r.loginAt ? new Date(r.loginAt).toLocaleString('en-GB') : '-',
            },
            { title: 'IP Address', key: 'ipAddress' },
          ] as ColumnDefinition[],
        };
    }
  }, [activeTab, summaryStats, reportData]);

  const handleSharePdf = async () => {
    try {
      setExporting(true);
      await generateAndShareReportPdf({
        title: activeTabConfig.title,
        subtitle: activeTabConfig.subtitle,
        stats: activeTabConfig.stats,
        columns: activeTabConfig.columns,
        data: reportData,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not export report.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCsv = () => {
    const url = reportService.getExportUrl(activeTab, 'csv');
    Linking.openURL(url).catch(() => {
      Alert.alert('Download Error', 'Could not open download link.');
    });
  };

  return (
    <ScreenWrapper title="Enterprise Reports Hub" showBack requiredPage="/reports">
      {/* Horizontal Scrollable Tabs */}
      <View style={{ borderBottomWidth: 1, borderColor: theme.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive
                      ? tab.color
                      : isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                    borderColor: isActive ? tab.color : theme.border,
                  },
                ]}
              >
                <Icon size={14} color={isActive ? '#FFFFFF' : theme.textSecondary} />
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isActive ? '#FFFFFF' : theme.text,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search & Actions Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: theme.border,
          gap: 10,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTabConfig.title}...`}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600' }}>
            {reportData.length} Records Found
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDownloadCsv}
              style={[
                styles.headerActionBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
            >
              <Download size={13} color={theme.text} />
              <Text style={[styles.headerActionText, { color: theme.text }]}>
                CSV
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSharePdf}
              disabled={exporting}
              style={[styles.headerActionBtn, { backgroundColor: '#4F46E5' }]}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={13} color="#FFFFFF" />
                  <Text style={[styles.headerActionText, { color: '#FFFFFF' }]}>
                    Share PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* KPI Stats Cards Carousel / Row */}
      {activeTabConfig.stats.length > 0 && (
        <View
          style={{
            flexShrink: 0,
            borderBottomWidth: 1,
            borderColor: theme.border,
            backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "#F8FAFC",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}
          >
            {activeTabConfig.stats.map((s, idx) => (
              <View
                key={idx}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: theme.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {s.label}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.text,
                    marginTop: 4,
                  }}
                >
                  {s.value}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Register Records List */}
      {loading ? (
        <Loader fullScreen message={`Loading ${activeTabConfig.title}...`} />
      ) : error ? (
        <ErrorState title="Report Error" message={error} onRetry={fetchTabReport} />
      ) : (
        <FlatList
          data={reportData}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10, padding: 12 }}>
              {/* Dynamic Card Content per Tab */}
              {activeTab === 'tools' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.description || item.name}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.textSecondary, marginTop: 2 }}>
                        ID: {item.toolId}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.badgeText, { color: '#4F46E5' }]}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Store: <Text style={{ fontWeight: '600', color: theme.text }}>{item.currentSite?.name || '-'}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Validation: <Text style={{ fontWeight: '600', color: theme.text }}>{item.validation || item.validityPeriod || '-'}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'challans' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.challanNumber}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        To: {item.subcontractorName || item.vendor?.name || item.receiverName || '-'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            item.challanType === 'Return' ? '#FEF3C7' : '#ECFDF5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.challanType === 'Return' ? '#B45309' : '#047857',
                          },
                        ]}
                      >
                        {item.challanType} DC
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Date: <Text style={{ fontWeight: '600', color: theme.text }}>
                        {item.challanDate ? new Date(item.challanDate).toLocaleDateString('en-GB') : '-'}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Items: <Text style={{ fontWeight: '700', color: theme.text }}>{item.toolCount || 1}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'missing' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.toolIdStr}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>
                        {item.description}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: '#DC2626' }]}>MISSING</Text>
                    </View>
                  </View>

                  <View style={{ backgroundColor: isDark ? '#1E293B' : '#FEF2F2', padding: 8, borderRadius: 8, marginVertical: 6 }}>
                    <Text style={{ fontSize: 11, color: '#B91C1C' }}>
                      Loss Remarks: {item.remarks || 'Reported lost during Return Challan processing.'}
                    </Text>
                  </View>

                  <View style={styles.rowMeta}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Origin DC: <Text style={{ fontWeight: '600', color: theme.text }}>{item.dcNumber || '-'}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Return RC: <Text style={{ fontWeight: '600', color: theme.text }}>{item.rcNumber || '-'}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'inspections' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.toolId}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                        {item.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            item.complianceBadge === 'Compliant'
                              ? '#ECFDF5'
                              : item.complianceBadge === 'Due Soon'
                              ? '#FFFBEB'
                              : '#FEF2F2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.complianceBadge === 'Compliant'
                                ? '#047857'
                                : item.complianceBadge === 'Due Soon'
                                ? '#B45309'
                                : '#DC2626',
                          },
                        ]}
                      >
                        {item.complianceBadge || 'Pass'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Expiry:{' '}
                      <Text style={{ fontWeight: '600', color: theme.text }}>
                        {item.nextInspectionDueDate
                          ? new Date(item.nextInspectionDueDate).toLocaleDateString('en-GB')
                          : '-'}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Inspected By:{' '}
                      <Text style={{ fontWeight: '600', color: theme.text }}>
                        {item.inspectedBy?.name || 'Inspector'}
                      </Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'scrap' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.toolId}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                        {item.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.isDisposed ? '#E2E8F0' : '#FEF2F2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.isDisposed ? '#475569' : '#DC2626' },
                        ]}
                      >
                        {item.isDisposed ? 'DISPOSED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Reason: <Text style={{ fontWeight: '600', color: theme.text }}>{item.scrapReason || '-'}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Date: <Text style={{ fontWeight: '600', color: theme.text }}>
                        {item.scrappedAt ? new Date(item.scrappedAt).toLocaleDateString('en-GB') : '-'}
                      </Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'subcontractors' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                        Code: {item.code} • Contact: {item.contactPerson || '-'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.badgeText, { color: '#2563EB' }]}>
                        {item.returnComplianceRate || 0}% Compliance
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Dispatched: <Text style={{ fontWeight: '700', color: theme.text }}>{item.totalDispatched || 0}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Returned: <Text style={{ fontWeight: '700', color: '#059669' }}>{item.totalReturned || 0}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Holding: <Text style={{ fontWeight: '700', color: '#D97706' }}>{item.holdingCount || 0}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Missing: <Text style={{ fontWeight: '700', color: '#DC2626' }}>{item.totalMissing || 0}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'logins' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        {item.userName}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                        {item.userEmail} • Role: {item.role}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            item.status === 'Success' || item.status === 'Approved'
                              ? '#ECFDF5'
                              : '#FEF2F2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.status === 'Success' || item.status === 'Approved'
                                ? '#047857'
                                : '#DC2626',
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rowMeta, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Time:{' '}
                      <Text style={{ fontWeight: '600', color: theme.text }}>
                        {item.loginAt ? new Date(item.loginAt).toLocaleString('en-GB') : '-'}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      IP: <Text style={{ fontFamily: 'monospace', color: theme.text }}>{item.ipAddress || '-'}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Records Found"
              description={`No data found in the ${activeTabConfig.title}.`}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statCard: {
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
});
