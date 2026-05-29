import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * 環境に応じてヘッドレスChromeを起動する。
 * - 本番(Vercel等のserverless): @sparticuz/chromium のバンドル済みバイナリを使用
 * - ローカル: PUPPETEER_EXECUTABLE_PATH で指定したChrome/Chromiumを使用
 */
async function launchBrowser(): Promise<Browser> {
  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/** 自己完結HTMLからA4 PDF(Uint8Array)を生成する。 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
