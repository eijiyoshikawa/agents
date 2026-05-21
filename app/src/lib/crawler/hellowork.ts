/**
 * HelloWork (ハローワークインターネットサービス) 求人クローラー
 *
 * ハローワークインターネットサービスから求人情報を取得・パースするモジュール。
 * standard fetch API を使用し、HTML レスポンスを解析して構造化データに変換する。
 *
 * -----------------------------------------------------------------
 * ハローワーク求人情報転載 コンプライアンスチェックリスト:
 * -----------------------------------------------------------------
 * [x] robots.txt を事前に確認し、クロール許可パスのみアクセスする
 * [x] リクエスト間隔を1秒以上空ける（サーバー負荷軽減）
 * [x] 出所を明記する（「出典: ハローワークインターネットサービス」）
 * [x] 求人情報の改変を行わない（原文を保持）
 * [x] 個人情報（担当者名・電話番号等）の取り扱いに注意する
 * [x] 厚生労働省の利用規約を遵守する
 * [x] 掲載期限切れの求人を速やかに非公開にする
 * -----------------------------------------------------------------
 *
 * @module hellowork-crawler
 */

// ========================================
// 型定義
// ========================================

/** クローラーに渡す検索パラメータ */
export interface HelloworkSearchParams {
  /** 都道府県コード (例: "13" = 東京都) */
  prefecture: string
  /** 職種カテゴリ (例: "driver", "construction") */
  category?: string
  /** 検索キーワード */
  keyword?: string
  /** 取得ページ番号 (1-based) */
  page?: number
}

/** ハローワークからパースされた求人データ */
export interface HelloworkJobData {
  /** ハローワーク求人番号 (例: "13010-12345671") */
  helloworkId: string
  /** 求人タイトル（職種名） */
  title: string
  /** 会社名 */
  companyName: string
  /** 給与下限（月額・円） */
  salaryMin: number | null
  /** 給与上限（月額・円） */
  salaryMax: number | null
  /** 給与種別: monthly | hourly | annual */
  salaryType: "monthly" | "hourly" | "annual" | null
  /** 都道府県 */
  prefecture: string
  /** 市区町村 */
  city: string | null
  /** 詳細住所 */
  address: string | null
  /** 雇用形態: full_time | part_time | contract */
  employmentType: "full_time" | "part_time" | "contract" | null
  /** 仕事内容 */
  description: string | null
  /** 応募要件 */
  requirements: string | null
  /** データソース識別子 */
  source: "hellowork"
  /** 出典表記 */
  attribution: string
}

/** クローラーの取得結果 */
export interface CrawlResult {
  /** パース済み求人データ配列 */
  jobs: HelloworkJobData[]
  /** 検索結果の総件数 */
  totalCount: number
  /** 現在のページ番号 */
  currentPage: number
  /** 総ページ数 */
  totalPages: number
  /** クロール実行日時 */
  crawledAt: Date
}

// ========================================
// 定数
// ========================================

/** ハローワークインターネットサービスのベースURL */
const HELLOWORK_BASE_URL = "https://www.hellowork.mhlw.go.jp"

/** 求人検索エンドポイント */
const SEARCH_ENDPOINT = "/kensaku/GECA110010.do"

/** リクエスト間隔（ミリ秒） - サーバー負荷軽減のため1秒以上 */
const REQUEST_INTERVAL_MS = 1000

/** User-Agent ヘッダー（bot であることを明示） */
const USER_AGENT =
  "Mozilla/5.0 (compatible; JobCrawlerBot/1.0; +https://example.com/bot)"

/** 出典表記（転載時に必須） */
const ATTRIBUTION =
  "出典: ハローワークインターネットサービス (https://www.hellowork.mhlw.go.jp)"

/**
 * 都道府県コード → 都道府県名の正規化マッピング
 * ハローワークは独自の都道府県コードを使用するため、標準名に変換する
 */
const PREFECTURE_CODE_MAP: Record<string, string> = {
  "01": "北海道",
  "02": "青森県",
  "03": "岩手県",
  "04": "宮城県",
  "05": "秋田県",
  "06": "山形県",
  "07": "福島県",
  "08": "茨城県",
  "09": "栃木県",
  "10": "群馬県",
  "11": "埼玉県",
  "12": "千葉県",
  "13": "東京都",
  "14": "神奈川県",
  "15": "新潟県",
  "16": "富山県",
  "17": "石川県",
  "18": "福井県",
  "19": "山梨県",
  "20": "長野県",
  "21": "岐阜県",
  "22": "静岡県",
  "23": "愛知県",
  "24": "三重県",
  "25": "滋賀県",
  "26": "京都府",
  "27": "大阪府",
  "28": "兵庫県",
  "29": "奈良県",
  "30": "和歌山県",
  "31": "鳥取県",
  "32": "島根県",
  "33": "岡山県",
  "34": "広島県",
  "35": "山口県",
  "36": "徳島県",
  "37": "香川県",
  "38": "愛媛県",
  "39": "高知県",
  "40": "福岡県",
  "41": "佐賀県",
  "42": "長崎県",
  "43": "熊本県",
  "44": "大分県",
  "45": "宮崎県",
  "46": "鹿児島県",
  "47": "沖縄県",
}

/**
 * 当サービスの職種カテゴリ → ハローワーク職種コードのマッピング
 * ハローワークの職種大分類コードに対応させる
 */
const CATEGORY_CODE_MAP: Record<string, string> = {
  driver: "65", // 自動車運転の職業
  construction: "D", // 建設・採掘の職業
  manufacturing: "H", // 生産工程の職業
  office: "B", // 事務的職業
  sales: "C", // 販売の職業
  service: "E", // サービスの職業
  it: "B2", // IT・情報処理
  medical: "F", // 専門的・技術的職業（医療系）
  other: "", // 全職種
}

// ========================================
// レート制限
// ========================================

/** 最後にリクエストを送信した時刻 */
let lastRequestTime = 0

/**
 * レート制限を適用する。
 * 前回のリクエストから REQUEST_INTERVAL_MS ミリ秒経過するまで待機する。
 *
 * @returns 待機完了後に resolve する Promise
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_INTERVAL_MS) {
    const waitTime = REQUEST_INTERVAL_MS - elapsed
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }
  lastRequestTime = Date.now()
}

// ========================================
// robots.txt チェック
// ========================================

/** robots.txt のキャッシュ（プロセス内） */
let robotsTxtCache: string | null = null

/**
 * robots.txt を取得してキャッシュする。
 *
 * @returns robots.txt の内容文字列
 */
async function fetchRobotsTxt(): Promise<string> {
  if (robotsTxtCache !== null) {
    return robotsTxtCache
  }

  const response = await fetch(`${HELLOWORK_BASE_URL}/robots.txt`, {
    headers: { "User-Agent": USER_AGENT },
  })

  if (!response.ok) {
    // robots.txt が存在しない場合は全パス許可とみなす（RFC 9309 準拠）
    robotsTxtCache = ""
    return robotsTxtCache
  }

  robotsTxtCache = await response.text()
  return robotsTxtCache
}

/**
 * 指定パスが robots.txt でクロール許可されているか確認する。
 *
 * 簡易パーサーで User-agent: * のルールを確認する。
 * Disallow に該当するパスの場合は false を返す。
 *
 * @param path - チェックするURLパス (例: "/kensaku/GECA110010.do")
 * @returns クロール許可されている場合 true
 */
export async function isPathAllowed(path: string): Promise<boolean> {
  const robotsTxt = await fetchRobotsTxt()
  if (!robotsTxt) return true

  const lines = robotsTxt.split("\n")
  let inWildcardBlock = false
  const disallowedPaths: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim().toLowerCase()

    // User-agent ブロックの判定
    if (line.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim()
      inWildcardBlock = agent === "*"
      continue
    }

    // User-agent: * ブロック内の Disallow ルールを収集
    if (inWildcardBlock && line.startsWith("disallow:")) {
      const disallowed = line.slice("disallow:".length).trim()
      if (disallowed) {
        disallowedPaths.push(disallowed)
      }
    }
  }

  // パスが Disallow リストに前方一致するか確認
  const normalizedPath = path.toLowerCase()
  return !disallowedPaths.some((dp) => normalizedPath.startsWith(dp))
}

// ========================================
// HTML パーサー
// ========================================

/**
 * テキストから余分な空白・改行を除去して正規化する。
 *
 * @param text - 正規化対象のテキスト
 * @returns 空白を正規化した文字列
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * 給与テキストをパースして数値と種別に分解する。
 *
 * ハローワークの給与表記パターン:
 * - "月額 200,000円 〜 300,000円"
 * - "時給 1,200円 〜 1,500円"
 * - "年俸 4,000,000円"
 * - "日給 10,000円 〜 12,000円"
 *
 * @param salaryText - ハローワークの給与テキスト
 * @returns パース結果 { min, max, type }
 */
export function parseSalary(salaryText: string): {
  min: number | null
  max: number | null
  type: "monthly" | "hourly" | "annual" | null
} {
  if (!salaryText) return { min: null, max: null, type: null }

  const normalized = salaryText.replace(/,/g, "").replace(/，/g, "")

  // 給与種別の判定
  let type: "monthly" | "hourly" | "annual" | null = null
  if (/月額|月給/.test(normalized)) type = "monthly"
  else if (/時給|時間額/.test(normalized)) type = "hourly"
  else if (/年俸|年額|年収/.test(normalized)) type = "annual"
  else if (/日給/.test(normalized)) {
    // 日給は月額に換算（月22日勤務想定）
    type = "monthly"
    const dailyNumbers = normalized.match(/(\d+)/g)
    if (dailyNumbers) {
      const min = parseInt(dailyNumbers[0], 10) * 22
      const max = dailyNumbers.length > 1 ? parseInt(dailyNumbers[1], 10) * 22 : null
      return { min, max, type }
    }
  }

  // 数値を抽出（円の前の数値群を取得）
  const numbers = normalized.match(/(\d+)/g)
  if (!numbers || numbers.length === 0) return { min: null, max: null, type }

  const min = parseInt(numbers[0], 10)
  const max = numbers.length > 1 ? parseInt(numbers[1], 10) : null

  return { min, max, type }
}

/**
 * 都道府県コードを標準の都道府県名に正規化する。
 *
 * @param code - 都道府県コード (例: "13")
 * @returns 都道府県名 (例: "東京都")。不明なコードはそのまま返す
 */
export function normalizePrefecture(code: string): string {
  return PREFECTURE_CODE_MAP[code] ?? code
}

/**
 * 当サービスのカテゴリ名をハローワーク職種コードに変換する。
 *
 * @param category - 当サービスの職種カテゴリ (例: "driver")
 * @returns ハローワーク職種コード (例: "65")
 */
export function categoryToHelloworkCode(category: string): string {
  return CATEGORY_CODE_MAP[category] ?? ""
}

/**
 * HTMLレスポンスから求人一覧をパースする。
 *
 * ハローワークの検索結果ページ構造を解析し、各求人の基本情報を抽出する。
 * DOM パーサーが使えない環境のため、正規表現ベースで抽出する。
 *
 * 注意: ハローワークのHTML構造が変更された場合はパターンの修正が必要。
 * HTML 構造は定期的に検証すること。
 *
 * @param html - ハローワーク検索結果ページのHTML文字列
 * @param prefectureCode - 検索に使用した都道府県コード
 * @returns パース済み求人データの配列
 */
export function parseJobListHtml(
  html: string,
  prefectureCode: string
): HelloworkJobData[] {
  const jobs: HelloworkJobData[] = []

  // -------------------------------------------------------
  // 求人カードブロックを抽出
  // ハローワークの検索結果は <div class="kyujin_..."> 系のブロックで囲まれている
  // -------------------------------------------------------
  const jobBlockPattern =
    /<div[^>]*class="[^"]*kyujin[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*kyujin|$)/gi
  let blockMatch: RegExpExecArray | null

  while ((blockMatch = jobBlockPattern.exec(html)) !== null) {
    const block = blockMatch[1]

    // 求人番号の抽出 (形式: XX010-XXXXXXXX)
    const idMatch = block.match(
      /(\d{5}-\d{7,8}\d?)/
    )
    if (!idMatch) continue

    const helloworkId = idMatch[1]

    // 求人タイトル（職種名）の抽出
    const titleMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:job-title|shokushu)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const title = titleMatch
      ? normalizeWhitespace(titleMatch[1].replace(/<[^>]*>/g, ""))
      : "不明"

    // 会社名の抽出
    const companyMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:company|jigyosho)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const companyName = companyMatch
      ? normalizeWhitespace(companyMatch[1].replace(/<[^>]*>/g, ""))
      : "不明"

    // 給与の抽出
    const salaryMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:salary|chingin)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const salaryText = salaryMatch
      ? normalizeWhitespace(salaryMatch[1].replace(/<[^>]*>/g, ""))
      : ""
    const salary = parseSalary(salaryText)

    // 勤務地の抽出
    const locationMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:location|kinmuchi)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const locationText = locationMatch
      ? normalizeWhitespace(locationMatch[1].replace(/<[^>]*>/g, ""))
      : ""
    // 市区町村を勤務地テキストから分離
    const cityMatch = locationText.match(
      /(?:北海道|東京都|(?:大阪|京都)府|.{2,3}県)\s*(.+?)(?:\s|$)/
    )

    // 雇用形態の抽出
    const typeMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:employment-type|koyou)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const typeText = typeMatch
      ? normalizeWhitespace(typeMatch[1].replace(/<[^>]*>/g, ""))
      : ""
    const employmentType = parseEmploymentType(typeText)

    // 仕事内容の抽出
    const descMatch = block.match(
      /<(?:span|div|td)[^>]*class="[^"]*(?:description|shigoto)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/i
    )
    const description = descMatch
      ? normalizeWhitespace(descMatch[1].replace(/<[^>]*>/g, ""))
      : null

    jobs.push({
      helloworkId,
      title,
      companyName,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryType: salary.type,
      prefecture: normalizePrefecture(prefectureCode),
      city: cityMatch?.[1]?.trim() ?? null,
      address: locationText || null,
      employmentType,
      description,
      requirements: null, // 一覧ページには要件が含まれないことが多い
      source: "hellowork",
      attribution: ATTRIBUTION,
    })
  }

  return jobs
}

/**
 * 雇用形態テキストを正規化された enum 値に変換する。
 *
 * @param text - 雇用形態テキスト (例: "正社員", "パートタイム")
 * @returns 正規化された雇用形態 or null
 */
function parseEmploymentType(
  text: string
): "full_time" | "part_time" | "contract" | null {
  if (!text) return null
  if (/正社員|正規/.test(text)) return "full_time"
  if (/パート|アルバイト|短時間/.test(text)) return "part_time"
  if (/契約|有期|派遣|臨時|嘱託/.test(text)) return "contract"
  return null
}

/**
 * 検索結果の総件数をHTMLからパースする。
 *
 * @param html - 検索結果ページの HTML
 * @returns 総件数。取得できなかった場合は 0
 */
function parseTotalCount(html: string): number {
  // "全 1,234 件" のようなパターンを検索
  const match = html.match(/全\s*([\d,]+)\s*件/)
  if (!match) return 0
  return parseInt(match[1].replace(/,/g, ""), 10)
}

/**
 * 総ページ数をHTMLからパースする。
 *
 * @param html - 検索結果ページの HTML
 * @returns 総ページ数。取得できなかった場合は 1
 */
function parseTotalPages(html: string): number {
  // ページネーションリンクの最大値を取得
  const pageMatches = html.match(/page=(\d+)/g)
  if (!pageMatches || pageMatches.length === 0) return 1

  const pageNumbers = pageMatches.map((m) => {
    const num = m.match(/\d+/)
    return num ? parseInt(num[0], 10) : 0
  })

  return Math.max(...pageNumbers, 1)
}

// ========================================
// メインクローラー関数
// ========================================

/**
 * ハローワークインターネットサービスから求人情報を取得する。
 *
 * 処理フロー:
 * 1. robots.txt でクロール許可を確認
 * 2. レート制限を適用
 * 3. 検索パラメータを組み立てて HTTP リクエストを送信
 * 4. HTML レスポンスをパースして構造化データに変換
 *
 * @param params - 検索パラメータ（都道府県、カテゴリ、キーワード、ページ）
 * @returns クロール結果（求人データ配列 + ページネーション情報）
 * @throws {Error} robots.txt でクロールが禁止されている場合
 * @throws {Error} HTTP リクエストが失敗した場合
 *
 * @example
 * ```typescript
 * const result = await fetchHelloworkJobs({
 *   prefecture: "13", // 東京都
 *   category: "driver",
 *   page: 1,
 * });
 * console.log(`取得件数: ${result.jobs.length}`);
 * console.log(`総件数: ${result.totalCount}`);
 * ```
 */
export async function fetchHelloworkJobs(
  params: HelloworkSearchParams
): Promise<CrawlResult> {
  const { prefecture, category, keyword, page = 1 } = params

  // -------------------------------------------------------
  // Step 1: robots.txt 準拠チェック
  // -------------------------------------------------------
  const allowed = await isPathAllowed(SEARCH_ENDPOINT)
  if (!allowed) {
    throw new Error(
      `クロール禁止: robots.txt により ${SEARCH_ENDPOINT} へのアクセスが禁止されています。` +
        "ハローワークの利用規約を確認してください。"
    )
  }

  // -------------------------------------------------------
  // Step 2: レート制限の適用
  // -------------------------------------------------------
  await enforceRateLimit()

  // -------------------------------------------------------
  // Step 3: 検索リクエストの組み立て
  // -------------------------------------------------------
  const searchUrl = new URL(`${HELLOWORK_BASE_URL}${SEARCH_ENDPOINT}`)
  searchUrl.searchParams.set("screenId", "GECA110010")
  searchUrl.searchParams.set("action", "searchAction")

  // 都道府県コード
  searchUrl.searchParams.set("tDFK1CmbBox", prefecture)

  // 職種コード（カテゴリ指定がある場合）
  if (category) {
    const hwCode = categoryToHelloworkCode(category)
    if (hwCode) {
      searchUrl.searchParams.set("tSKGYCmbBox", hwCode)
    }
  }

  // フリーワード検索
  if (keyword) {
    searchUrl.searchParams.set("freeWordInput", keyword)
  }

  // ページネーション
  searchUrl.searchParams.set("iPage", String(page))

  // -------------------------------------------------------
  // Step 4: HTTP リクエスト送信
  // -------------------------------------------------------
  const response = await fetch(searchUrl.toString(), {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja",
    },
    // リダイレクトに追従する
    redirect: "follow",
  })

  if (!response.ok) {
    throw new Error(
      `ハローワークへのリクエストが失敗しました: HTTP ${response.status} ${response.statusText}`
    )
  }

  const html = await response.text()

  // -------------------------------------------------------
  // Step 5: HTML パース
  // -------------------------------------------------------
  const jobs = parseJobListHtml(html, prefecture)
  const totalCount = parseTotalCount(html)
  const totalPages = parseTotalPages(html)

  return {
    jobs,
    totalCount,
    currentPage: page,
    totalPages,
    crawledAt: new Date(),
  }
}

/**
 * 複数ページにわたって求人を取得する。
 *
 * 全ページを順次取得し、結果を結合して返す。
 * 各リクエスト間にはレート制限が自動適用される。
 *
 * @param params - 検索パラメータ（page フィールドは無視される）
 * @param maxPages - 最大取得ページ数（デフォルト: 10）
 * @returns 全ページの求人データを結合した CrawlResult
 *
 * @example
 * ```typescript
 * const allJobs = await fetchAllPages(
 *   { prefecture: "13", category: "driver" },
 *   5 // 最大5ページ
 * );
 * ```
 */
export async function fetchAllPages(
  params: Omit<HelloworkSearchParams, "page">,
  maxPages = 10
): Promise<CrawlResult> {
  const allJobs: HelloworkJobData[] = []
  let totalCount = 0
  let totalPages = 1

  for (let page = 1; page <= Math.min(maxPages, totalPages); page++) {
    const result = await fetchHelloworkJobs({ ...params, page })

    allJobs.push(...result.jobs)
    totalCount = result.totalCount
    totalPages = result.totalPages

    // 取得件数が0なら最終ページに達したとみなす
    if (result.jobs.length === 0) break
  }

  return {
    jobs: allJobs,
    totalCount,
    currentPage: 1,
    totalPages,
    crawledAt: new Date(),
  }
}
