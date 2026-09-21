import api from "@/services/api";
import {
  StoresResponse,
  StoreMutationResponse,
  StoreRecord,
  StoreFormValues,
} from "../types";

export const storeService = {
  /**
   * Retrieves all stores, optionally filtered by projectId.
   */
  getStores: async (projectId?: string): Promise<StoreRecord[]> => {
    const url = projectId ? `/api/stores?projectId=${projectId}` : "/api/stores";
    const response = await api.get<StoresResponse>(url);
    if (response.data && response.data.success) {
      return (response.data.data || []).map((s: any) => ({
        ...s,
        totalToolsCount: s.totalToolsCount ?? s.toolsCount ?? 0,
        availableToolsCount: s.availableToolsCount ?? 0,
        assignedToolsCount: s.assignedToolsCount ?? 0,
      }));
    }
    return [];
  },

  /**
   * Retrieves a single store by its unique ID.
   */
  getStoreById: async (id: string): Promise<StoreRecord | null> => {
    const response = await api.get<{ success: boolean; data?: StoreRecord }>(`/api/stores/${id}`);
    if (response.data && response.data.success && response.data.data) {
      const s = response.data.data as any;
      return {
        ...s,
        totalToolsCount: s.totalToolsCount ?? s.toolsCount ?? 0,
        availableToolsCount: s.availableToolsCount ?? 0,
        assignedToolsCount: s.assignedToolsCount ?? 0,
      };
    }
    return null;
  },

  /**
   * Creates a new store.
   */
  createStore: async (data: StoreFormValues): Promise<StoreMutationResponse> => {
    const response = await api.post<StoreMutationResponse>("/api/stores", data);
    return response.data;
  },

  /**
   * Updates an existing store.
   */
  updateStore: async (
    id: string,
    data: Partial<StoreFormValues>
  ): Promise<StoreMutationResponse> => {
    const response = await api.put<StoreMutationResponse>(`/api/stores/${id}`, data);
    return response.data;
  },

  /**
   * Deletes a store by ID.
   */
  deleteStore: async (id: string): Promise<StoreMutationResponse> => {
    const response = await api.delete<StoreMutationResponse>(`/api/stores/${id}`);
    return response.data;
  },
};

export default storeService;
