/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
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
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#52525B",
          700: "#3A3A40",
          800: "#262626",
          900: "#1E1E1E",
          950: "#121212",
        },
        background: {
          DEFAULT: "#F8FAFC",
          dark: "#121212",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#181818",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
          dark: "#1E1E1E",
        },
        border: {
          DEFAULT: "#E2E8F0",
          dark: "#2E2E33",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
          dark: "#262626",
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
