import api from "@/services/api";
import { LoginCredentials, LoginResponse, LoginRequestStatusResponse } from "../types";
import { UserProfile } from "@/types/common.types";

export const authService = {
  /**
   * Submits user credentials to existing login API endpoint.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/api/users/login", credentials);
    return response.data;
  },

  /**
   * Polls login request approval status for 2FA/Admin approval flow.
   */
  checkLoginRequestStatus: async (requestId: string): Promise<LoginRequestStatusResponse> => {
    const response = await api.get<LoginRequestStatusResponse>(`/api/users/login-request/${requestId}`);
    return response.data;
  },

  /**
   * Fetches the current logged in user profile with permissions & store assignments.
   */
  getCurrentUser: async (): Promise<{ success: boolean; data: UserProfile }> => {
    const response = await api.get<{ success: boolean; data: UserProfile }>("/api/users/me");
    return response.data;
  },
};

export default authService;
