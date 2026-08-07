/**
 * レポート自動生成ウォッチャー（時間トリガー用）
 * ------------------------------------------------------------
 * WATCH_ROOT_IDS 配下を定期巡回し、report_data.json があって未生成
 * （マーカー .report_generated が無い）フォルダを自動でレンダリングする。
 * これにより「フォルダに report_data.json を置くだけ」でデッキが生成される。
 *
 * 依存: Code.gs（generateReportForFolder / DATA_FILENAME を利用）。同一プロジェクトに同居させる。
 *
 * 初回セットアップ:
 *   1. WATCH_ROOT_IDS に、巡回したい親フォルダID（クライアント群の親など）を設定
 *   2. installWatcher() を一度実行（5分毎トリガーを作成）
 *
 * 再生成したいとき: 対象フォルダ内の .report_generated を削除すれば次回巡回で再生成。
 */

var WATCH_ROOT_IDS = [
  // 例: 'クライアント群の親フォルダID'  ← ここに設定
];
var MARKER = '.report_generated';
var WATCH_MAX_DEPTH = 4;

/** 5分毎の時間トリガーを作成（既存があれば張り替え） */
function installWatcher() {
  removeWatcher();
  ScriptApp.newTrigger('scanAndGenerate_').timeBased().everyMinutes(5).create();
  Logger.log('ウォッチャーを設定しました（5分毎）。対象ルート: ' + WATCH_ROOT_IDS.join(', '));
}

/** ウォッチャーのトリガーを削除 */
function removeWatcher() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'scanAndGenerate_') ScriptApp.deleteTrigger(t);
  });
}

/** トリガー本体: 各ルートを巡回 */
function scanAndGenerate_() {
  WATCH_ROOT_IDS.forEach(function (id) {
    try { walk_(DriveApp.getFolderById(id), 0); }
    catch (e) { Logger.log('巡回エラー root=' + id + ': ' + e); }
  });
}

/** フォルダを再帰的に巡回し、未生成フォルダを生成 */
function walk_(folder, depth) {
  if (depth > WATCH_MAX_DEPTH) return;
  var hasData = folder.getFilesByName(DATA_FILENAME).hasNext();
  var done = folder.getFilesByName(MARKER).hasNext();
  if (hasData && !done) {
    try {
      var url = generateReportForFolder(folder.getId());
      folder.createFile(MARKER, '生成完了 ' + new Date().toISOString() + '\n' + url, 'text/plain');
      Logger.log('生成: ' + folder.getName() + ' -> ' + url);
    } catch (e) {
      Logger.log('生成エラー ' + folder.getName() + ': ' + e);
    }
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) walk_(subs.next(), depth + 1);
}

/** 手動テスト用: 1回だけ巡回する */
function scanOnce() { scanAndGenerate_(); }
