import type { NextConfig } from "next";

const config: NextConfig = {
  // puppeteer-core / @sparticuz/chromium はサーバー専用。バンドル対象から外す。
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default config;
