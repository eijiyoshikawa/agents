/**
 * デッキ構造ダンプ（ワンタイム調査用）
 * ------------------------------------------------------------
 * マスターテンプレの各スライド・各シェイプの位置とテキストを JSON で出力する。
 * このログを Claude に渡すと、トークン化なしで正確に流し込むフィラーを生成できる。
 *
 * 使い方:
 *   1. https://script.google.com で新規プロジェクト
 *   2. このファイルを貼り付け
 *   3. DECK_ID にマスターのID（URLの /d/ と /edit の間）を設定
 *   4. inspectDeck() を実行 → 実行ログ(表示 > ログ)の JSON を全文コピーして共有
 */

var DECK_ID = '1EHHEVOZTm7GkrU111lU69Nz1x-cwsgMfpu1unaWzazA'; // マスター「-マスターデータ」

function inspectDeck() {
  var deck = SlidesApp.openById(DECK_ID);
  var slides = deck.getSlides();
  var out = [];
  for (var i = 0; i < slides.length; i++) {
    out.push({ slide: i + 1, shapes: dumpShapes_(slides[i]) });
  }
  var json = JSON.stringify(out, null, 1);
  // ログは上限で切れるため Drive ファイルへ丸ごと保存する
  var file = DriveApp.createFile('deck_structure.json', json, 'application/json');
  Logger.log('Saved: ' + file.getUrl() + '  id=' + file.getId());
  return file.getId();
}

/** 1スライド内の全シェイプを軽量にダンプ */
function dumpShapes_(slide) {
  var rows = [];
  dumpInto_(rows, slide.getShapes(), 'shape');
  dumpTables_(rows, slide.getTables());
  dumpInto_(rows, slide.getImages(), 'image');
  return rows;
}

function dumpInto_(rows, els, kind) {
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var text = '';
    try { text = el.getText ? el.getText().asString().replace(/\n/g, ' ').trim() : ''; } catch (e) {}
    rows.push({
      kind: kind,
      id: el.getObjectId(),
      text: text.slice(0, 60),
      left: Math.round(el.getLeft()), top: Math.round(el.getTop()),
      w: Math.round(el.getWidth()), h: Math.round(el.getHeight())
    });
  }
}

function dumpTables_(rows, tables) {
  for (var t = 0; t < tables.length; t++) {
    var tb = tables[t];
    rows.push({
      kind: 'table', id: tb.getObjectId(),
      rows: tb.getNumRows(), cols: tb.getNumColumns(),
      left: Math.round(tb.getLeft()), top: Math.round(tb.getTop()),
      w: Math.round(tb.getWidth()), h: Math.round(tb.getHeight())
    });
  }
}
