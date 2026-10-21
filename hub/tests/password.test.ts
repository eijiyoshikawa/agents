import { describe, expect, it } from "vitest";
import { hashPassword, loadPasswordHashes, verifyPassword } from "@/lib/password";
import { clearFailures, isBlocked, recordFailure } from "@/lib/login-limiter";

describe("パスワードハッシュ", () => {
  it("正しいパスワードは通り、違うものは拒否する", () => {
    const h = hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$16384$")).toBe(true);
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(verifyPassword("", h)).toBe(false);
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$abc$x$y")).toBe(false);
  });
  it("HUB_PASSWORD_HASHES はメールを小文字に正規化し、不正な JSON は空", () => {
    const h = hashPassword("pw");
    expect(loadPasswordHashes(JSON.stringify({ "A@Example.com": h }))).toEqual({ "a@example.com": h });
    expect(loadPasswordHashes("not json")).toEqual({});
    expect(loadPasswordHashes("[1]")).toEqual({});
    expect(loadPasswordHashes(undefined)).toEqual({});
    expect(loadPasswordHashes(JSON.stringify({ a: 1 }))).toEqual({});
  });
});

describe("ログイン失敗の制限", () => {
  it("10 回失敗でブロック、15 分後に解除、成功で解除", () => {
    const key = "test-ip";
    const t0 = 1_000_000;
    clearFailures(key);
    for (let i = 0; i < 9; i++) recordFailure(key, t0);
    expect(isBlocked(key, t0)).toBe(false);
    recordFailure(key, t0);
    expect(isBlocked(key, t0)).toBe(true);
    expect(isBlocked(key, t0 + 15 * 60 * 1000)).toBe(false);
    recordFailure(key, t0);
    clearFailures(key);
    expect(isBlocked(key, t0)).toBe(false);
  });
});
