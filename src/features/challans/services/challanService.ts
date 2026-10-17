import api from "@/services/api";
import {
  ChallanRecord,
  ChallanListResponse,
  ChallanFilterParams,
} from "../types";

export const challanService = {
  /**
   * Retrieves all challans with optional filtering.
   */
  getChallans: async (params: ChallanFilterParams = {}): Promise<ChallanRecord[]> => {
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "All") {
        cleanParams[key] = String(value);
      }
    });

    const response = await api.get<ChallanListResponse>("/api/challans", {
      params: cleanParams,
    });
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  },

  /**
   * Retrieves single challan details by ID.
   */
  getChallanById: async (id: string): Promise<ChallanRecord | null> => {
    const response = await api.get<{ success: boolean; data: ChallanRecord }>(
      `/api/challans/${id}`
    );
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return null;
  },

  /**
   * Creates a new Delivery Challan (DC).
   */
  createDeliveryChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord }>(
      "/api/challans/delivery",
      data
    );
    return response.data;
  },

  /**
   * Creates a new Return Challan (RC).
   */
  createReturnChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord }>(
      "/api/challans/return",
      data
    );
    return response.data;
  },

  /**
   * Creates a Scrap Delivery Challan (DC for scrap dealer).
   */
  createScrapDeliveryChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord }>(
      "/api/challans/scrap-delivery",
      data
    );
    return response.data;
  },

  /**
   * Updates an existing Delivery Challan.
   */
  updateDeliveryChallan: async (id: string, data: Record<string, any>) => {
    const response = await api.put<{ success: boolean; data: ChallanRecord }>(
      `/api/challans/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Logs a PDF download audit entry on the server.
   */
  logPdfDownload: async (referenceNumber: string, details?: string) => {
    try {
      const response = await api.post("/api/challans/log-pdf-download", {
        referenceNumber,
        details,
      });
      return response.data;
    } catch {
      // Non-blocking telemetry
      return { success: false };
    }
  },
};

export default challanService;
