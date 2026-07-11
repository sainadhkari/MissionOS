import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class AgentName(enum.StrEnum):
    BUSINESS = "business"
    STRATEGY = "strategy"
    RISK = "risk"
    EXECUTIVE = "executive"


class MissionContext(BaseModel):
    """A read-only snapshot of a Mission, shaped for AI consumption —
    deliberately independent of `app.models.Mission` / `app.schemas.mission`
    so this package never has to know how the rest of the app persists or
    serves mission data."""

    mission_id: uuid.UUID
    title: str
    business_domain: str
    priority: str
    problem_statement: str
    objective: str
    expected_output: str
    status: str


class DatasetColumnSummary(BaseModel):
    name: str
    dtype: str
    category: str
    missing_count: int


class DatasetContext(BaseModel):
    """A read-only snapshot of a validated Dataset + its profile, shaped for
    AI consumption — see `MissionContext` for why this doesn't reuse
    `app.schemas.dataset` directly."""

    dataset_id: uuid.UUID
    original_filename: str
    file_type: str
    row_count: int
    column_count: int
    duplicate_row_count: int = 0
    columns: list[DatasetColumnSummary] = Field(default_factory=list)
    numeric_summary: dict[str, Any] = Field(default_factory=dict)
    categorical_summary: dict[str, Any] = Field(default_factory=dict)


class AnalysisRequest(BaseModel):
    """The input to `AnalysisOrchestrator.run()`: one mission plus the
    datasets attached to it."""

    mission: MissionContext
    datasets: list[DatasetContext] = Field(default_factory=list)
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AnalysisResult(BaseModel):
    """Accumulates each agent's contribution as the pipeline runs. Every
    stage receives the `AnalysisResult` produced by the stage before it and
    returns an updated copy — the orchestrator returns the final,
    fully-populated instance once the Executive Agent stage completes.
    """

    mission_id: uuid.UUID
    business_summary: str | None = None
    strategy_summary: str | None = None
    risk_summary: str | None = None
    executive_summary: str | None = None
    completed_stages: list[AgentName] = Field(default_factory=list)
    completed_at: datetime | None = None


class ExecutiveReport(BaseModel):
    """The polished, user-facing report derived from a completed
    `AnalysisResult`. Report *generation* is out of scope for this ticket
    ("Do NOT generate reports") — this model exists now as the forward-looking
    data contract a later ticket will populate.
    """

    mission_id: uuid.UUID
    analysis_result: AnalysisResult
    title: str
    summary: str
    recommendations: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
