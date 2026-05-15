import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        brand: {
          primary: "#2C5F7C",
          primaryLight: "#E8F4F8",
          secondary: "#D4A574",
          secondaryLight: "#FAF3E8",
          gold: "#C9A96E",
          silver: "#A8B5C4",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceElevated: "#F1F5F9",
        textPrimary: "#1E293B",
        textSecondary: "#64748B",
        textMuted: "#94A3B8",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        border: "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Devanagari", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        modal: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-danger": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.5)" },
          "50%": { boxShadow: "0 0 0 6px rgba(239, 68, 68, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "pulse-danger": "pulse-danger 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
