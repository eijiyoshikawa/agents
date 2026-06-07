/**
 * SNS分析レポート 自動生成レンダラ (Google Apps Script)
 * ------------------------------------------------------------
 * 役割: 月次『提出分』フォルダ内の report_data.json を読み込み、
 *       テンプレ『【テンプレ】分析レポート』を複製して数値・表・画像を流し込む。
 *
 * 責務分担:
 *   - 数値抽出(画像→JSON) ... Claude(MCP)が実施し report_data.json を同フォルダへ出力
 *   - 描画(複製/差し込み)  ... 本スクリプト
 *   - 一覧管理(Notion)     ... 後段(別途連携)
 *
 * 前提(ワンタイム設定):
 *   1. テンプレを複製し『{{TOKEN}}』形式のプレースホルダを埋め込んだ
 *      「マスターテンプレ」を用意し、その ID を TEMPLATE_ID に設定する。
 *      (元テンプレは "0,000"/"テキスト" が重複し replaceAllText が誤爆するため)
 *      トークン一覧は本ファイル末尾の TOKEN_MAP コメントを参照。
 *   2. スクリプトに Drive / Slides の権限を付与(初回実行時に承認)。
 *
 * 使い方:
 *   - スプレッドシート/スライドにバインドした場合: メニュー「レポート生成」から実行
 *   - 単体実行: generateReportForFolder('<提出分フォルダID>') を直接実行
 */

// ===== 設定 =====
var TEMPLATE_ID = 'PUT_TOKENIZED_MASTER_TEMPLATE_ID_HERE'; // {{TOKEN}}化したマスターのID
var DATA_FILENAME = 'report_data.json';                    // 同フォルダ内のデータファイル名

/**
 * 指定フォルダに対しレポートを1本生成する。
 * @param {string} folderId 月次『提出分』フォルダのID
 * @return {string} 生成したプレゼンテーションのURL
 */
function generateReportForFolder(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var data = readReportData_(folder);
  var deck = duplicateTemplate_(folder, data);

  fillTextTokens_(deck, data);
  fillPostAnalysisTable_(deck, data);    // slide8: 投稿分析(月次)
  fillPopularPostsTable_(deck, data);    // slide9: 伸びた投稿
  insertDashboardImages_(deck, data);    // slide6: グラフ画像
  insertHighlightedPostImages_(deck, data); // slide10-12: よかった投稿画像

  deck.saveAndClose();
  var url = 'https://docs.google.com/presentation/d/' + deck.getId() + '/edit';
  Logger.log('生成完了: ' + url);
  return url;
}

/** 同フォルダ内の report_data.json を読み込んでオブジェクト化 */
function readReportData_(folder) {
  var it = folder.getFilesByName(DATA_FILENAME);
  if (!it.hasNext()) {
    throw new Error(DATA_FILENAME + ' がフォルダ内に見つかりません: ' + folder.getName());
  }
  return JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
}

/** マスターテンプレを複製し、命名してフォルダへ配置 */
function duplicateTemplate_(folder, data) {
  var m = data.meta || {};
  var name = [m.client_name, m.report_ym, '分析レポート'].filter(String).join('_');
  var copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy(name, folder);
  return SlidesApp.openById(copy.getId());
}

/** {{TOKEN}} を実値へ一括置換 */
function fillTextTokens_(deck, data) {
  var map = buildTokenMap_(data);
  Object.keys(map).forEach(function (token) {
    var value = map[token] == null ? '' : String(map[token]);
    deck.replaceAllText('{{' + token + '}}', value);
  });
}

/** report_data → トークン辞書。値が無いものは空文字に */
function buildTokenMap_(data) {
  var m = data.meta || {};
  var s = data.summary || {};
  var a = data.account_analytics || {};
  var n = data.next_actions || {};
  var h = data.highlighted_posts || [];
  var map = {
    CLIENT_NAME: m.client_name, ACCOUNT_NAME: m.account_name, ACCOUNT_HANDLE: m.account_handle,
    REPORT_YM: m.report_ym, OPERATION_PERIOD: m.operation_period, OPERATION_PURPOSE: m.operation_purpose,
    DATA_FETCH_DATE: m.data_fetch_date, CREATED_BY: m.created_by, CREATED_DATE: m.created_date,
    SUMMARY_TEXT: s.summary_text, RESULT_TEXT: s.result_text,
    FOLLOWERS_START: a.followers_start, FOLLOWERS_CURRENT: a.followers_current, FOLLOWER_CHANGE_PCT: a.follower_change_pct,
    LIKES: a.likes, LIKES_PCT: a.likes_change_pct, COMMENTS: a.comments, COMMENTS_PCT: a.comments_change_pct,
    SHARES: a.shares, SHARES_PCT: a.shares_change_pct, POST_COUNT: a.post_count_total, POST_FREQ: a.post_frequency_monthly,
    VIDEO_VIEWS: a.video_views, VIDEO_VIEWS_PCT: a.video_views_change_pct, PF_ACCESS: a.pf_access, PF_ACCESS_PCT: a.pf_access_change_pct,
    REACH: a.reach, REACH_PCT: a.reach_change_pct,
    REFLECTION: n.reflection, CURRENT_ISSUE: n.current_issue, ACTION_PLAN: n.action_plan,
    FUTURE_MEASURE_1: n.future_measure_1, FUTURE_MEASURE_2: n.future_measure_2
  };
  for (var i = 0; i < 3; i++) {
    var p = h[i] || {};
    map['POST_DATE_' + (i + 1)] = p.post_date;
    map['POST_THEME_' + (i + 1)] = p.theme;
    map['POST_EVAL_' + (i + 1)] = p.eval_point;
    map['POST_COMMENT_' + (i + 1)] = p.comment_pickup;
  }
  return map;
}

/** slide8 の月次テーブルを埋める(プレースホルダ表 {{TBL_POST_ANALYSIS}} を含むスライドを起点) */
function fillPostAnalysisTable_(deck, data) {
  var rows = data.post_analysis_monthly || [];
  if (!rows.length) return;
  var header = ['', '投稿', '平均IMP', '平均リーチ', '平均いいね', '平均保存', '平均秒数', '平均再生秒', '平均維持率'];
  var matrix = rows.map(function (r) {
    return [r.month, r.posts, r.avg_impressions, r.avg_reach, r.avg_likes, r.avg_saves, r.avg_seconds, r.avg_play_seconds, r.avg_retention];
  });
  replaceTableByToken_(deck, '{{TBL_POST_ANALYSIS}}', header, matrix);
}

/** slide9 の伸びた投稿テーブルを埋める */
function fillPopularPostsTable_(deck, data) {
  var rows = data.popular_posts || [];
  if (!rows.length) return;
  var header = ['投稿日', '視聴回数', 'いいね', 'コメント', 'シェア', '保存', '新規フォロワー', '維持率'];
  var matrix = rows.map(function (r) {
    return [r.post_date, r.views, r.likes, r.comments, r.shares, r.saves, r.new_followers, r.retention];
  });
  replaceTableByToken_(deck, '{{TBL_POPULAR_POSTS}}', header, matrix);
}

/**
 * トークンを含むテキストボックスがあるスライドに、新規テーブルを生成して値を流し込む。
 * (テンプレ側の表セルを直接編集するのは構造が壊れやすいため、新規テーブルを置く方式)
 */
function replaceTableByToken_(deck, token, header, matrix) {
  var slide = findSlideWithText_(deck, token);
  if (!slide) { Logger.log('表トークン未検出: ' + token); return; }
  var all = [header].concat(matrix);
  var table = slide.insertTable(all.length, header.length);
  for (var r = 0; r < all.length; r++) {
    for (var c = 0; c < header.length; c++) {
      table.getCell(r, c).getText().setText(all[r][c] == null ? '' : String(all[r][c]));
    }
  }
  removeTextToken_(slide, token);
}

/** slide6: ダッシュボードのグラフ画像を貼り込む(プレースホルダ {{IMG_*}} の位置へ) */
function insertDashboardImages_(deck, data) {
  var imgs = data.dashboard_images || {};
  var pairs = [
    ['{{IMG_OVERVIEW_28D}}', imgs.overview_28d],
    ['{{IMG_OVERVIEW_60D}}', imgs.overview_60d],
    ['{{IMG_AUDIENCE_28D}}', imgs.audience_28d],
    ['{{IMG_ACCOUNT_OVERVIEW}}', imgs.account_overview]
  ];
  pairs.forEach(function (pr) {
    if (pr[1]) insertImageAtToken_(deck, pr[0], pr[1]);
  });
}

/** slide10-12: よかった投稿の画像を貼り込む */
function insertHighlightedPostImages_(deck, data) {
  var h = data.highlighted_posts || [];
  for (var i = 0; i < Math.min(h.length, 3); i++) {
    if (h[i] && h[i].image_file_id) {
      insertImageAtToken_(deck, '{{IMG_POST_' + (i + 1) + '}}', h[i].image_file_id);
    }
  }
}

/** 指定トークンのテキストボックス位置にDrive画像を挿入し、トークンを消す */
function insertImageAtToken_(deck, token, fileId) {
  var slide = findSlideWithText_(deck, token);
  if (!slide) { Logger.log('画像トークン未検出: ' + token); return; }
  var shape = findShapeWithText_(slide, token);
  var blob = DriveApp.getFileById(fileId).getBlob();
  var img = slide.insertImage(blob);
  if (shape) {
    img.setLeft(shape.getLeft()).setTop(shape.getTop());
    fitWithin_(img, shape.getWidth(), shape.getHeight());
    shape.remove();
  }
}

/** 画像をボックス内に収まるよう等比縮小 */
function fitWithin_(img, maxW, maxH) {
  var ratio = Math.min(maxW / img.getWidth(), maxH / img.getHeight(), 1);
  img.setWidth(img.getWidth() * ratio).setHeight(img.getHeight() * ratio);
}

// ===== ユーティリティ =====
function findSlideWithText_(deck, text) {
  var slides = deck.getSlides();
  for (var i = 0; i < slides.length; i++) {
    if (slideContainsText_(slides[i], text)) return slides[i];
  }
  return null;
}
function slideContainsText_(slide, text) {
  return !!findShapeWithText_(slide, text);
}
function findShapeWithText_(slide, text) {
  var shapes = slide.getShapes();
  for (var i = 0; i < shapes.length; i++) {
    var t = shapes[i].getText && shapes[i].getText();
    if (t && t.asString().indexOf(text) !== -1) return shapes[i];
  }
  return null;
}
function removeTextToken_(slide, token) {
  var shape = findShapeWithText_(slide, token);
  if (shape) shape.getText().replaceAllText(token, '');
}

// ===== バインド時メニュー =====
function onOpen() {
  var ui = (SpreadsheetApp.getUi && SpreadsheetApp.getUi()) || (SlidesApp.getUi && SlidesApp.getUi());
  if (ui) ui.createMenu('レポート生成').addItem('フォルダIDを指定して生成', 'promptAndGenerate_').addToUi();
}
function promptAndGenerate_() {
  var ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : SlidesApp.getUi();
  var res = ui.prompt('提出分フォルダIDを入力してください');
  if (res.getSelectedButton() === ui.Button.OK) {
    var url = generateReportForFolder(res.getResponseText().trim());
    ui.alert('生成完了:\n' + url);
  }
}

/* =====================================================================
 * TOKEN_MAP — マスターテンプレに埋め込むプレースホルダ一覧
 * ---------------------------------------------------------------------
 * slide1  表紙       : {{REPORT_YM}} {{CREATED_BY}} {{CREATED_DATE}}
 * slide4  総括       : {{ACCOUNT_NAME}} {{ACCOUNT_HANDLE}} {{OPERATION_PERIOD}}
 *                      {{OPERATION_PURPOSE}} {{SUMMARY_TEXT}} {{RESULT_TEXT}}
 * slide6  アカウント : {{DATA_FETCH_DATE}} {{FOLLOWERS_START}} {{FOLLOWERS_CURRENT}}
 *                      {{FOLLOWER_CHANGE_PCT}} {{LIKES}} {{LIKES_PCT}} {{COMMENTS}}
 *                      {{COMMENTS_PCT}} {{SHARES}} {{SHARES_PCT}} {{POST_COUNT}}
 *                      {{POST_FREQ}} {{VIDEO_VIEWS}} {{VIDEO_VIEWS_PCT}} {{PF_ACCESS}}
 *                      {{PF_ACCESS_PCT}} {{REACH}} {{REACH_PCT}}
 *                      画像枠: {{IMG_OVERVIEW_28D}} {{IMG_OVERVIEW_60D}}
 *                              {{IMG_AUDIENCE_28D}} {{IMG_ACCOUNT_OVERVIEW}}
 * slide8  投稿分析   : 表枠テキストボックス {{TBL_POST_ANALYSIS}}
 * slide9  伸びた投稿 : 表枠テキストボックス {{TBL_POPULAR_POSTS}}
 * slide10 よかった投稿: {{POST_DATE_1}} {{POST_THEME_1}} {{POST_EVAL_1}}
 *                       {{POST_COMMENT_1}} 画像枠 {{IMG_POST_1}}
 * slide11 よかった投稿: _2 系
 * slide12 よかった投稿: _3 系
 * slide14 次回施策   : {{REFLECTION}} {{CURRENT_ISSUE}} {{FUTURE_MEASURE_2}}
 * slide15 次回施策   : {{ACTION_PLAN}} {{FUTURE_MEASURE_1}} {{FUTURE_MEASURE_2}}
 * ===================================================================== */
