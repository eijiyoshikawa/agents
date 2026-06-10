import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1A1A1A", soft: "#3F3F3F", muted: "#6B6B6B" },
        cream: { DEFAULT: "#F4EFE6", soft: "#FAF7F1" },
        brand: { DEFAULT: "#0F5132", soft: "#147A4A" },
        surface: { DEFAULT: "#FFFFFF", alt: "#F7F4EE" },
        accent: { red: "#C0392B", amber: "#D4A24C", indigo: "#3D5A80", teal: "#2A9D8F" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Hiragino Sans"', '"Yu Gothic"', "Meiryo", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4,0,.2,1)",
        grow: "cubic-bezier(.2,.6,.2,1)",
      },
      keyframes: {
        growFromBottom: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { growFromBottom: "growFromBottom .3s cubic-bezier(.2,.6,.2,1) both" },
    },
  },
  plugins: [],
};
export default config;
