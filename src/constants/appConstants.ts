export const APP_CONFIG = {
  APP_NAME: "L&T Enterprise",
  APP_VERSION: "1.0.0",
  DEFAULT_TIMEOUT: 30000,
  POLL_INTERVAL_MS: 3000,
  LOGIN_TIMEOUT_SECONDS: 600,
} as const;

export const USER_ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ENGINEER: "Engineer",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  VENDOR: "Vendor",
} as const;
