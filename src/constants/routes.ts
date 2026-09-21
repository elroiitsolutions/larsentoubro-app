export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login",
    FORGOT_PASSWORD: "/(auth)/forgot-password",
  },
  TABS: {
    ROOT: "/(tabs)",
    DASHBOARD: "/(tabs)",
    PROJECTS: "/(tabs)/projects",
    STORES: "/(tabs)/stores",
    TOOLS: "/(tabs)/tools",
    PROFILE: "/(tabs)/profile",
  },
  PROJECTS: {
    DETAILS: (id: string) => `/projects/${id}`,
  },
  STORES: {
    DETAILS: (id: string) => `/stores/${id}`,
  },
  TOOLS: {
    INDEX: "/(tabs)/tools",
    DETAILS: (id: string) => `/tools/${id}`,
    FORM: "/tools/form",
  },
  PROFILES: {
    INDEX: "/profiles",
    FORM: "/profiles/form",
  },
  SCRAP: {
    INDEX: "/scrap",
  },
  TRASH: {
    INDEX: "/trash",
  },
  CHALLANS: {
    INDEX: "/challans",
    DETAILS: (id: string) => `/challans/${id}`,
  },
  ADMIN: {
    APPROVALS: "/admin/approvals",
  },
  USERS: {
    INDEX: "/users",
  },
  REPORTS: {
    INDEX: "/settings/reports",
  },
  SETTINGS: {
    INDEX: "/settings",
  },
} as const;
