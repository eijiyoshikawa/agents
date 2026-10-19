/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 認証・役割判定をサーバー側で行うため静的書き出しは使わない（Vercel サーバーランタイム）。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
