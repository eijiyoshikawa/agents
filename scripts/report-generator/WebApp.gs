/**
 * SNS分析レポート生成 Web App（Code.gs と同じプロジェクトに同居させる）
 * ------------------------------------------------------------
 * 役割: フォルダURLを貼って「生成」を押すだけのWebページを提供する。
 *       Apps Scriptエディタを開かずに、誰でもブラウザからレポート生成を実行できる。
 *
 * デプロイ手順（管理者が1回だけ・OPERATOR_GUIDE.md「1.5 Web App化」参照）:
 *   1) このファイルと WebAppUi.html を既存プロジェクトに追加
 *   2) デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *      - 実行ユーザー: 「アクセスしているユーザー」（推奨。各自のDrive権限で動く）
 *      - アクセスできるユーザー: 「Googleアカウントを持つ全員」
 *   3) 発行されたURLをチームに共有（各自、初回アクセス時に権限承認が必要）
 *
 * セキュリティ: 実行ユーザー=アクセスユーザーのため、対象フォルダ・テンプレの
 * Drive権限を持たない人は実行できない（権限がそのままアクセス制御になる）。
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('WebAppUi')
    .setTitle('SNS分析レポート生成')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * フォルダURL/IDを受け取り、事前チェック→生成→デッキURLを返す。
 * クライアント(WebAppUi.html)から google.script.run で呼ばれる。
 * 戻り値: { ok, deckUrl?, folderName?, mode?, error? }
 */
function webGenerate(input) {
  try {
    var folderId = extractFolderId_(input);
    if (!folderId) {
      return { ok: false, error: 'フォルダのURLまたはIDを読み取れませんでした。DriveのフォルダURL（…/folders/xxxx）を貼ってください。' };
    }
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
      folder.getName(); // アクセス権チェックを兼ねる
    } catch (e) {
      return { ok: false, error: 'フォルダを開けません。URLの間違いか、あなたのアカウントに閲覧権限がありません。フォルダの共有設定を確認してください。' };
    }
    if (!folder.getFilesByName(DATA_FILENAME).hasNext()) {
      return { ok: false, error: 'フォルダ「' + folder.getName() + '」に ' + DATA_FILENAME + ' がありません。先にClaudeで数値抽出（Step 2）を済ませてください。' };
    }
    var hasExistingDeck = folder.getFilesByType(MimeType.GOOGLE_SLIDES).hasNext();
    var deckUrl = generateReportForFolder(folderId);
    return {
      ok: true,
      deckUrl: deckUrl,
      folderName: folder.getName(),
      mode: hasExistingDeck ? 'フォルダ内の既存デッキを上書きしました（名前は保持）' : 'テンプレを複製して新規デッキを作成しました'
    };
  } catch (e) {
    return { ok: false, error: '生成中にエラーが発生しました: ' + (e && e.message ? e.message : e) };
  }
}

/** DriveフォルダのURL（/folders/<ID>、?id=<ID>）または素のIDからフォルダIDを抽出 */
function extractFolderId_(input) {
  var s = String(input || '').trim();
  if (!s) return '';
  var m = s.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return s; // 素のID
  return '';
}
