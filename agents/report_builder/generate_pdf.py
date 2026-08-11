#!/usr/bin/env python3
"""
建築工房様向け AI開発BPO提案書 PDF生成スクリプト (reportlab版)
output.json を読み込み、横向きA4のプレゼンテーション風PDFを生成する
"""

import json
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import Color, HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── フォント登録 ──
pdfmetrics.registerFont(TTFont("IPAGothic", "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"))
pdfmetrics.registerFont(TTFont("IPAGothicP", "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"))

# ── カラー ──
DARK_NAVY = HexColor("#1A1A2E")
ACCENT_BLUE = HexColor("#006ED6")
LIGHT_BLUE = HexColor("#E8F4FD")
WHITE = HexColor("#FFFFFF")
DARK_GRAY = HexColor("#333333")
MID_GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F5F5F5")
ACCENT_GREEN = HexColor("#00A67E")
ACCENT_ORANGE = HexColor("#FF8C00")
MUTED = HexColor("#BBBBBB")

# ── ページサイズ ──
PAGE_W, PAGE_H = landscape(A4)


def draw_bg(c, color):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def draw_rect(c, x, y, w, h, color):
    c.setFillColor(color)
    c.rect(x, y, w, h, fill=1, stroke=0)


def draw_accent_bar(c):
    draw_rect(c, 0, PAGE_H - 7, PAGE_W, 7, ACCENT_BLUE)


def draw_text(c, x, y, text, size=10, color=DARK_GRAY, font="IPAGothic"):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, text)


def draw_text_wrapped(c, x, y, text, size=10, color=DARK_GRAY, max_width=250*mm,
                      font="IPAGothic", line_height=None):
    """折り返し付きテキスト描画。yを返す"""
    if line_height is None:
        line_height = size * 1.6
    c.setFont(font, size)
    c.setFillColor(color)

    # 文字幅ベースで折り返し
    chars_per_line = max(1, int(max_width / (size * 0.6)))
    lines = []
    for i in range(0, len(text), chars_per_line):
        lines.append(text[i:i + chars_per_line])

    for line in lines:
        c.drawString(x, y, line)
        y -= line_height
    return y


# ── スライド生成関数 ──

def title_slide(c, slide):
    c.showPage()
    draw_bg(c, DARK_NAVY)

    # アクセント線
    draw_rect(c, 20*mm, PAGE_H - 85*mm, 50*mm, 1.5*mm, ACCENT_BLUE)

    # タイトル
    draw_text(c, 20*mm, PAGE_H - 100*mm, slide["title"],
              size=32, color=WHITE)

    # サブタイトル
    draw_text_wrapped(c, 20*mm, PAGE_H - 115*mm, slide.get("subtitle", ""),
                      size=14, color=MUTED, max_width=240*mm)

    # 日付
    draw_text(c, 20*mm, PAGE_H - 145*mm, "2026年4月", size=12, color=MID_GRAY)


def agenda_slide(c, slide):
    c.showPage()
    draw_bg(c, LIGHT_GRAY)
    draw_accent_bar(c)

    draw_text(c, 15*mm, PAGE_H - 20*mm, slide["title"],
              size=20, color=DARK_NAVY)

    bullets = slide.get("bullets", [])
    for i, item in enumerate(bullets):
        y = PAGE_H - 38*mm - i * 17*mm
        draw_rect(c, 15*mm, y - 3*mm, 260*mm, 14*mm, WHITE)
        draw_text(c, 20*mm, y + 2*mm, item, size=11, color=DARK_GRAY)


def content_slide(c, slide, highlight=False):
    c.showPage()
    draw_bg(c, WHITE)
    draw_accent_bar(c)

    # タイトル
    draw_text(c, 15*mm, PAGE_H - 20*mm, slide["title"],
              size=20, color=DARK_NAVY)

    subtitle = slide.get("subtitle", "")
    clean_sub = subtitle.replace("※ テンプレートp13のレイアウトを使用して配置", "")
    clean_sub = clean_sub.replace("※ テンプレートp14のレイアウトを使用して配置", "").strip()

    y_start = PAGE_H - 32*mm
    if clean_sub:
        draw_text(c, 15*mm, PAGE_H - 30*mm, clean_sub,
                  size=11, color=ACCENT_BLUE)
        y_start = PAGE_H - 40*mm

    if highlight:
        draw_rect(c, 10*mm, 8*mm, 277*mm, y_start - 6*mm, LIGHT_BLUE)

    bullets = slide.get("bullets", [])
    y = y_start
    for bullet in bullets:
        if bullet == "":
            y -= 4*mm
            continue

        indent = 0
        text = bullet
        sz = 10
        clr = DARK_GRAY
        is_bold = False

        if text.startswith("  "):
            indent = 8*mm
            text = text.strip()
            if text.startswith("- "):
                text = "  " + text[2:]
            sz = 9

        if text.startswith("■") or text.startswith("→") or text.startswith("Phase"):
            clr = ACCENT_BLUE
            is_bold = True

        y = draw_text_wrapped(c, 18*mm + indent, y, text,
                              size=sz, color=clr,
                              max_width=250*mm - indent)
        y -= 1*mm

        if y < 12*mm:
            break


def pricing_slide(c, slide):
    c.showPage()
    draw_bg(c, WHITE)
    draw_accent_bar(c)

    draw_text(c, 15*mm, PAGE_H - 20*mm, "料金プラン",
              size=20, color=DARK_NAVY)

    # 左カード（料金）
    card_top = PAGE_H - 30*mm
    card_h = 75*mm
    draw_rect(c, 12*mm, card_top - card_h, 130*mm, card_h, DARK_NAVY)

    draw_text(c, 18*mm, card_top - 12*mm, "AI開発BPO 基本プラン",
              size=13, color=WHITE)
    draw_text(c, 18*mm, card_top - 30*mm, "月額 40万円（税別）",
              size=24, color=ACCENT_BLUE)
    draw_text(c, 18*mm, card_top - 42*mm, "時間単価：1万円/時間 × 月40時間",
              size=9, color=MUTED)
    draw_text(c, 18*mm, card_top - 52*mm, "契約期間：6ヶ月〜（月単位で調整可能）",
              size=9, color=MUTED)
    draw_text(c, 18*mm, card_top - 64*mm, "6ヶ月トータル：240万円",
              size=12, color=WHITE)
    draw_text(c, 18*mm, card_top - 74*mm, "補助金活用時：実質120万円以下",
              size=11, color=ACCENT_GREEN)

    # 右カード（サービス内容）
    draw_rect(c, 150*mm, card_top - card_h, 135*mm, card_h, LIGHT_BLUE)

    draw_text(c, 156*mm, card_top - 12*mm, "含まれるサービス",
              size=13, color=DARK_NAVY)

    services = [
        "AI業務分析・設計・開発・テスト・導入支援",
        "営業AI・採用AI・管理ダッシュボードの構築",
        "SNS採用戦略の企画・テンプレート作成",
        "補助金申請サポート",
        "月次レポート・進捗報告会",
    ]
    for i, svc in enumerate(services):
        draw_text(c, 158*mm, card_top - 26*mm - i * 11*mm,
                  f"  {svc}", size=9, color=DARK_GRAY)

    # 比較バー
    draw_text(c, 15*mm, card_top - card_h - 12*mm, "他の選択肢との比較",
              size=12, color=DARK_NAVY)

    comps = [
        ("通常のシステム開発", "500万〜3,000万円", ACCENT_ORANGE, LIGHT_GRAY),
        ("RPO（採用代行）", "年720万円", ACCENT_ORANGE, LIGHT_GRAY),
        ("エン転職", "88万円/8週間", ACCENT_ORANGE, LIGHT_GRAY),
        ("AI開発BPO", "240万円/6ヶ月", ACCENT_GREEN, LIGHT_BLUE),
    ]
    bar_y = card_top - card_h - 20*mm
    for i, (label, cost, clr, bg) in enumerate(comps):
        bx = 15*mm + i * 68*mm
        draw_rect(c, bx, bar_y - 17*mm, 62*mm, 17*mm, bg)
        draw_text(c, bx + 4*mm, bar_y - 6*mm, label, size=8, color=MID_GRAY)
        draw_text(c, bx + 4*mm, bar_y - 14*mm, cost, size=11, color=clr)


def nextsteps_slide(c, slide):
    c.showPage()
    draw_bg(c, DARK_NAVY)
    draw_rect(c, 0, PAGE_H - 7, PAGE_W, 7, ACCENT_BLUE)

    draw_text(c, 15*mm, PAGE_H - 22*mm, "Next Steps",
              size=24, color=WHITE)

    bullets = slide.get("bullets", [])
    for i, item in enumerate(bullets):
        y = PAGE_H - 45*mm - i * 25*mm

        # ステップ番号
        draw_rect(c, 15*mm, y - 4*mm, 15*mm, 15*mm, ACCENT_BLUE)
        draw_text(c, 19*mm, y, str(i + 1), size=14, color=WHITE)

        # テキスト
        text = item
        if text and text[0].isdigit() and ". " in text[:4]:
            text = text.split(". ", 1)[1]
        draw_text_wrapped(c, 38*mm, y + 3*mm, text,
                          size=12, color=WHITE, max_width=230*mm)

    # フッター
    draw_text(c, 30*mm, 15*mm,
              "建設業界のAI活用率9.4%の今だからこそ、先行者優位を確立できるタイミングです。",
              size=10, color=ACCENT_BLUE)


def main():
    with open("/home/user/agents/agents/report_builder/output.json", "r") as f:
        data = json.load(f)

    output_path = "/home/user/agents/agents/report_builder/AI開発BPO提案書_建築工房様.pdf"
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle("AI開発BPO ご提案書 — 株式会社建築工房 様")

    highlight_slides = {7, 8, 10}

    for slide in data["slides"]:
        sn = slide["slide_number"]
        st = slide["slide_type"]

        if st == "title":
            title_slide(c, slide)
        elif st == "agenda":
            agenda_slide(c, slide)
        elif sn == 13:
            pricing_slide(c, slide)
        elif sn == 14:
            nextsteps_slide(c, slide)
        elif sn in highlight_slides:
            content_slide(c, slide, highlight=True)
        else:
            content_slide(c, slide)

    c.save()
    print(f"PDF saved: {output_path}")
    print(f"Total slides: {len(data['slides'])}")


if __name__ == "__main__":
    main()
