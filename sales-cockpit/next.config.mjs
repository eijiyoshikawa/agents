/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Notion API をサーバー側でライブ取得するため静的書き出し(output:export)は使わない。
  // Vercel のサーバーランタイムで動作する。
};
export default nextConfig;
