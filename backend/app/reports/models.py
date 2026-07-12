import enum
import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    StrategyAnalysisOutput,
)


class ReportFormat(enum.StrEnum):
    PDF = "pdf"
    HTML = "html"


class ReportMissionInfo(BaseModel):
    title: str
    business_domain: str
    objective: str


class ReportData(BaseModel):
    """Everything a report template needs, assembled once from a completed
    `MissionAnalysis`. HTML and PDF both render from this exact same model
    through the exact same template (see `html_renderer.py`), so the two
    formats can never drift from each other.
    """

    mission_id: uuid.UUID
    mission: ReportMissionInfo
    business_analysis: BusinessAnalysisOutput
    strategy_analysis: StrategyAnalysisOutput
    risk_analysis: RiskAnalysisOutput
    executive_analysis: ExecutiveAnalysisOutput
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
