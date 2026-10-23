import api from "@/services/api";
import { UserRecord, PendingLoginRequest } from "../types";

export const userService = {
  getUsers: async (): Promise<UserRecord[]> => {
    const res = await api.get<{ success: boolean; data: UserRecord[] }>("/api/users");
    return res.data?.data || [];
  },

  getUserById: async (id: string): Promise<UserRecord | null> => {
    const res = await api.get<{ success: boolean; data: UserRecord }>(`/api/users/${id}`);
    return res.data?.data || null;
  },

  createUser: async (data: Partial<UserRecord> & { password?: string }) => {
    const res = await api.post<{ success: boolean; data: UserRecord }>("/api/users", data);
    return res.data;
  },

  updateUser: async (id: string, data: Partial<UserRecord>) => {
    const res = await api.put(`/api/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: string) => {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  },

  getSubusers: async (): Promise<UserRecord[]> => {
    const res = await api.get<{ success: boolean; data: UserRecord[] }>("/api/users/subusers");
    return res.data?.data || [];
  },

  createSubuser: async (data: Record<string, unknown>) => {
    const res = await api.post<{ success: boolean; data: UserRecord }>("/api/users/subusers", data);
    return res.data;
  },

  updateSubuser: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<{ success: boolean; data: UserRecord }>(`/api/users/subusers/${id}`, data);
    return res.data;
  },

  deleteSubuser: async (id: string) => {
    const res = await api.delete(`/api/users/subusers/${id}`);
    return res.data;
  },

  getPendingApprovals: async (): Promise<PendingLoginRequest[]> => {
    const res = await api.get<{ success: boolean; data: PendingLoginRequest[] }>(
      "/api/users/login-requests/pending"
    );
    return res.data?.data || [];
  },

  approveRequest: async (requestId: string, role?: string) => {
    const res = await api.post(`/api/users/login-requests/${requestId}/approve`, {
      role: role || "Operator",
    });
    return res.data;
  },

  rejectRequest: async (requestId: string, reason?: string) => {
    const res = await api.post(`/api/users/login-requests/${requestId}/reject`, {
      reason,
    });
    return res.data;
  },
};

export default userService;
