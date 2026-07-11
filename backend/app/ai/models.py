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


class BusinessAnalysisOutput(BaseModel):
    """The strict JSON shape `prompts/business.md` requires the model to
    return. Lives here (not in `agents/business_agent.py`) because later
    stages — Strategy first, eventually others — consume it directly as
    structured input, not just as a summary string."""

    business_problem: str
    key_opportunities: list[str]
    important_metrics: list[str]
    recommended_next_steps: list[str]
    confidence: float = Field(ge=0.0, le=1.0)


class StrategyAnalysisOutput(BaseModel):
    """The strict JSON shape `prompts/strategy.md` requires the model to
    return. Lives here for the same reason as `BusinessAnalysisOutput`."""

    strategic_objectives: list[str]
    recommended_initiatives: list[str]
    implementation_roadmap: list[str]
    kpis: list[str]
    business_impact: str
    priority: str = Field(min_length=1)
    confidence: float = Field(ge=0.0, le=1.0)


class RiskItem(BaseModel):
    title: str = Field(min_length=1)
    category: str = Field(min_length=1)
    severity: str = Field(min_length=1)
    probability: str = Field(min_length=1)
    impact: str = Field(min_length=1)
    mitigation: str = Field(min_length=1)


class RiskAnalysisOutput(BaseModel):
    """The strict JSON shape `prompts/risk_v1.md` requires the model to
    return. Lives here for the same reason as `BusinessAnalysisOutput` and
    `StrategyAnalysisOutput`."""

    critical_risks: list[RiskItem]
    assumptions: list[str]
    recommended_mitigations: list[str]
    overall_risk_level: str = Field(min_length=1)
    confidence: float = Field(ge=0.0, le=1.0)


class ExecutiveAnalysisOutput(BaseModel):
    """The strict JSON shape `prompts/executive_v1.md` requires the model to
    return. Lives here for the same reason as the other three agent outputs.
    Distinct from `ExecutiveReport` below: this is the Executive *Agent's*
    structured output threaded through the pipeline like every other stage;
    `ExecutiveReport` is a separate, still-unbuilt, further-polished artifact
    a later capability would generate from a completed `AnalysisResult`."""

    executive_summary: str = Field(min_length=1)
    key_findings: list[str]
    trade_offs: list[str]
    final_recommendation: str = Field(min_length=1)
    confidence: float = Field(ge=0.0, le=1.0)


class AnalysisResult(BaseModel):
    """Accumulates each agent's contribution as the pipeline runs. Every
    stage receives the `AnalysisResult` produced by the stage before it and
    returns an updated copy — the orchestrator returns the final,
    fully-populated instance once the Executive Agent stage completes.
    """

    mission_id: uuid.UUID
    business_analysis: BusinessAnalysisOutput | None = None
    strategy_analysis: StrategyAnalysisOutput | None = None
    risk_analysis: RiskAnalysisOutput | None = None
    executive_analysis: ExecutiveAnalysisOutput | None = None
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
