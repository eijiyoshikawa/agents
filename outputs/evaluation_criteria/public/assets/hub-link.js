// 経営ハブ（全ダッシュボードの入口 https://hub.let-inc.net）へ戻るリンクを画面左上に出す。全ページ共通。
(function () {
  if (document.getElementById("let-hub-link")) return;
  var a = document.createElement("a");
  a.id = "let-hub-link";
  a.href = "https://hub.let-inc.net";
  a.textContent = "← 経営ハブ";
  a.title = "経営ハブ（全ダッシュボードの入口）へ戻る";
  a.setAttribute("style", [
    "position:fixed", "top:10px", "left:10px", "z-index:9999",
    "display:inline-flex", "align-items:center", "height:30px", "padding:0 12px",
    "border-radius:999px", "border:1px solid rgba(150,172,225,.35)",
    "background:rgba(8,21,48,.88)", "color:#86b4ff", "font:600 12.5px/1 -apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif",
    "text-decoration:none", "box-shadow:0 4px 14px rgba(0,0,0,.25)", "backdrop-filter:blur(6px)",
  ].join(";"));
  document.body.appendChild(a);
})();
