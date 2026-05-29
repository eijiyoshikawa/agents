import { describe, it, expect } from "vitest";
import { htmlToText } from "@/lib/fetch-html";

describe("htmlToText", () => {
  it("script/styleを除去する", () => {
    const html = `<html><head><style>.a{}</style></head>
      <body><script>alert(1)</script><p>仕事内容</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("仕事内容");
    expect(text).not.toContain("alert");
    expect(text).not.toContain(".a{}");
  });

  it("ブロック要素を改行に変換する", () => {
    const text = htmlToText("<p>A</p><p>B</p>");
    expect(text).toBe("A\nB");
  });

  it("HTMLエンティティを復元する", () => {
    expect(htmlToText("<p>R&amp;D</p>")).toBe("R&D");
  });

  it("長文は上限で切り詰める", () => {
    const long = "あ".repeat(20000);
    expect(htmlToText(`<p>${long}</p>`).length).toBeLessThanOrEqual(12000);
  });
});
