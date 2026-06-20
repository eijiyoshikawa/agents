/** @type {import('next').NextConfig} */
// 動的レンダリング（Vercel / Node）。認証ゲートで個別ページを非公開化するため、
// 静的エクスポート（output: "export"）からは移行済み。
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
