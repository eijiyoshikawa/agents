import type { Config } from "tailwindcss";

// 紺色（ネイビー）グラデーション基調のダークテーマ。
// 既存コンポーネントの配色トークン（ink=文字, cream/surface=背景）を再定義して全体を反転。
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 文字色（ダーク背景前提で明色）
        ink: { DEFAULT: "#EAF1FB", soft: "#C7D4E8", muted: "#8FA1BE" },
        // ベース背景（ネイビー）
        cream: { DEFAULT: "#0B1A36", soft: "#091630" },
        // パネル/カード
        surface: { DEFAULT: "#0E1F40", alt: "#13284D" },
        // アクセント（ネイビーに映えるブルー〜シアン）
        brand: { DEFAULT: "#3B82F6", soft: "#2563EB", glow: "#7DD3FC" },
        accent: {
          red: "#F87171",
          amber: "#FBBF24",
          indigo: "#818CF8",
          teal: "#2DD4BF",
          violet: "#A78BFA",
          pink: "#F472B6",
        },
        night: { 0: "#070E1F", 1: "#0B1A36", 2: "#102448", 3: "#173058", 4: "#21406E", 5: "#2D5288" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Inter"', '"Hiragino Sans"', '"Yu Gothic"', "Meiryo", "system-ui", "sans-serif"],
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
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.15)" },
        },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        growFromBottom: "growFromBottom .4s cubic-bezier(.2,.6,.2,1) both",
        fadeIn: "fadeIn .4s ease both",
        pulseDot: "pulseDot 2s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
      boxShadow: {
        lift: "0 10px 30px -10px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
