import api from "@/services/api";
import {
  ExecutiveDashboardData,
  DashboardFilterParams,
} from "../types";

export const dashboardService = {
  /**
   * Retrieves consolidated or filtered executive dashboard statistics from existing backend.
   */
  getDashboardStats: async (params: DashboardFilterParams = {}): Promise<ExecutiveDashboardData> => {
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "All") {
        cleanParams[key] = value;
      }
    });

    const response = await api.get("/api/dashboard/stats", { params: cleanParams });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to load dashboard metrics");
  },

  /**
   * Approves manual inspection and extends tool validity by 1 or 2 years.
   */
  extendToolLife: async (
    toolId: string,
    payload: { extensionYears: number; inspectorName: string; remarks?: string }
  ) => {
    const response = await api.post(
      `/api/dashboard/tools/${encodeURIComponent(toolId)}/extend-life`,
      payload
    );
    return response.data;
  },
};

export default dashboardService;
