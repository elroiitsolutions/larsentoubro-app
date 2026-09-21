/**
 * L&T Enterprise Mobile Theme Colors
 * Preserves brand colors from web application (Indigo primary, slate neutrals, semantic accents).
 */
export const colors = {
  primary: {
    DEFAULT: "#4F46E5",
    foreground: "#FFFFFF",
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },
  secondary: {
    DEFAULT: "#F1F5F9",
    foreground: "#1E293B",
  },
  background: {
    light: "#F8FAFC",
    dark: "#0F172A",
  },
  surface: {
    light: "#FFFFFF",
    dark: "#1E293B",
  },
  card: {
    light: "#FFFFFF",
    dark: "#1E293B",
    foregroundLight: "#0F172A",
    foregroundDark: "#F8FAFC",
  },
  text: {
    primary: "#0F172A",
    secondary: "#64748B",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
  },
  border: {
    light: "#E2E8F0",
    dark: "#334155",
  },
  muted: {
    DEFAULT: "#F1F5F9",
    foreground: "#64748B",
  },
  destructive: {
    DEFAULT: "#EF4444",
    foreground: "#FFFFFF",
    50: "#FEF2F2",
    100: "#FEE2E2",
  },
  success: {
    DEFAULT: "#10B981",
    foreground: "#FFFFFF",
    50: "#ECFDF5",
    100: "#D1FAE5",
  },
  warning: {
    DEFAULT: "#F59E0B",
    foreground: "#FFFFFF",
    50: "#FFFBEB",
    100: "#FEF3C7",
  },
  ltbrand: {
    blue: "#004B87",
    darkBlue: "#002B49",
    accent: "#FFB81C",
  },
} as const;

export type ColorsType = typeof colors;

export function getTheme(isDark: boolean) {
  return {
    isDark,
    bg: isDark ? "#090D16" : "#F8FAFC",
    surface: isDark ? "#0F172A" : "#FFFFFF",
    card: isDark ? "#1E293B" : "#FFFFFF",
    cardBorder: isDark ? "#334155" : "#E2E8F0",
    headerBg: isDark ? "#0F172A" : "#FFFFFF",
    text: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    border: isDark ? "#1E293B" : "#E2E8F0",
    borderLight: isDark ? "#334155" : "#F1F5F9",
    divider: isDark ? "#1E293B" : "#F1F5F9",
    input: isDark ? "#1E293B" : "#F8FAFC",
    inputBorder: isDark ? "#334155" : "#CBD5E1",
    placeholder: isDark ? "#64748B" : "#94A3B8",
    primary: "#4F46E5",
    primaryLight: isDark ? "#1E1B4B" : "#EEF2FF",
    accent: isDark ? "#818CF8" : "#4F46E5",
    success: "#10B981",
    successLight: isDark ? "#064E3B" : "#ECFDF5",
    warning: "#F59E0B",
    warningLight: isDark ? "#78350F" : "#FFFBEB",
    danger: "#EF4444",
    dangerLight: isDark ? "#7F1D1D" : "#FEF2F2",
    info: "#3B82F6",
    infoLight: isDark ? "#1E3A8A" : "#EFF6FF",
    drawerBg: isDark ? "#0B1120" : "#FFFFFF",
    drawerBorder: isDark ? "#1E293B" : "#E2E8F0",
    activeBg: isDark ? "#1E1B4B" : "#EEF2FF",
    activeText: isDark ? "#A5B4FC" : "#4F46E5",
    iconBgMap: {
      blue: isDark ? "#172554" : "#EFF6FF",
      purple: isDark ? "#2E1065" : "#F5F3FF",
      red: isDark ? "#4C0519" : "#FFF1F2",
      yellow: isDark ? "#422006" : "#FFFBEB",
      green: isDark ? "#052E16" : "#F0FDF4",
      indigo: isDark ? "#1E1B4B" : "#EEF2FF",
    } as Record<string, string>,
    iconColorMap: {
      blue: isDark ? "#60A5FA" : "#2563EB",
      purple: isDark ? "#C084FC" : "#9333EA",
      red: isDark ? "#FB7185" : "#EF4444",
      yellow: isDark ? "#FACC15" : "#D97706",
      green: isDark ? "#4ADE80" : "#10B981",
      indigo: isDark ? "#A5B4FC" : "#4F46E5",
    } as Record<string, string>,
  };
}

export type AppTheme = ReturnType<typeof getTheme>;
