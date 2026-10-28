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
   * Throws on failure — caller handles error display.
   */
  createDeliveryChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord; message?: string }>(
      "/api/challans/delivery",
      data
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create Delivery Challan");
    }
    return response.data;
  },

  /**
   * Creates a new Return Challan (RC).
   * Throws on failure — caller handles error display.
   */
  createReturnChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord; message?: string }>(
      "/api/challans/return",
      data
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create Return Challan");
    }
    return response.data;
  },

  /**
   * Creates a Scrap Delivery Challan (DC for scrap dealer).
   * Throws on failure — caller handles error display.
   */
  createScrapDeliveryChallan: async (data: Record<string, any>) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord; message?: string }>(
      "/api/challans/scrap-delivery",
      data
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create Scrap Delivery Challan");
    }
    return response.data;
  },

  /**
   * Cancels an active Delivery Challan and reverts tool statuses to Available.
   * Parity with backend POST /api/challans/:id/cancel
   */
  cancelDeliveryChallan: async (id: string, reason?: string) => {
    const response = await api.post<{ success: boolean; data: ChallanRecord; message?: string }>(
      `/api/challans/${id}/cancel`,
      { reason: reason || "Cancelled via mobile app" }
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to cancel Delivery Challan");
    }
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
   * Fetches the official generated PDF as a Blob from the backend.
   */
  downloadChallanPdfBlob: async (id: string): Promise<Blob> => {
    const response = await api.get(`/api/challans/${id}/pdf`, {
      responseType: "blob",
    });
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

  /**
   * Peeks the upcoming sequential Challan number (e.g. DC-26-043)
   */
  getNextChallanNumber: async (type: string = "Delivery"): Promise<string> => {
    try {
      const response = await api.get<{ success: boolean; data: { challanNumber: string } }>(
        "/api/challans/next-number",
        { params: { type } }
      );
      return response.data?.data?.challanNumber || (type === "Scrap" ? "SDC-26-001" : "DC-26-001");
    } catch {
      return type === "Scrap" ? "SDC-26-001" : "DC-26-001";
    }
  },
};

export default challanService;
