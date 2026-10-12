import type { Config } from "tailwindcss";

// GlowFit design tokens, taken from the approved mockups.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FBF6F2",
        blush: { 50: "#FDF8F6", 100: "#F8ECE7", 200: "#F1DCD4", 300: "#E6C3B8" },
        rose: { 400: "#D29A92", 500: "#C07B73", 600: "#A65F58" },
        wine: { 600: "#8A3A3A", 700: "#7A2E2E", 800: "#5E2323" },
        cocoa: { 700: "#5A3A35", 800: "#4A2C2A", 900: "#3A2220" },
        champagne: "#E9D5C5",
        charcoal: "#1F1A1A",
        sage: "#4E9A6A",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(90, 58, 53, 0.18)",
        soft: "0 4px 14px -6px rgba(90, 58, 53, 0.15)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        scan: { "0%": { top: "8%" }, "50%": { top: "88%" }, "100%": { top: "8%" } },
        pulseRing: { "0%": { transform: "scale(0.95)", opacity: "0.7" }, "100%": { transform: "scale(1.15)", opacity: "0" } },
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(250%)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        orbit: { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
      },
      animation: {
        scan: "scan 2.6s ease-in-out infinite",
        pulseRing: "pulseRing 1.6s ease-out infinite",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        fadeUp: "fadeUp 0.35s ease-out both",
        orbit: "orbit 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
