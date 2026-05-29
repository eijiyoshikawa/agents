import { describe, it, expect } from "vitest";
import { parseUrlLines } from "@/lib/client";

describe("parseUrlLines", () => {
  it("改行区切りを配列化し空行を除去", () => {
    expect(parseUrlLines("a\n\n b \nc\n")).toEqual(["a", "b", "c"]);
  });

  it("空文字は空配列", () => {
    expect(parseUrlLines("   \n  ")).toEqual([]);
  });
});
