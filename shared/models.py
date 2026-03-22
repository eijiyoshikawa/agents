"""Pydantic models shared across all agents for inter-agent communication."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Agent 1 output ──────────────────────────────────────────────
class MeetingMinutes(BaseModel):
    """議事録の構造化データ"""
    title: str = Field(description="会議タイトル")
    date: str = Field(description="会議日時")
    participants: list[str] = Field(default_factory=list, description="参加者")
    agenda_items: list[str] = Field(default_factory=list, description="議題一覧")
    raw_text: str = Field(description="議事録の全文テキスト")
    key_points: list[str] = Field(default_factory=list, description="重要ポイント")
    action_items: list[str] = Field(default_factory=list, description="アクションアイテム")
    client_name: str = Field(default="", description="クライアント名")
    industry: str = Field(default="", description="業界")


# ── Agent 2 output ──────────────────────────────────────────────
class Issue(BaseModel):
    """構造化されたイシュー"""
    title: str
    description: str
    category: str = Field(description="課題カテゴリ (市場/競合/顧客/内部)")
    priority: str = Field(description="high / medium / low")
    related_keywords: list[str] = Field(default_factory=list)


class StructuredIssues(BaseModel):
    """Agent 2 の出力"""
    client_name: str
    industry: str
    business_context: str = Field(description="ビジネス背景の要約")
    core_question: str = Field(description="中心的な問い")
    issues: list[Issue] = Field(default_factory=list)
    research_queries: list[str] = Field(
        default_factory=list,
        description="並列リサーチに渡す検索クエリ候補",
    )


# ── Agent 3 output ──────────────────────────────────────────────
class MarketInsight(BaseModel):
    """市場・競合・顧客の分析結果"""
    category: str = Field(description="market / competitor / benchmark / customer")
    title: str
    summary: str
    source: str = Field(default="", description="情報ソース URL or ドキュメント名")
    relevance: str = Field(default="", description="関連性の説明")


class MarketResearchResult(BaseModel):
    """Agent 3 の出力"""
    insights: list[MarketInsight] = Field(default_factory=list)
    customer_segments: list[str] = Field(default_factory=list)
    market_trends: list[str] = Field(default_factory=list)
    competitive_landscape: str = ""


# ── Agent 4 output ──────────────────────────────────────────────
class AnalogyCase(BaseModel):
    """アナロジー事例"""
    source_industry: str = Field(description="事例の業界")
    company_or_case: str
    summary: str
    transferable_insight: str = Field(description="転用可能な知見")
    source: str = ""


class AnalogyResult(BaseModel):
    """Agent 4 の出力"""
    cases: list[AnalogyCase] = Field(default_factory=list)


# ── Agent 5 output ──────────────────────────────────────────────
class StrategyOption(BaseModel):
    """戦略オプション"""
    name: str
    description: str
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    feasibility: str = Field(description="high / medium / low")
    expected_impact: str = ""


class CriticalReview(BaseModel):
    """批判的検証の結果"""
    assumption_challenged: str
    risk: str
    mitigation: str


class StrategyResult(BaseModel):
    """Agent 5 の出力"""
    recommended_strategy: str
    options: list[StrategyOption] = Field(default_factory=list)
    critical_reviews: list[CriticalReview] = Field(default_factory=list)
    redefined_issues: list[str] = Field(
        default_factory=list,
        description="批判的検証を経て再定義された課題",
    )


# ── Agent 6 output ──────────────────────────────────────────────
class ReportResult(BaseModel):
    """Agent 6 の出力"""
    slides_url: str = Field(description="Google Slides の URL")
    slide_count: int = 0
    summary: str = ""


# ── Pipeline context ────────────────────────────────────────────
class PipelineContext(BaseModel):
    """パイプライン全体で受け渡すコンテキスト"""
    meeting_minutes: MeetingMinutes | None = None
    structured_issues: StructuredIssues | None = None
    market_research: MarketResearchResult | None = None
    analogy_result: AnalogyResult | None = None
    strategy_result: StrategyResult | None = None
    report_result: ReportResult | None = None
