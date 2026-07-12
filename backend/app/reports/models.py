import enum
import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    RiskItem,
    StrategyAnalysisOutput,
)


class ReportFormat(enum.StrEnum):
    PDF = "pdf"
    HTML = "html"


class ReportMissionInfo(BaseModel):
    title: str
    business_domain: str
    objective: str
    priority: str
    status: str


class ReportKpi(BaseModel):
    """One KPI dashboard tile. `variant` names one of the badge color
    classes defined in report.html's stylesheet (success/warning/danger/
    info/neutral/primary) — the same small vocabulary the frontend's Badge
    component uses, so the report and the Executive Dashboard read as the
    same design language even though nothing is shared at the code level."""

    label: str
    value: str
    badge_label: str
    variant: str
    caption: str


class ReportDatasetSummary(BaseModel):
    filename: str
    row_count: int
    column_count: int
    missing_value_count: int
    duplicate_row_count: int
    validation_status_label: str
    validation_status_variant: str
    numeric_column_count: int
    categorical_column_count: int
    date_column_count: int
    quality_percent: int
    quality_label: str
    quality_variant: str


class ReportRoadmapPhase(BaseModel):
    label: str
    description: str


class ReportCharts(BaseModel):
    """Fully-rendered, self-contained SVG chart images (as `data:` URIs),
    built once in `ReportService` from the same analysis/profile data every
    other section reads — the template only places them, it never computes
    chart data itself. See `app/reports/charts.py`."""

    business_breakdown: str
    risk_categories: str
    dataset_summary: str


class ReportData(BaseModel):
    """Everything a report template needs, assembled once from a completed
    `MissionAnalysis`. HTML and PDF both render from this exact same model
    through the exact same template (see `html_renderer.py`), so the two
    formats can never drift from each other.
    """

    mission_id: uuid.UUID
    mission: ReportMissionInfo
    analysis_status: str
    business_analysis: BusinessAnalysisOutput
    strategy_analysis: StrategyAnalysisOutput
    risk_analysis: RiskAnalysisOutput
    executive_analysis: ExecutiveAnalysisOutput
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    kpis: list[ReportKpi]
    datasets: list[ReportDatasetSummary]
    charts: ReportCharts
    top_recommendations: list[str]
    top_risks: list[RiskItem]
    roadmap: list[ReportRoadmapPhase]
    biggest_opportunity: str
    highest_risk_summary: str
