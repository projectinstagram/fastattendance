import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#111A2E",
          800: "#1B2740",
          700: "#293654",
        },
        paper: "#F6F5F1",
        brass: {
          400: "#C9A227",
          500: "#B08D1E",
          600: "#8F7218",
        },
        signal: {
          present: "#1F8A5E",
          late: "#B8791A",
          absent: "#B0402C",
        },
        // Scoped to the login page's dark 3D theme only — never used
        // elsewhere in the app, so the light "ink/paper/brass" system
        // used everywhere else is unaffected.
        void: {
          950: "#0D1117",
          900: "#1A1F2B",
          800: "#2A2F3A",
          700: "#374050",
          600: "#454F63",
        },
        web: {
          400: "#8FA3B8",
          300: "#B9C6D4",
        },
        neon: {
          DEFAULT: "#00FF66",
          dim: "#00CC52",
        },
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "3px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "portal-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "portal-spin-reverse": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        "portal-in": {
          "0%": { opacity: "0", transform: "scale(0.7)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "g-pop": {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "portal-spin": "portal-spin 1.6s linear infinite",
        "portal-spin-reverse": "portal-spin-reverse 2.2s linear infinite",
        "portal-in": "portal-in 0.25s cubic-bezier(0.22,1,0.36,1)",
        "g-pop": "g-pop 0.4s cubic-bezier(0.22,1,0.36,1) 0.1s both",
      },
    },
  },
  plugins: [],
};

export default config;
