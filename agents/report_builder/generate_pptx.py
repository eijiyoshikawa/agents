#!/usr/bin/env python3
"""
建築工房様向け AI開発BPO提案書 PPTX生成スクリプト
output.json を読み込み、プロフェッショナルなプレゼンテーションを生成する
"""

import json
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── カラーパレット ──
DARK_NAVY = RGBColor(0x1A, 0x1A, 0x2E)
ACCENT_BLUE = RGBColor(0x00, 0x6E, 0xD6)
LIGHT_BLUE = RGBColor(0xE8, 0xF4, 0xFD)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK_GRAY = RGBColor(0x33, 0x33, 0x33)
MID_GRAY = RGBColor(0x66, 0x66, 0x66)
LIGHT_GRAY = RGBColor(0xF5, 0xF5, 0xF5)
ACCENT_GREEN = RGBColor(0x00, 0xA6, 0x7E)
ACCENT_ORANGE = RGBColor(0xFF, 0x8C, 0x00)

def add_background(slide, color):
    """スライド背景色を設定"""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape_bg(slide, left, top, width, height, color, alpha=None):
    """色付き矩形を追加"""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=14,
                 color=DARK_GRAY, bold=False, alignment=PP_ALIGN.LEFT,
                 font_name="Yu Gothic"):
    """テキストボックスを追加"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_bullet_slide(slide, bullets, start_top, left=Inches(0.8),
                     width=Inches(8.4), font_size=13, color=DARK_GRAY,
                     line_spacing=1.5):
    """箇条書きテキストを追加"""
    txBox = slide.shapes.add_textbox(left, start_top, width, Inches(4.5))
    tf = txBox.text_frame
    tf.word_wrap = True

    for i, bullet in enumerate(bullets):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()

        if bullet == "":
            p.space_after = Pt(4)
            continue

        # インデント判定
        indent_level = 0
        display_text = bullet
        if bullet.startswith("  - ") or bullet.startswith("  "):
            indent_level = 1
            display_text = bullet.strip()
            if display_text.startswith("- "):
                display_text = display_text[2:]

        p.text = display_text
        p.font.size = Pt(font_size - (1 if indent_level > 0 else 0))
        p.font.color.rgb = color
        p.font.name = "Yu Gothic"
        p.space_after = Pt(6)
        p.level = indent_level

        if bullet.startswith("■") or bullet.startswith("→"):
            p.font.bold = True
            p.font.color.rgb = ACCENT_BLUE

    return txBox

def create_title_slide(prs, slide_data):
    """表紙スライド"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank
    add_background(slide, DARK_NAVY)

    # アクセント線
    add_shape_bg(slide, Inches(0.8), Inches(2.5), Inches(1.5), Pt(4), ACCENT_BLUE)

    # タイトル
    add_text_box(slide, Inches(0.8), Inches(2.7), Inches(8), Inches(1),
                 slide_data["title"], font_size=36, color=WHITE, bold=True)

    # サブタイトル
    add_text_box(slide, Inches(0.8), Inches(3.7), Inches(8), Inches(0.8),
                 slide_data["subtitle"], font_size=16, color=RGBColor(0xBB, 0xBB, 0xBB))

    # 日付
    add_text_box(slide, Inches(0.8), Inches(4.8), Inches(3), Inches(0.4),
                 "2026年4月", font_size=14, color=RGBColor(0x88, 0x88, 0x88))

    # ノート
    if slide_data.get("speaker_notes"):
        slide.notes_slide.notes_text_frame.text = slide_data["speaker_notes"]

def create_content_slide(prs, slide_data, is_highlight=False):
    """通常コンテンツスライド"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank
    add_background(slide, WHITE)

    # ヘッダーバー
    add_shape_bg(slide, Inches(0), Inches(0), Inches(10), Inches(0.08), ACCENT_BLUE)

    # タイトル
    add_text_box(slide, Inches(0.6), Inches(0.3), Inches(8.8), Inches(0.6),
                 slide_data["title"], font_size=24, color=DARK_NAVY, bold=True)

    # サブタイトル
    subtitle = slide_data.get("subtitle", "")
    subtitle_clean = subtitle.replace("※ テンプレートp13のレイアウトを使用して配置", "").replace("※ テンプレートp14のレイアウトを使用して配置", "").strip()
    top_offset = Inches(1.0)
    if subtitle_clean:
        add_text_box(slide, Inches(0.6), Inches(0.95), Inches(8.8), Inches(0.4),
                     subtitle_clean, font_size=14, color=ACCENT_BLUE, bold=True)
        top_offset = Inches(1.4)

    # ハイライトスライドの背景
    if is_highlight:
        add_shape_bg(slide, Inches(0.4), top_offset - Inches(0.1),
                     Inches(9.2), Inches(4.8), LIGHT_BLUE)

    # 箇条書き
    bullets = slide_data.get("bullets", [])
    if bullets:
        add_bullet_slide(slide, bullets, top_offset)

    # ノート
    if slide_data.get("speaker_notes"):
        slide.notes_slide.notes_text_frame.text = slide_data["speaker_notes"]

def create_agenda_slide(prs, slide_data):
    """アジェンダスライド"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, LIGHT_GRAY)

    add_shape_bg(slide, Inches(0), Inches(0), Inches(10), Inches(0.08), ACCENT_BLUE)

    add_text_box(slide, Inches(0.6), Inches(0.3), Inches(8.8), Inches(0.6),
                 slide_data["title"], font_size=24, color=DARK_NAVY, bold=True)

    bullets = slide_data.get("bullets", [])
    for i, item in enumerate(bullets):
        y = Inches(1.2) + Inches(i * 0.55)
        # 番号付きアイテムのカード風
        add_shape_bg(slide, Inches(0.6), y, Inches(8.8), Inches(0.45), WHITE)
        add_text_box(slide, Inches(0.8), y + Pt(4), Inches(8.4), Inches(0.4),
                     item, font_size=14, color=DARK_GRAY)

    if slide_data.get("speaker_notes"):
        slide.notes_slide.notes_text_frame.text = slide_data["speaker_notes"]

def create_pricing_slide(prs, slide_data):
    """料金プランスライド（p13テンプレート風）"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, WHITE)

    add_shape_bg(slide, Inches(0), Inches(0), Inches(10), Inches(0.08), ACCENT_BLUE)
    add_text_box(slide, Inches(0.6), Inches(0.3), Inches(8.8), Inches(0.6),
                 "料金プラン", font_size=24, color=DARK_NAVY, bold=True)

    # メイン料金カード
    add_shape_bg(slide, Inches(0.5), Inches(1.1), Inches(4.2), Inches(2.8), DARK_NAVY)

    add_text_box(slide, Inches(0.8), Inches(1.3), Inches(3.6), Inches(0.4),
                 "AI開発BPO 基本プラン", font_size=16, color=WHITE, bold=True)

    add_text_box(slide, Inches(0.8), Inches(1.8), Inches(3.6), Inches(0.5),
                 "月額 40万円（税別）", font_size=28, color=ACCENT_BLUE, bold=True)

    add_text_box(slide, Inches(0.8), Inches(2.4), Inches(3.6), Inches(0.3),
                 "時間単価：1万円/時間 × 月40時間", font_size=12, color=RGBColor(0xBB, 0xBB, 0xBB))

    add_text_box(slide, Inches(0.8), Inches(2.8), Inches(3.6), Inches(0.3),
                 "契約期間：6ヶ月〜（月単位で調整可能）", font_size=12, color=RGBColor(0xBB, 0xBB, 0xBB))

    add_text_box(slide, Inches(0.8), Inches(3.2), Inches(3.6), Inches(0.5),
                 "6ヶ月トータル：240万円", font_size=14, color=WHITE, bold=True)

    add_text_box(slide, Inches(0.8), Inches(3.5), Inches(3.6), Inches(0.3),
                 "補助金活用時：実質120万円以下", font_size=13, color=ACCENT_GREEN, bold=True)

    # サービス内容カード
    add_shape_bg(slide, Inches(5.2), Inches(1.1), Inches(4.3), Inches(2.8), LIGHT_BLUE)

    add_text_box(slide, Inches(5.5), Inches(1.3), Inches(3.8), Inches(0.4),
                 "含まれるサービス", font_size=16, color=DARK_NAVY, bold=True)

    services = [
        "AI業務分析・設計・開発・テスト・導入支援",
        "営業AI・採用AI・管理ダッシュボードの構築",
        "SNS採用戦略の企画・テンプレート作成",
        "補助金申請サポート",
        "月次レポート・進捗報告会",
    ]
    for i, svc in enumerate(services):
        add_text_box(slide, Inches(5.5), Inches(1.8) + Inches(i * 0.36),
                     Inches(3.8), Inches(0.35),
                     f"  {svc}", font_size=11, color=DARK_GRAY)

    # 比較テーブル部分
    add_text_box(slide, Inches(0.6), Inches(4.2), Inches(8.8), Inches(0.4),
                 "他の選択肢との比較", font_size=14, color=DARK_NAVY, bold=True)

    comparisons = [
        ("通常のシステム開発", "500万〜3,000万円", ACCENT_ORANGE),
        ("RPO（採用代行）", "年720万円", ACCENT_ORANGE),
        ("エン転職", "88万円/8週間", ACCENT_ORANGE),
        ("AI開発BPO", "240万円/6ヶ月", ACCENT_GREEN),
    ]

    for i, (label, cost, clr) in enumerate(comparisons):
        x = Inches(0.5) + Inches(i * 2.3)
        add_shape_bg(slide, x, Inches(4.65), Inches(2.1), Inches(0.7),
                     LIGHT_GRAY if i < 3 else LIGHT_BLUE)
        add_text_box(slide, x + Pt(8), Inches(4.7), Inches(2.0), Inches(0.3),
                     label, font_size=10, color=MID_GRAY)
        add_text_box(slide, x + Pt(8), Inches(4.95), Inches(2.0), Inches(0.3),
                     cost, font_size=13, color=clr, bold=True)

    if slide_data.get("speaker_notes"):
        slide.notes_slide.notes_text_frame.text = slide_data["speaker_notes"]

def create_nextsteps_slide(prs, slide_data):
    """Next Stepsスライド（p14テンプレート風）"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, DARK_NAVY)

    add_shape_bg(slide, Inches(0), Inches(0), Inches(10), Inches(0.08), ACCENT_BLUE)

    add_text_box(slide, Inches(0.6), Inches(0.4), Inches(8.8), Inches(0.6),
                 "Next Steps", font_size=28, color=WHITE, bold=True)

    bullets = slide_data.get("bullets", [])
    for i, item in enumerate(bullets):
        y = Inches(1.4) + Inches(i * 0.85)

        # ステップ番号のアクセント
        add_shape_bg(slide, Inches(0.6), y, Inches(0.5), Inches(0.5), ACCENT_BLUE)
        add_text_box(slide, Inches(0.6), y + Pt(4), Inches(0.5), Inches(0.4),
                     str(i + 1), font_size=18, color=WHITE, bold=True,
                     alignment=PP_ALIGN.CENTER)

        # テキスト
        # 番号プレフィックスを除去
        text = item
        if text and text[0].isdigit() and ". " in text[:4]:
            text = text.split(". ", 1)[1]

        add_text_box(slide, Inches(1.3), y + Pt(2), Inches(7.8), Inches(0.5),
                     text, font_size=14, color=WHITE)

    # フッター
    add_text_box(slide, Inches(0.6), Inches(6.2), Inches(8.8), Inches(0.4),
                 "建設業界のAI活用率9.4%の今だからこそ、先行者優位を確立できるタイミングです。",
                 font_size=12, color=ACCENT_BLUE, bold=True,
                 alignment=PP_ALIGN.CENTER)

    if slide_data.get("speaker_notes"):
        slide.notes_slide.notes_text_frame.text = slide_data["speaker_notes"]


def main():
    # output.json を読み込み
    with open("/home/user/agents/agents/report_builder/output.json", "r") as f:
        data = json.load(f)

    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)  # Widescreen 16:9 っぽいがデフォルトの4:3寄り

    # スライドごとに適切なレイアウトで生成
    highlight_slides = {7, 8, 10}  # 提案・コスト比較・売上インパクト

    for slide_data in data["slides"]:
        sn = slide_data["slide_number"]
        st = slide_data["slide_type"]

        if st == "title":
            create_title_slide(prs, slide_data)
        elif st == "agenda":
            create_agenda_slide(prs, slide_data)
        elif sn == 13:  # 料金プラン
            create_pricing_slide(prs, slide_data)
        elif sn == 14:  # Next Steps
            create_nextsteps_slide(prs, slide_data)
        elif sn in highlight_slides:
            create_content_slide(prs, slide_data, is_highlight=True)
        else:
            create_content_slide(prs, slide_data)

    output_path = "/home/user/agents/agents/report_builder/AI開発BPO提案書_建築工房様.pptx"
    prs.save(output_path)
    print(f"PPTX saved: {output_path}")
    print(f"Total slides: {len(prs.slides)}")

if __name__ == "__main__":
    main()
