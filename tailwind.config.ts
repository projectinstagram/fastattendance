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
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
