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
 * サーバーレスのChromiumには日本語フォントが無く、日本語が「豆腐」になって
 * 消えるため、起動前に日本語フォント(Noto Sans JP)を読み込ませる。
 * font() は実行ごとに一度だけ呼べばよい。
 */
const JP_FONT_URL =
  "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf";

let fontLoaded = false;
async function ensureJapaneseFont(): Promise<void> {
  if (fontLoaded) return;
  try {
    await chromium.font(JP_FONT_URL);
    fontLoaded = true;
  } catch {
    // フォント取得に失敗してもPDF生成自体は継続する
  }
}

/**
 * 環境に応じてヘッドレスChromeを起動する。
 * - 本番(Vercel等のserverless): @sparticuz/chromium のリモートパック+日本語フォント
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
  await ensureJapaneseFont();
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
    // 外部フォント(Noto Sans JP)の読み込み・適用完了を待つ
    await page.evaluateHandle("document.fonts.ready");
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
