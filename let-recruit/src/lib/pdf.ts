import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * サーバーレス用 Chromium バイナリのリモート取得先。
 * @sparticuz/chromium v140 はバイナリをパッケージに同梱せず、実行時に
 * このパックをダウンロードして /tmp に展開する方式が推奨されている。
 * （バンドルに bin/ が含まれず "bin does not exist" になる問題を回避）
 * ※ パッケージのバージョンと必ず一致させること。
 */
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v140.0.0/chromium-v140.0.0-pack.x64.tar";

/**
 * 環境に応じてヘッドレスChromeを起動する。
 * - 本番(Vercel等のserverless): @sparticuz/chromium のリモートパックを使用
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
  const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
  return puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

/** 自己完結HTMLからA4 PDF(Uint8Array)を生成する。 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
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
