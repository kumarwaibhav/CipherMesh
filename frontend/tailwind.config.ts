import type { Config } from "tailwindcss";

const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;

/** A Tailwind colour scale whose every shade reads an "r g b" CSS variable (see app/globals.css). */
function scale(name: string): Record<string, string> {
  return Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));
}

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        zinc: scale("zinc"),
        emerald: scale("emerald"),
        amber: scale("amber"),
        sky: scale("sky"),
        red: scale("red"),
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          hover: "rgb(var(--brand-hover) / <alpha-value>)",
        },
        label: {
          DEFAULT: "rgb(var(--label) / <alpha-value>)",
          2: "rgb(var(--label-2) / <alpha-value>)",
          3: "rgb(var(--label-3) / <alpha-value>)",
        },
        tint: {
          DEFAULT: "rgb(var(--tint) / <alpha-value>)",
          hover: "rgb(var(--tint-hover) / <alpha-value>)",
          text: "rgb(var(--tint-text) / <alpha-value>)",
        },
        allow: { DEFAULT: "rgb(var(--allow) / <alpha-value>)", text: "rgb(var(--allow-text) / <alpha-value>)" },
        redact: { DEFAULT: "rgb(var(--redact) / <alpha-value>)", text: "rgb(var(--redact-text) / <alpha-value>)" },
        review: { DEFAULT: "rgb(var(--review) / <alpha-value>)", text: "rgb(var(--review-text) / <alpha-value>)" },
        block: { DEFAULT: "rgb(var(--block) / <alpha-value>)", text: "rgb(var(--block-text) / <alpha-value>)" },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        glass: "var(--glass-highlight), var(--glass-shadow)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "var(--font-mono)",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        blink: "blink 1.1s steps(1, end) infinite",
        "fade-in": "fade-in 160ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
