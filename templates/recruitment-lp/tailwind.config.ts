import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // 建設業界向けカラーパレット
        steel: {
          50: "#F5F6F7",
          100: "#E5E7EB",
          200: "#CBD0D7",
          800: "#1F2937",
          900: "#111827",
        },
        safety: {
          // セーフティオレンジ（建設現場の標準的アクセント色）
          500: "#EA580C",
          600: "#C2410C",
        },
        construction: {
          // コンストラクションイエロー（重機・標識色）
          400: "#FBBF24",
          500: "#F59E0B",
        },
        navy: {
          // 老舗ゼネコン向けの深いネイビー
          800: "#142850",
          900: "#0C1E3D",
          950: "#070F25",
        },
        brass: {
          // 真鍮（重厚感・歴史を感じさせるアクセント）
          400: "#C19A6B",
          500: "#B8945F",
          600: "#9A7B4F",
        },
        cream: {
          50: "#FBF7EE",
          100: "#F5EFE0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
