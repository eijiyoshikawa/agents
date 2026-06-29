/**
 * SNS分析レポート 自動生成レンダラ (Google Apps Script) — 位置ベース確定版
 * ------------------------------------------------------------
 * 役割: 提出分フォルダ内の report_data.json を読み込み、マスターテンプレを複製して
 *       数値・テキスト・表・画像を「シェイプの位置(left,top)」で特定して流し込む。
 *
 * 設計方針:
 *   - トークン化(穴埋め{{}})は不要。元テンプレをそのまま複製して直接当て込む。
 *   - シェイプ特定は objectId ではなく position(left,top) で行う(複製でID再採番されても安全)。
 *   - 位置マップは deck_structure.json(inspectDeck の出力)から確定済み。
 *
 * 使い方:
 *   1) TEMPLATE_ID にマスター「【テンプレ】分析レポート-マスターデータ」のIDを設定(設定済み)
 *   2) 提出分フォルダに report_data.json を置く(samples/ のサンプルを参照)
 *   3) generateReportForFolder('<提出分フォルダID>') を実行
 *      または generateReportFromDataFile('<report_data.jsonのファイルID>') を実行
 */

// ===== 設定 =====
var TEMPLATE_ID = '1EHHEVOZTm7GkrU111lU69Nz1x-cwsgMfpu1unaWzazA'; // マスター「-マスターデータ」
var DATA_FILENAME = 'report_data.json';
var POS_TOLERANCE = 2; // 位置一致の許容誤差(pt)

/**
 * 流し込み対象マップ。slide番号(1始まり) → [{l:left, t:top, key:データキー}]
 * key は flatten 済みデータ(buildFields_)のプロパティ名。
 * 合成テキスト(タイトル等)は「完成済み文字列」をデータ側で渡す前提で全文 setText する。
 */
var TEXT_MAP = {
  1: [
    { l: 130, t: 238, key: 's1_author' },    // "株式会社LET マーケティング 〇〇"
    { l: 130, t: 268, key: 's1_created' }    // "2026年6月7日 作成"
  ],
  4: [
    { l: 45,  t: 111, key: 's4_basic_info' },// 基本情報ブロック(複数行)
    { l: 45,  t: 253, key: 's4_goal' },      // 目標 本文
    { l: 45,  t: 331, key: 's4_result' }     // 結果 本文
  ],
  6: [
    { l: 43,  t: 42,  key: 's6_header' },        // "アカウント分析　（データ取得日：…）"
    // 左: フォロワー数推移
    { l: 134, t: 93,  key: 's6_followers_start' },
    { l: 134, t: 152, key: 's6_followers_now' },
    { l: 143, t: 218, key: 's6_followers_change' }, // 前回比%
    // 左下: 投稿数(累計) / 投稿頻度(月間)
    { l: 98,  t: 308, key: 's6_posts_total' },
    { l: 254, t: 322, key: 's6_post_freq' },
    // 右: エンゲージメント(値)
    { l: 400, t: 97,  key: 's6_video_views' },
    { l: 400, t: 151, key: 's6_pf_access' },
    { l: 400, t: 203, key: 's6_likes' },
    { l: 400, t: 257, key: 's6_comments' },
    { l: 400, t: 310, key: 's6_shares' },
    // 右: 前月比%
    { l: 562, t: 105, key: 's6_video_views_pct' },
    { l: 562, t: 155, key: 's6_pf_access_pct' },
    { l: 561, t: 211, key: 's6_likes_pct' },
    { l: 561, t: 261, key: 's6_comments_pct' },
    { l: 561, t: 317, key: 's6_shares_pct' }
  ],
  8: [
    { l: 43,  t: 42,  key: 's8_header' }     // "投稿分析　（データ取得期間：…）"
  ],
  9: [
    { l: 43,  t: 42,  key: 's9_header' }      // "伸びた投稿分析　（データ取得期間：…）"
  ],
  10: [
    { l: 43,  t: 42,  key: 's10_header' },
    { l: 45,  t: 121, key: 's10_post_header' }, // "投稿日：… テーマ：…"
    { l: 45,  t: 223, key: 's10_eval' },
    { l: 44,  t: 339, key: 's10_comment' }
  ],
  11: [
    { l: 43,  t: 42,  key: 's11_header' },
    { l: 45,  t: 121, key: 's11_post_header' },
    { l: 45,  t: 223, key: 's11_eval' },
    { l: 44,  t: 339, key: 's11_comment' }
  ],
  12: [
    { l: 43,  t: 42,  key: 's12_header' },
    { l: 45,  t: 121, key: 's12_post_header' },
    { l: 45,  t: 223, key: 's12_eval' },
    { l: 44,  t: 339, key: 's12_comment' }
  ],
  14: [
    { l: 45,  t: 85,  key: 's14_reflection' },   // 振り返り
    { l: 45,  t: 196, key: 's14_current_issue' },// 現状の課題
    { l: 46,  t: 302, key: 's14_next_action' }   // 今後の施策
  ],
  15: [
    { l: 45,  t: 85,  key: 's15_current_issue' },
    { l: 46,  t: 190, key: 's15_next_action' }
  ]
};

/**
 * 部分置換マップ。書式(フォントサイズ等)を保ちたい合成ボックス用。
 * slide番号 → [{l,t, find:置換対象文字列, key:データキー}]
 */
var REPLACE_MAP = {
  1: [{ l: 61, t: 81, find: '202●年●月', key: 's1_title_date' }] // 表紙の日付のみ差し替え
};

/** 表の位置マップ。slide番号 → [{t:top, key:データキー(2次元配列)}] */
var TABLE_MAP = {
  8: [{ t: 85,  key: 's8_table' }],
  9: [{ t: 85,  key: 's9_table1' }, { t: 184, key: 's9_table2' }, { t: 283, key: 's9_table3' }]
};

/** 画像の位置マップ。slide番号 → [{l,t, key:画像URL}] (任意。URLが無ければスキップ) */
var IMAGE_MAP = {
  1: [{ l: 358, t: 23,  key: 's1_image_url' }],
  4: [{ l: 430, t: 71,  key: 's4_image_url' }]
};

// ===== エントリポイント =====
function generateReportForFolder(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var it = folder.getFilesByName(DATA_FILENAME);
  if (!it.hasNext()) throw new Error(DATA_FILENAME + ' が見つかりません: ' + folder.getName());
  var data = JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
  return render_(data, folder);
}

function generateReportFromDataFile(dataFileId) {
  var file = DriveApp.getFileById(dataFileId);
  var data = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  return render_(data, file.getParents().hasNext() ? file.getParents().next() : null);
}

/**
 * 流し込み→保存。
 * フォルダ内に既存のスライド(出力デッキ)があれば、それを直接埋める(名前は保持)。
 * 無ければテンプレを複製して埋める。
 */
function render_(data, folder) {
  var fields = buildFields_(data);
  var deck = null;
  if (folder) {
    var existing = folder.getFilesByType(MimeType.GOOGLE_SLIDES);
    if (existing.hasNext()) deck = SlidesApp.openById(existing.next().getId()); // 既存デッキを上書き
  }
  if (!deck) {
    var name = (fields._deck_title || '分析レポート');
    var copyFile = DriveApp.getFileById(TEMPLATE_ID).makeCopy(name);
    if (folder) { folder.addFile(copyFile); DriveApp.getRootFolder().removeFile(copyFile); }
    deck = SlidesApp.openById(copyFile.getId());
  }

  var slides = deck.getSlides();
  fillTexts_(slides, fields);
  fillReplaces_(slides, fields);
  fillTables_(slides, fields);
  fillImages_(slides, fields);
  deck.saveAndClose();

  var url = 'https://docs.google.com/presentation/d/' + deck.getId() + '/edit';
  Logger.log('生成完了: ' + url);
  return url;
}

// ===== テキスト流し込み =====
function fillTexts_(slides, fields) {
  Object.keys(TEXT_MAP).forEach(function (sn) {
    var slide = slides[Number(sn) - 1];
    if (!slide) return;
    TEXT_MAP[sn].forEach(function (m) {
      if (!(m.key in fields)) return;             // データ未指定はテンプレ既定値を維持
      var shape = findShapeByPos_(slide, m.l, m.t);
      if (shape) shape.getText().setText(toStr_(fields[m.key]));
      else Logger.log('未検出(text) slide' + sn + ' @' + m.l + ',' + m.t);
    });
  });
}

// ===== 部分置換(書式維持) =====
function fillReplaces_(slides, fields) {
  Object.keys(REPLACE_MAP).forEach(function (sn) {
    var slide = slides[Number(sn) - 1];
    if (!slide) return;
    REPLACE_MAP[sn].forEach(function (m) {
      if (!(m.key in fields)) return;
      var shape = findShapeByPos_(slide, m.l, m.t);
      if (shape) shape.getText().replaceAllText(m.find, toStr_(fields[m.key]));
      else Logger.log('未検出(replace) slide' + sn + ' @' + m.l + ',' + m.t);
    });
  });
}

// ===== 表流し込み(既存セルを上書き。行数はテンプレの範囲内で) =====
function fillTables_(slides, fields) {
  Object.keys(TABLE_MAP).forEach(function (sn) {
    var slide = slides[Number(sn) - 1];
    if (!slide) return;
    var tables = slide.getTables();
    TABLE_MAP[sn].forEach(function (m) {
      if (!fields[m.key]) return;
      var table = pickTableByTop_(tables, m.t);
      if (!table) { Logger.log('未検出(table) slide' + sn + ' top' + m.t); return; }
      writeTable_(table, fields[m.key]);
    });
  });
}

function writeTable_(table, matrix) {
  var nR = table.getNumRows(), nC = table.getNumColumns();
  for (var r = 0; r < matrix.length && r < nR; r++) {
    var row = matrix[r] || [];
    for (var c = 0; c < row.length && c < nC; c++) {
      if (row[c] == null) continue;
      table.getCell(r, c).getText().setText(toStr_(row[c]));
    }
  }
}

// ===== 画像差し替え(任意) =====
function fillImages_(slides, fields) {
  Object.keys(IMAGE_MAP).forEach(function (sn) {
    var slide = slides[Number(sn) - 1];
    if (!slide) return;
    IMAGE_MAP[sn].forEach(function (m) {
      var url = fields[m.key];
      if (!url) return;
      var img = findImageByPos_(slide, m.l, m.t);
      if (!img) { Logger.log('未検出(image) slide' + sn + ' @' + m.l + ',' + m.t); return; }
      try {
        if (/^https?:\/\//.test(url)) img.replace(url);            // 公開URL
        else img.replace(DriveApp.getFileById(url).getBlob());     // DriveファイルID
      } catch (e) { Logger.log('画像差替失敗 ' + m.key + ': ' + e); }
    });
  });
}

// ===== シェイプ探索(位置ベース) =====
function findShapeByPos_(slide, l, t) {
  return nearest_(slide.getShapes(), l, t);
}
function findImageByPos_(slide, l, t) {
  return nearest_(slide.getImages(), l, t);
}
function nearest_(els, l, t) {
  for (var i = 0; i < els.length; i++) {
    if (Math.abs(els[i].getLeft() - l) <= POS_TOLERANCE &&
        Math.abs(els[i].getTop() - t) <= POS_TOLERANCE) return els[i];
  }
  return null;
}
function pickTableByTop_(tables, t) {
  for (var i = 0; i < tables.length; i++) {
    if (Math.abs(tables[i].getTop() - t) <= POS_TOLERANCE) return tables[i];
  }
  return null;
}
function toStr_(v) { return v == null ? '' : String(v); }

// ===== データ整形: report_data.json → flatフィールド =====
function buildFields_(data) {
  var m = data.meta || {}, s = data.summary || {}, a = data.account || {},
      p = data.posts || {}, n = data.next_actions || {}, img = data.images || {};
  var hi = data.highlighted_posts || [];
  var f = {
    _deck_title: m.deck_title || [m.client, m.report_ym, '分析レポート'].filter(String).join('_'),
    // slide1
    s1_title_date: m.report_ym, s1_author: m.author, s1_created: m.created,
    s1_image_url: img.cover,
    // slide4
    s4_basic_info: s.basic_info, s4_goal: s.goal, s4_result: s.result,
    s4_image_url: img.summary,
    // slide6
    s6_header: a.header,
    s6_followers_start: a.followers_start, s6_followers_now: a.followers_now,
    s6_followers_change: a.followers_change,
    s6_posts_total: a.posts_total, s6_post_freq: a.post_freq,
    s6_video_views: a.video_views, s6_video_views_pct: a.video_views_pct,
    s6_pf_access: a.pf_access, s6_pf_access_pct: a.pf_access_pct,
    s6_likes: a.likes, s6_likes_pct: a.likes_pct,
    s6_comments: a.comments, s6_comments_pct: a.comments_pct,
    s6_shares: a.shares, s6_shares_pct: a.shares_pct,
    // slide8/9 tables
    s8_header: p.header_monthly, s9_header: p.header_popular,
    s10_header: p.header_popular, s11_header: p.header_popular, s12_header: p.header_popular,
    s8_table: p.monthly_table, s9_table1: p.popular_table1,
    s9_table2: p.popular_table2, s9_table3: p.popular_table3,
    // slide14/15
    s14_reflection: n.reflection, s14_current_issue: n.current_issue, s14_next_action: n.next_action,
    s15_current_issue: n.current_issue2, s15_next_action: n.next_action2
  };
  // slide10-12 よかった投稿(配列の0..2)
  for (var i = 0; i < 3; i++) {
    var h = hi[i] || {}, sn = (10 + i);
    f['s' + sn + '_post_header'] = h.header;
    f['s' + sn + '_eval'] = h.eval;
    f['s' + sn + '_comment'] = h.comment;
  }
  // 未指定キーは「テンプレ既定値維持」のため削除しておく
  Object.keys(f).forEach(function (k) { if (f[k] === undefined) delete f[k]; });
  return f;
}

// ===== バインド時メニュー(任意) =====
function onOpen() {
  var ui = (SlidesApp.getUi && SlidesApp.getUi()) || (SpreadsheetApp.getUi && SpreadsheetApp.getUi());
  if (ui) ui.createMenu('レポート生成').addItem('フォルダIDを指定して生成', 'promptAndGenerate_').addToUi();
}
function promptAndGenerate_() {
  var ui = SlidesApp.getUi ? SlidesApp.getUi() : SpreadsheetApp.getUi();
  var res = ui.prompt('提出分フォルダIDを入力してください');
  if (res.getSelectedButton() === ui.Button.OK) {
    ui.alert('生成完了:\n' + generateReportForFolder(res.getResponseText().trim()));
  }
}
