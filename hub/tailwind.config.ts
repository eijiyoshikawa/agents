import type { Config } from "tailwindcss";

// 社内デフォルト（/design-md/feer/DESIGN.md）の Tailwind トークンを踏襲。
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        cream: "#FFF9EF",
        brand: { DEFAULT: "#ef6c02", dark: "#c14e00" },
        surface: "#fcfbfa",
      },
      fontFamily: {
        sans: ["Work Sans", "-apple-system", "BlinkMacSystemFont", '"Hiragino Kaku Gothic ProN"', '"Yu Gothic"', "Meiryo", "sans-serif"],
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4,0,.2,1)",
        grow: "cubic-bezier(.2,.8,.2,1)",
      },
      keyframes: {
        growFromBottom: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        blink: { "50%": { opacity: "0" } },
      },
      animation: {
        "grow-from-bottom": "growFromBottom 300ms cubic-bezier(.4,0,.2,1) both",
        blink: "blink 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
