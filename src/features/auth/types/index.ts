import { UserProfile } from "@/types/common.types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  requestId?: string;
  message?: string;
  data?: {
    requestId?: string;
    token?: string;
    user?: UserProfile;
  };
}

export interface LoginRequestStatusResponse {
  success: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  token?: string;
  user?: UserProfile;
  reason?: string;
  message?: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
