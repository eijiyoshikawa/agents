import { describe, expect, it } from "vitest";
import {
  generateCredential,
  generateCredentialBatch,
  generatePassword,
  loginIdForSeq,
} from "./credentials";

describe("loginIdForSeq", () => {
  it("連番を4桁ゼロ埋めの ID にする", () => {
    expect(loginIdForSeq(1)).toBe("LET-P-0001");
    expect(loginIdForSeq(123)).toBe("LET-P-0123");
  });
});

describe("generatePassword", () => {
  it("指定桁で紛らわしい文字を含まない", () => {
    const pw = generatePassword(16);
    expect(pw).toHaveLength(16);
    expect(pw).not.toMatch(/[0O1Il]/);
  });
});

describe("generateCredentialBatch", () => {
  it("startSeq から count 件、ログイン ID が一意の連番", () => {
    const batch = generateCredentialBatch(3, 10);
    expect(batch.map((c) => c.loginId)).toEqual(["LET-P-0010", "LET-P-0011", "LET-P-0012"]);
    expect(new Set(batch.map((c) => c.password)).size).toBe(3);
  });

  it("generateCredential は ID とパスワードを返す", () => {
    const c = generateCredential(5);
    expect(c.loginId).toBe("LET-P-0005");
    expect(c.password.length).toBeGreaterThanOrEqual(8);
  });
});
