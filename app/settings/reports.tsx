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
  SlidersHorizontal,
  X,
  RotateCcw,
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
import { projectService } from '@/features/projects/services/projectService';
import { storeService } from '@/features/stores/services/storeService';
import { profileService } from '@/features/profiles/services/profileService';
import { ProjectRecord } from '@/features/projects/types';
import { StoreRecord } from '@/features/stores/types';
import { ProfileRecord } from '@/features/profiles/types';
import { ReportFilterState, DEFAULT_REPORT_FILTERS } from '@/features/reports/types';
import { ReportFilterModal } from '@/features/reports/components/ReportFilterModal';
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

  // Filter State & Modal
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_REPORT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Master Data for Filters
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [vendors, setVendors] = useState<ProfileRecord[]>([]);
  const [scrapDealers, setScrapDealers] = useState<ProfileRecord[]>([]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [projs, storesList, subcontractors, dealers] = await Promise.all([
          projectService.getProjects().catch(() => []),
          storeService.getStores().catch(() => []),
          profileService.getProfiles('Subcontractor').catch(() => []),
          profileService.getProfiles('ScrapDealer').catch(() => []),
        ]);
        setProjects(projs || []);
        setStores(storesList || []);
        setVendors(subcontractors || []);
        setScrapDealers(dealers || []);
      } catch (err) {
        console.warn('Failed to load master report filters', err);
      }
    };
    loadMasters();
  }, []);

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
      if (filters.project && filters.project !== 'All') {
        params.project = filters.project;
      }
      if (filters.store && filters.store !== 'All') {
        params.store = filters.store;
      }
      if (filters.vendor && filters.vendor !== 'All') {
        params.vendor = filters.vendor;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      switch (activeTab) {
        case 'tools': {
          if (filters.toolStatus && filters.toolStatus !== 'All') {
            params.status = filters.toolStatus;
          }
          if (filters.toolType && filters.toolType !== 'All') {
            params.toolType = filters.toolType;
          }
          if (filters.toolPrinted && filters.toolPrinted !== 'All') {
            params.isPrinted = filters.toolPrinted === 'Yes';
          }
          const res = await reportService.getToolsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'challans': {
          if (filters.challanType && filters.challanType !== 'All') {
            params.challanType = filters.challanType;
          }
          if (filters.challanStatus && filters.challanStatus !== 'All') {
            params.status = filters.challanStatus;
          }
          if (filters.outstandingOnly) {
            params.isOutstandingOnly = 'true';
          }
          const res = await reportService.getChallansReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'missing': {
          if (filters.missingStatus && filters.missingStatus !== 'All') {
            params.status = filters.missingStatus;
          }
          const res = await reportService.getMissingToolsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'inspections': {
          if (filters.inspectionCompliance && filters.inspectionCompliance !== 'All') {
            params.complianceStatus = filters.inspectionCompliance;
          }
          if (filters.inspectionResult && filters.inspectionResult !== 'All') {
            params.inspectionResult = filters.inspectionResult;
          }
          if (filters.lifeExtension && filters.lifeExtension !== 'All') {
            params.lifeExtension = filters.lifeExtension;
          }
          const res = await reportService.getInspectionsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'scrap': {
          if (filters.scrapDisposalStatus && filters.scrapDisposalStatus !== 'All') {
            params.disposalStatus = filters.scrapDisposalStatus;
          }
          if (filters.scrapDealer && filters.scrapDealer !== 'All') {
            params.scrapDealer = filters.scrapDealer;
          }
          const res = await reportService.getScrapReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'subcontractors': {
          if (filters.complianceTier && filters.complianceTier !== 'All') {
            params.complianceFilter = filters.complianceTier;
          }
          const res = await reportService.getSubcontractorsReport(params);
          setReportData(res.data || []);
          setSummaryStats(res.summary || {});
          break;
        }
        case 'logins': {
          if (filters.loginRole && filters.loginRole !== 'All') {
            params.role = filters.loginRole;
          }
          if (filters.loginStatus && filters.loginStatus !== 'All') {
            params.status = filters.loginStatus;
          }
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
  }, [activeTab, searchQuery, filters]);

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
    const exportParams: Record<string, any> = {};
    if (searchQuery.trim()) exportParams.search = searchQuery.trim();
    if (filters.project && filters.project !== 'All') exportParams.project = filters.project;
    if (filters.store && filters.store !== 'All') exportParams.store = filters.store;
    if (filters.vendor && filters.vendor !== 'All') exportParams.vendor = filters.vendor;
    if (filters.startDate) exportParams.startDate = filters.startDate;
    if (filters.endDate) exportParams.endDate = filters.endDate;

    if (activeTab === 'tools') {
      if (filters.toolStatus !== 'All') exportParams.status = filters.toolStatus;
      if (filters.toolType !== 'All') exportParams.toolType = filters.toolType;
      if (filters.toolPrinted !== 'All') exportParams.isPrinted = filters.toolPrinted === 'Yes';
    } else if (activeTab === 'challans') {
      if (filters.challanType !== 'All') exportParams.challanType = filters.challanType;
      if (filters.challanStatus !== 'All') exportParams.status = filters.challanStatus;
      if (filters.outstandingOnly) exportParams.isOutstandingOnly = 'true';
    } else if (activeTab === 'missing') {
      if (filters.missingStatus !== 'All') exportParams.status = filters.missingStatus;
    } else if (activeTab === 'inspections') {
      if (filters.inspectionCompliance !== 'All') exportParams.complianceStatus = filters.inspectionCompliance;
      if (filters.lifeExtension !== 'All') exportParams.lifeExtension = filters.lifeExtension;
    } else if (activeTab === 'scrap') {
      if (filters.scrapDisposalStatus !== 'All') exportParams.disposalStatus = filters.scrapDisposalStatus;
      if (filters.scrapDealer !== 'All') exportParams.scrapDealer = filters.scrapDealer;
    } else if (activeTab === 'subcontractors') {
      if (filters.complianceTier !== 'All') exportParams.complianceFilter = filters.complianceTier;
    } else if (activeTab === 'logins') {
      if (filters.loginRole !== 'All') exportParams.role = filters.loginRole;
      if (filters.loginStatus !== 'All') exportParams.status = filters.loginStatus;
    }

    const url = reportService.getExportUrl(activeTab, 'csv', exportParams);
    Linking.openURL(url).catch(() => {
      Alert.alert('Download Error', 'Could not open download link.');
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.project !== 'All') count++;
    if (filters.store !== 'All') count++;
    if (filters.vendor !== 'All') count++;
    if (filters.datePreset !== 'all' || filters.startDate || filters.endDate) count++;

    if (activeTab === 'tools') {
      if (filters.toolStatus !== 'All') count++;
      if (filters.toolPrinted !== 'All') count++;
      if (filters.toolType !== 'All') count++;
    } else if (activeTab === 'challans') {
      if (filters.challanType !== 'All') count++;
      if (filters.challanStatus !== 'All') count++;
      if (filters.outstandingOnly) count++;
    } else if (activeTab === 'missing') {
      if (filters.missingStatus !== 'All') count++;
    } else if (activeTab === 'inspections') {
      if (filters.inspectionCompliance !== 'All') count++;
      if (filters.lifeExtension !== 'All') count++;
    } else if (activeTab === 'scrap') {
      if (filters.scrapDisposalStatus !== 'All') count++;
      if (filters.scrapDealer !== 'All') count++;
    } else if (activeTab === 'subcontractors') {
      if (filters.complianceTier !== 'All') count++;
    } else if (activeTab === 'logins') {
      if (filters.loginRole !== 'All') count++;
      if (filters.loginStatus !== 'All') count++;
    }
    return count;
  }, [filters, activeTab]);

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; onClear: () => void }[] = [];

    if (filters.project !== 'All') {
      const proj = projects.find((p) => p._id === filters.project);
      tags.push({
        key: 'project',
        label: `Project: ${proj?.name || filters.project}`,
        onClear: () => setFilters((prev) => ({ ...prev, project: 'All', store: 'All' })),
      });
    }

    if (filters.store !== 'All') {
      const st = stores.find((s) => s._id === filters.store);
      tags.push({
        key: 'store',
        label: `Store: ${st?.name || filters.store}`,
        onClear: () => setFilters((prev) => ({ ...prev, store: 'All' })),
      });
    }

    if (filters.vendor !== 'All') {
      tags.push({
        key: 'vendor',
        label: `Vendor: ${filters.vendor}`,
        onClear: () => setFilters((prev) => ({ ...prev, vendor: 'All' })),
      });
    }

    if (filters.datePreset !== 'all') {
      const presetLabels: Record<string, string> = {
        today: 'Date: Today',
        month: 'Date: This Month',
        '30days': 'Date: Last 30 Days',
      };
      tags.push({
        key: 'datePreset',
        label: presetLabels[filters.datePreset] || 'Date Filtered',
        onClear: () =>
          setFilters((prev) => ({
            ...prev,
            datePreset: 'all',
            startDate: '',
            endDate: '',
          })),
      });
    } else if (filters.startDate || filters.endDate) {
      tags.push({
        key: 'customDate',
        label: `${filters.startDate || ''} ~ ${filters.endDate || ''}`,
        onClear: () =>
          setFilters((prev) => ({
            ...prev,
            datePreset: 'all',
            startDate: '',
            endDate: '',
          })),
      });
    }

    if (activeTab === 'tools') {
      if (filters.toolStatus !== 'All') {
        tags.push({
          key: 'toolStatus',
          label: `Status: ${filters.toolStatus}`,
          onClear: () => setFilters((prev) => ({ ...prev, toolStatus: 'All' })),
        });
      }
      if (filters.toolPrinted !== 'All') {
        tags.push({
          key: 'toolPrinted',
          label: `QR: ${filters.toolPrinted === 'Yes' ? 'Printed' : 'Not Printed'}`,
          onClear: () => setFilters((prev) => ({ ...prev, toolPrinted: 'All' })),
        });
      }
      if (filters.toolType !== 'All') {
        tags.push({
          key: 'toolType',
          label: `Category: ${filters.toolType}`,
          onClear: () => setFilters((prev) => ({ ...prev, toolType: 'All' })),
        });
      }
    } else if (activeTab === 'challans') {
      if (filters.challanType !== 'All') {
        tags.push({
          key: 'challanType',
          label: `Type: ${filters.challanType}`,
          onClear: () => setFilters((prev) => ({ ...prev, challanType: 'All' })),
        });
      }
      if (filters.challanStatus !== 'All') {
        tags.push({
          key: 'challanStatus',
          label: `Status: ${filters.challanStatus}`,
          onClear: () => setFilters((prev) => ({ ...prev, challanStatus: 'All' })),
        });
      }
      if (filters.outstandingOnly) {
        tags.push({
          key: 'outstandingOnly',
          label: 'Outstanding Only',
          onClear: () => setFilters((prev) => ({ ...prev, outstandingOnly: false })),
        });
      }
    } else if (activeTab === 'missing') {
      if (filters.missingStatus !== 'All') {
        tags.push({
          key: 'missingStatus',
          label: `Status: ${filters.missingStatus}`,
          onClear: () => setFilters((prev) => ({ ...prev, missingStatus: 'All' })),
        });
      }
    } else if (activeTab === 'inspections') {
      if (filters.inspectionCompliance !== 'All') {
        tags.push({
          key: 'inspectionCompliance',
          label: `Compliance: ${filters.inspectionCompliance}`,
          onClear: () => setFilters((prev) => ({ ...prev, inspectionCompliance: 'All' })),
        });
      }
      if (filters.lifeExtension !== 'All') {
        tags.push({
          key: 'lifeExtension',
          label: `Extension: ${filters.lifeExtension}`,
          onClear: () => setFilters((prev) => ({ ...prev, lifeExtension: 'All' })),
        });
      }
    } else if (activeTab === 'scrap') {
      if (filters.scrapDisposalStatus !== 'All') {
        tags.push({
          key: 'scrapDisposalStatus',
          label: `Disposal: ${filters.scrapDisposalStatus}`,
          onClear: () => setFilters((prev) => ({ ...prev, scrapDisposalStatus: 'All' })),
        });
      }
      if (filters.scrapDealer !== 'All') {
        const dealer = scrapDealers.find((d) => d._id === filters.scrapDealer);
        tags.push({
          key: 'scrapDealer',
          label: `Dealer: ${dealer?.name || filters.scrapDealer}`,
          onClear: () => setFilters((prev) => ({ ...prev, scrapDealer: 'All' })),
        });
      }
    } else if (activeTab === 'subcontractors') {
      if (filters.complianceTier !== 'All') {
        tags.push({
          key: 'complianceTier',
          label: `Tier: ${filters.complianceTier}`,
          onClear: () => setFilters((prev) => ({ ...prev, complianceTier: 'All' })),
        });
      }
    } else if (activeTab === 'logins') {
      if (filters.loginRole !== 'All') {
        tags.push({
          key: 'loginRole',
          label: `Role: ${filters.loginRole}`,
          onClear: () => setFilters((prev) => ({ ...prev, loginRole: 'All' })),
        });
      }
      if (filters.loginStatus !== 'All') {
        tags.push({
          key: 'loginStatus',
          label: `Status: ${filters.loginStatus}`,
          onClear: () => setFilters((prev) => ({ ...prev, loginStatus: 'All' })),
        });
      }
    }

    return tags;
  }, [filters, activeTab, projects, stores, scrapDealers]);

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
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${activeTabConfig.title}...`}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFilterCount > 0 ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                borderColor: activeFilterCount > 0 ? theme.primary : theme.border,
              },
            ]}
          >
            <SlidersHorizontal size={14} color={activeFilterCount > 0 ? '#FFFFFF' : theme.text} />
            <Text
              style={[
                styles.filterBtnText,
                { color: activeFilterCount > 0 ? '#FFFFFF' : theme.text },
              ]}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter Badges */}
        {activeFilterTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {activeFilterTags.map((tag) => (
              <View
                key={tag.key}
                style={[
                  styles.activeFilterTag,
                  {
                    backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
                    borderColor: isDark ? '#4338CA' : '#C7D2FE',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activeFilterTagText,
                    { color: isDark ? '#A5B4FC' : '#4338CA' },
                  ]}
                >
                  {tag.label}
                </Text>
                <TouchableOpacity
                  onPress={tag.onClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={11} color={isDark ? '#A5B4FC' : '#4338CA'} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setFilters(DEFAULT_REPORT_FILTERS)}
              style={[styles.clearAllBtn, { borderColor: theme.border }]}
            >
              <RotateCcw size={10} color={theme.textSecondary} />
              <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '700' }}>
                Clear All
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

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

      {/* Filter Modal */}
      <ReportFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activeTab={activeTab}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(DEFAULT_REPORT_FILTERS)}
        projects={projects}
        stores={stores}
        vendors={vendors}
        scrapDealers={scrapDealers}
      />
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeFilterTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
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

