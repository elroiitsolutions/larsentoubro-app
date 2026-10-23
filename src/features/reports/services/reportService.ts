import api from '@/services/api';
import {
  ReportListResponse,
  ToolReportItem,
  ChallanReportItem,
  MissingToolReportItem,
  InspectionReportItem,
  ScrapReportItem,
  SubcontractorReportItem,
  LoginReportResponse,
} from '../types';

export const reportService = {
  // 1. Tools Master Register
  getToolsReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<ToolReportItem>> => {
    const res = await api.get('/api/reports/tools', { params });
    return res.data;
  },

  // 2. Challans Register
  getChallansReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<ChallanReportItem>> => {
    const res = await api.get('/api/reports/challans', { params });
    return res.data;
  },

  // 3. Loss & Missing Tools Register
  getMissingToolsReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<MissingToolReportItem>> => {
    const res = await api.get('/api/reports/missing', { params });
    return res.data;
  },

  // 4. Statutory Inspections & Compliance
  getInspectionsReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<InspectionReportItem>> => {
    const res = await api.get('/api/reports/inspections', { params });
    return res.data;
  },

  // 5. Scrap & Asset Disposal Register
  getScrapReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<ScrapReportItem>> => {
    const res = await api.get('/api/reports/scrap', { params });
    return res.data;
  },

  // 6. Subcontractor Custody Ledger
  getSubcontractorsReport: async (
    params: Record<string, any> = {}
  ): Promise<ReportListResponse<SubcontractorReportItem>> => {
    const res = await api.get('/api/reports/subcontractors', { params });
    return res.data;
  },

  // 7. Login Audit Activity
  getLoginReport: async (
    params: Record<string, any> = {}
  ): Promise<LoginReportResponse> => {
    const res = await api.get('/api/reports/logins', { params });
    return res.data;
  },

  /**
   * Generates a direct web download URL for Excel / CSV export.
   */
  getExportUrl: (
    type: string,
    format: 'excel' | 'csv' = 'excel',
    params: Record<string, any> = {}
  ): string => {
    const baseUrl = api.defaults.baseURL || '';
    const query = new URLSearchParams({
      ...params,
      type,
      format,
    }).toString();

    if (type === 'logins') {
      return `${baseUrl}/api/reports/logins/export?${query}`;
    }
    return `${baseUrl}/api/reports/export?${query}`;
  },
};

export default reportService;
