// 招待コード・スラッグ生成
// 紛らわしい文字（0/O, 1/I/L）を除いた英数字でコードを作る。

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 0,O,1,I,L を除外

/** 指定桁のランダムコードを生成 */
export function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * 会社名から接頭辞を作る（英字のみ・大文字4文字）。
 * 英字が無い場合（和名のみ）は "PTNR" を使う。
 */
export function prefixFromName(name: string): string {
  const ascii = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (ascii.slice(0, 4) || "PTNR").padEnd(4, "X");
}

/**
 * 招待コードを生成する。例: "ACME-7K3Q"。
 * isTaken で既存コードとの衝突を判定し、衝突時は再生成する。
 */
export function generateReferralCode(
  name: string,
  isTaken: (code: string) => boolean = () => false,
  maxAttempts = 20
): string {
  const prefix = prefixFromName(name);
  for (let i = 0; i < maxAttempts; i++) {
    const code = `${prefix}-${randomCode(4)}`;
    if (!isTaken(code)) return code;
  }
  // 衝突が続く場合は桁を増やして必ず返す
  return `${prefix}-${randomCode(8)}`;
}

/** 会社名から URL スラッグを作る（英数字とハイフン） */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "partner";
}

/**
 * 衝突しないユニークなスラッグを返す。
 * 既存と衝突する場合は -2, -3 ... を付与する。
 */
export function uniqueSlug(
  name: string,
  isTaken: (slug: string) => boolean = () => false
): string {
  const base = slugify(name);
  if (!isTaken(base)) return base;
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
