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

  updateUser: async (id: string, data: Partial<UserRecord>) => {
    const res = await api.put(`/api/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: string) => {
    const res = await api.delete(`/api/users/${id}`);
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
