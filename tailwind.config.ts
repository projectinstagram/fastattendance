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
          950: "#050608",
          900: "#0A0D12",
          800: "#11151D",
          700: "#1A2028",
          600: "#252C37",
        },
        web: {
          400: "#8FA3B8",
          300: "#B9C6D4",
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
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
