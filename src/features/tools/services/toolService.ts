import api from "@/services/api";
import {
  ToolRecord,
  ToolListResponse,
  ToolDetailResponse,
  ToolMutationResponse,
  ToolFilterParams,
  BulkEditPayload,
  ToolTransferPayload,
  ScrapPayload,
  FilterOptionsResponse,
} from "../types";

export const toolService = {
  /**
   * Retrieves tools within a specific store (with full pagination metadata).
   */
  getStoreToolsPaginated: async (
    storeId: string,
    params: ToolFilterParams = {}
  ): Promise<ToolListResponse> => {
    const queryParams = { limit: 50, ...params };
    const response = await api.get<ToolListResponse>(`/api/stores/${storeId}/tools`, {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Retrieves tools within a specific store (legacy direct array accessor).
   */
  getStoreTools: async (
    storeId: string,
    params: ToolFilterParams = {}
  ): Promise<ToolRecord[]> => {
    const queryParams = { limit: 50, ...params };
    const response = await api.get<ToolListResponse>(`/api/stores/${storeId}/tools`, {
      params: queryParams,
    });
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  },

  /**
   * Retrieves all tools globally across all stores (with full pagination metadata).
   */
  getAllToolsPaginated: async (
    params: ToolFilterParams = {}
  ): Promise<ToolListResponse> => {
    const response = await api.get<ToolListResponse>("/api/tools", { params });
    return response.data;
  },

  /**
   * Retrieves all tools globally across all stores (legacy direct array accessor).
   */
  getAllTools: async (params: ToolFilterParams = {}): Promise<ToolRecord[]> => {
    const response = await api.get<ToolListResponse>("/api/tools", { params });
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  },

  /**
   * Retrieves single tool details by ID.
   */
  getToolById: async (id: string): Promise<ToolRecord | null> => {
    const response = await api.get<ToolDetailResponse>(`/api/tools/${encodeURIComponent(id)}`);
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return null;
  },

  /**
   * Creates a new tool in a store.
   */
  createTool: async (
    storeId: string,
    data: Partial<ToolRecord>
  ): Promise<ToolMutationResponse> => {
    const response = await api.post<ToolMutationResponse>(
      `/api/stores/${storeId}/tools`,
      data
    );
    return response.data;
  },

  /**
   * Updates an existing tool.
   * Note: Backend automatically adds validation years if already present!
   */
  updateTool: async (
    id: string,
    data: Partial<ToolRecord>
  ): Promise<ToolMutationResponse> => {
    const response = await api.put<ToolMutationResponse>(
      `/api/tools/${encodeURIComponent(id)}`,
      data
    );
    return response.data;
  },

  /**
   * Soft-deletes a tool (moves to Trash).
   */
  deleteTool: async (id: string): Promise<ToolMutationResponse> => {
    const response = await api.delete<ToolMutationResponse>(
      `/api/tools/${encodeURIComponent(id)}`
    );
    return response.data;
  },

  /**
   * Fetches dynamic filter options (categories, distinct validations, statuses, etc.).
   */
  getToolFilterOptions: async (
    storeId?: string
  ): Promise<FilterOptionsResponse> => {
    const url = storeId
      ? `/api/stores/${storeId}/tools/filter-options`
      : `/api/tools/filter-options`;
    try {
      const response = await api.get<{ success: boolean; data: FilterOptionsResponse }>(url);
      return response.data?.data || {};
    } catch {
      return {};
    }
  },

  /**
   * Bulk edits selected tools.
   */
  bulkEditTools: async (
    storeId?: string,
    payload?: BulkEditPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const url = storeId
      ? `/api/stores/${storeId}/tools/bulk-edit`
      : `/api/tools/bulk-edit`;
    const response = await api.post(url, payload);
    return response.data;
  },

  /**
   * Bulk deletes tools (moves to Trash).
   */
  bulkDeleteTools: async (
    storeId: string | undefined,
    toolIds: string[]
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const url = storeId
      ? `/api/stores/${storeId}/tools/bulk-delete`
      : `/api/tools/bulk-delete`;
    const response = await api.post(url, { toolIds });
    return response.data;
  },

  /**
   * Transfers tools from one store to another.
   */
  transferTools: async (
    payload: ToolTransferPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const url = `/api/stores/${payload.sourceStoreId}/tools/transfer`;
    const response = await api.post(url, payload);
    return response.data;
  },

  /**
   * Fetches scrapped tools from the Scrap archive.
   */
  getScrappedTools: async (
    params: Record<string, any> = {}
  ): Promise<ToolListResponse> => {
    const response = await api.get<ToolListResponse>("/api/tools/scrap", { params });
    return response.data;
  },

  /**
   * Scraps selected tools with dealer and reason.
   */
  scrapTools: async (
    payload: ScrapPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await api.post("/api/tools/scrap", payload);
    return response.data;
  },

  /**
   * Fetches soft-deleted tools from Trash (Admin view).
   */
  getDeletedTools: async (
    params: Record<string, any> = {}
  ): Promise<ToolListResponse> => {
    const response = await api.get<ToolListResponse>("/api/tools/trash", { params });
    return response.data;
  },

  /**
   * Restores a soft-deleted tool from Trash.
   */
  restoreTool: async (id: string): Promise<ToolMutationResponse> => {
    const response = await api.post<ToolMutationResponse>(
      `/api/tools/${encodeURIComponent(id)}/restore`
    );
    return response.data;
  },

  /**
   * Bulk restores soft-deleted tools from Trash.
   */
  bulkRestoreTools: async (
    toolIds: string[]
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await api.post("/api/tools/bulk-restore", { toolIds });
    return response.data;
  },

  /**
   * Permanently deletes a tool (Admin only).
   */
  permanentDeleteTool: async (id: string): Promise<ToolMutationResponse> => {
    const response = await api.delete<ToolMutationResponse>(
      `/api/tools/${encodeURIComponent(id)}/permanent`
    );
    return response.data;
  },

  /**
   * Bulk permanently deletes tools (Admin only).
   */
  bulkPermanentDeleteTools: async (
    toolIds: string[]
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await api.post("/api/tools/bulk-permanent-delete", { toolIds });
    return response.data;
  },

  /**
   * Marks tools as Printed.
   */
  markToolsAsPrinted: async (
    toolIds: string[]
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await api.post("/api/tools/mark-printed", { toolIds });
    return response.data;
  },
};

export default toolService;
