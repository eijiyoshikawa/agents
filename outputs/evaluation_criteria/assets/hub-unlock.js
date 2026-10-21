// 経営ハブの共通ログインで入ったとき（hyoka.let-inc.net）、middleware.js が役員向けに置く
// 解錠用 Cookie（let_hyoka_unlock）でページのパスワード入力を自動で済ませる。
// 各ページの既存の認証処理（ハッシュ照合・sessionStorage 保存）をそのまま使うため、
// フォームに値を入れて submit するだけ。Cookie は使ったら消す。
(function () {
  var NAME = "let_hyoka_unlock";
  var m = document.cookie.match(new RegExp("(?:^|; )" + NAME + "=([^;]*)"));
  if (!m) return;
  var pw = decodeURIComponent(m[1]);
  document.cookie = NAME + "=; Path=/; Max-Age=0; Secure; SameSite=Lax";
  var gate = document.getElementById("auth-gate");
  var form = document.getElementById("auth-form");
  var input = document.getElementById("auth-input");
  if (!form || !input || !gate || gate.style.display === "none") return;
  input.value = pw;
  if (typeof form.requestSubmit === "function") form.requestSubmit();
  else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
})();
