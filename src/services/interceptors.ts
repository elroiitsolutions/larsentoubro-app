import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/constants/storageKeys";

/**
 * Request interceptor to attach Bearer token from SecureStore.
 */
export async function requestInterceptor(
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // Fail gracefully if secure store read fails
  }
  return config;
}

/**
 * Request error interceptor.
 */
export function requestErrorInterceptor(error: AxiosError): Promise<never> {
  return Promise.reject(error);
}

/**
 * Response interceptor.
 */
export function responseInterceptor(response: AxiosResponse): AxiosResponse {
  return response;
}

/**
 * Response error interceptor - handles 401 token cleanup.
 */
export async function responseErrorInterceptor(error: AxiosError): Promise<never> {
  const status = error.response?.status;

  if (status === 401) {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (e) {
      // Ignore cleanup error
    }
  }

  return Promise.reject(error);
}
