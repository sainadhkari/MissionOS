import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    StrategyAnalysisOutput,
)
from app.models.enums import AnalysisStatus


class MissionAnalysisResponse(BaseModel):
    """The API-facing shape of a mission's analysis. Reuses the AI module's
    own output types directly (rather than redeclaring equivalent schemas)
    so the response is genuinely typed end-to-end, not just typed as far as
    a generic dict."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mission_id: uuid.UUID
    status: AnalysisStatus
    business_analysis: BusinessAnalysisOutput | None
    strategy_analysis: StrategyAnalysisOutput | None
    risk_analysis: RiskAnalysisOutput | None
    executive_analysis: ExecutiveAnalysisOutput | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
