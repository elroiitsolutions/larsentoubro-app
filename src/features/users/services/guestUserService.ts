import api from '@/services/api';
import {
  GuestUserRecord,
  CreateGuestUserDto,
  UpdateGuestUserDto,
  ExtensionDuration,
} from '../types';

export const guestUserService = {
  /**
   * Get list of guest users with optional query filtering
   */
  getGuestUsers: async (params?: { search?: string; status?: string; scopedOnly?: boolean }): Promise<GuestUserRecord[]> => {
    const res = await api.get<{ success: boolean; data: GuestUserRecord[] }>('/api/guest-users', { params });
    return res.data?.data || [];
  },

  /**
   * Get single guest user by ID
   */
  getGuestUserById: async (id: string): Promise<GuestUserRecord | null> => {
    const res = await api.get<{ success: boolean; data: GuestUserRecord }>(`/api/guest-users/${id}`);
    return res.data?.data || null;
  },

  /**
   * Create new guest user account with 15-day validity
   */
  createGuestUser: async (data: CreateGuestUserDto) => {
    const res = await api.post<{ success: boolean; message: string; data: GuestUserRecord }>('/api/guest-users', data);
    return res.data;
  },

  /**
   * Update existing guest user details
   */
  updateGuestUser: async (id: string, data: UpdateGuestUserDto) => {
    const res = await api.put<{ success: boolean; message: string; data: GuestUserRecord }>(`/api/guest-users/${id}`, data);
    return res.data;
  },

  /**
   * Extend guest user access validity with preset duration or manual date
   */
  extendGuestUser: async (id: string, duration: ExtensionDuration | string, customDate?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: GuestUserRecord }>(`/api/guest-users/${id}/extend`, {
      duration,
      customDate,
    });
    return res.data;
  },

  /**
   * Reject guest user extension request and immediately expire access
   */
  rejectGuestUser: async (id: string, reason?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: GuestUserRecord }>(`/api/guest-users/${id}/reject`, {
      reason,
    });
    return res.data;
  },

  /**
   * Permanently delete a guest user
   */
  deleteGuestUser: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/guest-users/${id}`);
    return res.data;
  },
};

export default guestUserService;

