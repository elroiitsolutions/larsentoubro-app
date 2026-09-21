/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
        background: {
          DEFAULT: "#F8FAFC",
          dark: "#0F172A",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#1E293B",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
          dark: "#1E293B",
        },
        border: {
          DEFAULT: "#E2E8F0",
          dark: "#334155",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
          dark: "#1E293B",
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
        ltblue: {
          DEFAULT: "#004B87",
          dark: "#002B49",
        },
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
