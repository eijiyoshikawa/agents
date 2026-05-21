/**
 * ハローワーク求人インポート Admin API
 *
 * POST /api/admin/hellowork/import
 *
 * ハローワークインターネットサービスから求人を取得し、
 * データベースにインポートするバッチ処理を起動するエンドポイント。
 *
 * 認証: 環境変数 ADMIN_API_KEY による API キー認証（Bearer トークン）
 *
 * リクエストボディ:
 * ```json
 * {
 *   "prefecture": "13",       // 必須: 都道府県コード
 *   "category": "driver",     // 任意: 職種カテゴリ
 *   "keyword": "トラック",     // 任意: フリーワード
 *   "maxPages": 5,            // 任意: 最大取得ページ数（デフォルト: 10）
 *   "dryRun": false,          // 任意: ドライランモード（デフォルト: false）
 *   "closeOrphans": true      // 任意: HW 側で消えた求人を close する（デフォルト: true）
 * }
 * ```
 *
 * レスポンス:
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "created": 15,
 *     "updated": 42,
 *     "closed": 3,
 *     "errors": 0,
 *     "totalProcessed": 57,
 *     "durationMs": 12345
 *   }
 * }
 * ```
 *
 * @module admin-hellowork-import
 */

import { type NextRequest } from "next/server"
import { fetchAllPages } from "@/lib/crawler/hellowork"
import { importHelloworkJobs } from "@/lib/crawler/import-batch"

// ========================================
// 認証
// ========================================

/**
 * リクエストの Admin API キーを検証する。
 *
 * Authorization ヘッダーの Bearer トークンを環境変数 ADMIN_API_KEY と比較する。
 * ADMIN_API_KEY が未設定の場合はセキュリティ上全リクエストを拒否する。
 *
 * @param request - Next.js リクエストオブジェクト
 * @returns 認証成功なら true
 */
function authenticateAdmin(request: NextRequest): boolean {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) {
    console.error(
      "[admin/hellowork/import] ADMIN_API_KEY が設定されていません。" +
        "環境変数に ADMIN_API_KEY を設定してください。"
    )
    return false
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader) return false

  const [scheme, token] = authHeader.split(" ")
  if (scheme?.toLowerCase() !== "bearer") return false

  // タイミング攻撃対策: 定数時間比較
  // Node.js の crypto.timingSafeEqual を使うのが理想だが、
  // Edge Runtime では利用できない場合があるため単純比較とする
  return token === apiKey
}

// ========================================
// リクエストバリデーション
// ========================================

/** POST リクエストボディのスキーマ */
interface ImportRequestBody {
  prefecture: string
  category?: string
  keyword?: string
  maxPages?: number
  dryRun?: boolean
  closeOrphans?: boolean
}

/**
 * リクエストボディをバリデーションする。
 *
 * @param body - パース済みリクエストボディ
 * @returns バリデーション結果。エラーがあれば message を含むオブジェクト
 */
function validateRequestBody(
  body: unknown
): { valid: true; data: ImportRequestBody } | { valid: false; message: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "リクエストボディが空です" }
  }

  const b = body as Record<string, unknown>

  // prefecture は必須
  if (typeof b.prefecture !== "string" || !b.prefecture.trim()) {
    return {
      valid: false,
      message: "prefecture（都道府県コード）は必須です。例: \"13\"（東京都）",
    }
  }

  // prefecture コードが 01-47 の範囲内か
  const prefCode = parseInt(b.prefecture, 10)
  if (isNaN(prefCode) || prefCode < 1 || prefCode > 47) {
    return {
      valid: false,
      message:
        "prefecture は 01〜47 の都道府県コードを指定してください",
    }
  }

  // maxPages の上限チェック
  if (b.maxPages !== undefined) {
    if (typeof b.maxPages !== "number" || b.maxPages < 1 || b.maxPages > 50) {
      return {
        valid: false,
        message: "maxPages は 1〜50 の範囲で指定してください",
      }
    }
  }

  return {
    valid: true,
    data: {
      prefecture: b.prefecture as string,
      category: typeof b.category === "string" ? b.category : undefined,
      keyword: typeof b.keyword === "string" ? b.keyword : undefined,
      maxPages: typeof b.maxPages === "number" ? b.maxPages : undefined,
      dryRun: typeof b.dryRun === "boolean" ? b.dryRun : false,
      closeOrphans:
        typeof b.closeOrphans === "boolean" ? b.closeOrphans : true,
    },
  }
}

// ========================================
// API ハンドラー
// ========================================

/**
 * POST /api/admin/hellowork/import
 *
 * ハローワーク求人のインポートバッチを実行する。
 *
 * 認証済みの管理者のみ実行可能。
 * 処理完了後、インポート統計を JSON で返す。
 */
export async function POST(request: NextRequest) {
  // -------------------------------------------------------
  // 認証チェック
  // -------------------------------------------------------
  if (!authenticateAdmin(request)) {
    return Response.json(
      {
        success: false,
        error: "認証に失敗しました。有効な API キーを Authorization ヘッダーに設定してください。",
      },
      { status: 401 }
    )
  }

  // -------------------------------------------------------
  // リクエストボディのパース・バリデーション
  // -------------------------------------------------------
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { success: false, error: "不正な JSON フォーマットです" },
      { status: 400 }
    )
  }

  const validation = validateRequestBody(body)
  if (!validation.valid) {
    return Response.json(
      { success: false, error: validation.message },
      { status: 400 }
    )
  }

  const { prefecture, category, keyword, maxPages, dryRun, closeOrphans } =
    validation.data

  // -------------------------------------------------------
  // インポートバッチ実行
  // -------------------------------------------------------
  try {
    console.log(
      `[admin/hellowork/import] バッチ開始: prefecture=${prefecture}, category=${category ?? "all"}, dryRun=${dryRun}`
    )

    // Step 1: ハローワークから求人を取得
    const crawlResult = await fetchAllPages(
      { prefecture, category, keyword },
      maxPages ?? 10
    )

    console.log(
      `[admin/hellowork/import] クロール完了: ${crawlResult.jobs.length} 件取得`
    )

    // Step 2: データベースにインポート
    const stats = await importHelloworkJobs(crawlResult.jobs, {
      dryRun,
      closeOrphans,
    })

    // -------------------------------------------------------
    // レスポンス
    // -------------------------------------------------------
    return Response.json({
      success: true,
      stats: {
        created: stats.created,
        updated: stats.updated,
        closed: stats.closed,
        errors: stats.errors,
        totalProcessed: stats.totalProcessed,
        durationMs: stats.durationMs,
        startedAt: stats.startedAt.toISOString(),
        finishedAt: stats.finishedAt.toISOString(),
      },
      crawl: {
        totalFound: crawlResult.totalCount,
        pagesProcessed: crawlResult.currentPage,
        totalPages: crawlResult.totalPages,
      },
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました"

    console.error(`[admin/hellowork/import] バッチエラー: ${message}`)

    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
