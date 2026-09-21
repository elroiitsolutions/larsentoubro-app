import api from "@/services/api";
import {
  ProfileRecord,
  ProfileType,
  ProfileListResponse,
  ProfileDetailResponse,
  ProfileMutationResponse,
} from "../types";

export const profileService = {
  getProfiles: async (
    type?: ProfileType,
    search?: string
  ): Promise<ProfileRecord[]> => {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (search) params.search = search;

    const response = await api.get<ProfileListResponse>("/api/profiles", { params });
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  },

  getProfileById: async (id: string): Promise<ProfileRecord | null> => {
    const response = await api.get<ProfileDetailResponse>(`/api/profiles/${id}`);
    if (response.data && response.data.success) {
      return response.data.data || null;
    }
    return null;
  },

  createProfile: async (
    data: Partial<ProfileRecord>
  ): Promise<ProfileMutationResponse> => {
    const response = await api.post<ProfileMutationResponse>("/api/profiles", data);
    return response.data;
  },

  updateProfile: async (
    id: string,
    data: Partial<ProfileRecord>
  ): Promise<ProfileMutationResponse> => {
    const response = await api.put<ProfileMutationResponse>(`/api/profiles/${id}`, data);
    return response.data;
  },

  deleteProfile: async (id: string): Promise<ProfileMutationResponse> => {
    const response = await api.delete<ProfileMutationResponse>(`/api/profiles/${id}`);
    return response.data;
  },
};

export default profileService;
