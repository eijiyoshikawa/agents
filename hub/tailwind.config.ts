import type { Config } from "tailwindcss";

// 紺色ベースのダークテーマ。masterAI /kpi・/ops（kpi.css）と同じトークンに揃え、
// ハブ → 各ダッシュボードの行き来で見た目が切り替わらないようにする。
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#081530",
        surface: { DEFAULT: "#0e1d40", 2: "#112350", 3: "#16295a" },
        ink: { DEFAULT: "#eef3ff", 2: "#aeb9d6", 3: "#7686aa" },
        line: { DEFAULT: "rgba(150,172,225,0.13)", 2: "rgba(150,172,225,0.24)" },
        brand: { DEFAULT: "#3b82f6", dark: "#2563eb", ink: "#86b4ff", soft: "rgba(59,130,246,0.18)" },
        good: { DEFAULT: "#22c55e", ink: "#4ade80", soft: "rgba(34,197,94,0.14)" },
        watch: { DEFAULT: "#fab219", ink: "#fbc54a", soft: "rgba(250,178,25,0.14)" },
        risk: { DEFAULT: "#ef5b5b", ink: "#f88b8b", soft: "rgba(239,91,91,0.15)" },
        // 旧トークン名の互換（cream = ページ背景）
        cream: "#081530",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', '"Yu Gothic UI"', '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.18)",
        lg: "0 12px 32px rgba(0,0,0,0.45)",
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
