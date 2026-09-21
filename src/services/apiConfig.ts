import { ENV } from "@/config/environment";
import { APP_CONFIG } from "@/constants/appConstants";

export const apiConfig = {
  baseURL: ENV.API_BASE_URL,
  timeout: APP_CONFIG.DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
