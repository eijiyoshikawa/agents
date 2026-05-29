/**
 * LETロゴ（コーンマーク）のSVG再現。
 * 提供ロゴ画像をベクターで再構成したもの。`currentColor` を使うため、
 * 親要素の color（＝ブランド紺）を自動で継承する。
 *
 * 正式なロゴSVG/PNGが用意できたら、この文字列を差し替えるだけで
 * Web/PDF両方に反映される（template.ts と Webヘッダーが本関数を参照）。
 */
export function letMarkSvg(size = 40): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 210" fill="none"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LET inc. ロゴマーク"
    style="color:currentColor">
  <g stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="100" y1="10" x2="100" y2="42"/>
    <line x1="100" y1="42" x2="46" y2="172"/>
    <line x1="100" y1="42" x2="154" y2="172"/>
    <ellipse cx="100" cy="178" rx="62" ry="19"/>
  </g>
  <path d="M100 46 L100 168 L150 168 Z" fill="currentColor"/>
  <rect x="150" y="150" width="14" height="18" fill="currentColor"/>
</svg>`;
}
