import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0F0F12", soft: "#3A3A42", muted: "#7A7A85" },
        cream: { DEFAULT: "#F4EFE6", soft: "#FAF7F1" },
        brand: { DEFAULT: "#0F5132", soft: "#147A4A", glow: "#22C58A" },
        surface: { DEFAULT: "#FFFFFF", alt: "#F7F4EE" },
        accent: {
          red: "#E03E3E",
          amber: "#E8A93D",
          indigo: "#5566FF",
          teal: "#2A9D8F",
          violet: "#7C3AED",
          pink: "#EC4899",
        },
        night: { 0: "#0A0A0E", 1: "#101015", 2: "#16161D", 3: "#1F1F29", 4: "#2A2A36", 5: "#3A3A48" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Inter"', '"Hiragino Sans"', '"Yu Gothic"', "Meiryo", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
        display: ['"Inter"', '"Hiragino Sans"', '"Yu Gothic"', "sans-serif"],
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4,0,.2,1)",
        grow: "cubic-bezier(.2,.6,.2,1)",
        bounce: "cubic-bezier(.6,1.5,.4,1)",
      },
      keyframes: {
        growFromBottom: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.15)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
      animation: {
        growFromBottom: "growFromBottom .4s cubic-bezier(.2,.6,.2,1) both",
        fadeIn: "fadeIn .4s ease both",
        pulseDot: "pulseDot 2s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        floaty: "floaty 3s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-light":
          "linear-gradient(to right, rgba(15,15,18,.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,15,18,.04) 1px, transparent 1px)",
        "grid-dark":
          "linear-gradient(to right, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.04) 1px, transparent 1px)",
        "brand-glow":
          "radial-gradient(circle at 20% 20%, rgba(34,197,138,0.25), transparent 60%), radial-gradient(circle at 80% 30%, rgba(85,102,255,0.18), transparent 55%)",
      },
      boxShadow: {
        "lift": "0 8px 28px -8px rgba(15,15,18,.18), 0 2px 4px rgba(15,15,18,.04)",
        "lift-dark": "0 8px 28px -8px rgba(0,0,0,.6), 0 2px 4px rgba(0,0,0,.3)",
        "glow-brand": "0 0 0 1px rgba(34,197,138,.4), 0 12px 32px -8px rgba(34,197,138,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
