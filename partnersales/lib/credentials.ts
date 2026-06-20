// パートナーのログイン認証情報の生成。
// 弊社が事前にパターン発行（Notion 等に保管）し、アポ後にスタッフが登録時へ割り当てる。
// パスワードは平文を発行一覧にのみ残し、DB にはハッシュで保存する（pgcrypto, RPC 側）。

const ID_PREFIX = "LET-P";
// パスワード用：紛らわしい文字を除いた英数字
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** 連番からログイン ID を作る（例: LET-P-0007） */
export function loginIdForSeq(seq: number): string {
  return `${ID_PREFIX}-${String(seq).padStart(4, "0")}`;
}

/** ランダムパスワードを生成（既定12桁） */
export function generatePassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PW_ALPHABET[Math.floor(Math.random() * PW_ALPHABET.length)];
  }
  return out;
}

export interface GeneratedCredential {
  loginId: string;
  password: string;
}

/** 連番に対する認証情報を1件生成 */
export function generateCredential(seq: number): GeneratedCredential {
  return { loginId: loginIdForSeq(seq), password: generatePassword() };
}

/**
 * 認証情報をまとめて発行する。
 * startSeq から count 件、ログイン ID は連番・パスワードはランダム。
 */
export function generateCredentialBatch(
  count: number,
  startSeq = 1
): GeneratedCredential[] {
  const out: GeneratedCredential[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateCredential(startSeq + i));
  }
  return out;
}
