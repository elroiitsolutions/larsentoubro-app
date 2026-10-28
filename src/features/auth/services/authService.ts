import api from "@/services/api";
import { LoginCredentials, LoginResponse, LoginRequestStatusResponse, RequestOtpResponse } from "../types";
import { UserProfile } from "@/types/common.types";

export const authService = {
  /**
   * Request a single-use 6-digit OTP code to registered email
   */
  requestOtp: async (email: string): Promise<RequestOtpResponse> => {
    const response = await api.post<RequestOtpResponse>("/api/users/request-otp", { email });
    return response.data;
  },

  /**
   * Verify the 6-digit OTP code and retrieve the authenticated session token
   */
  verifyOtp: async (email: string, otp: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/api/users/verify-otp", { email, otp });
    return response.data;
  },

  /**
   * Submits user credentials/OTP to login API endpoint (backward compatible).
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/api/users/login", credentials);
    return response.data;
  },

  /**
   * Authenticates as a Guest User with QR scanner access.
   */
  guestLogin: async (): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/api/users/guest-login");
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
