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
from app.rag.models import RetrievalStats


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


class ReportMethodologyStep(BaseModel):
    """One stage of the fixed Upload -> ... -> Report pipeline, rendered as
    an enterprise workflow diagram. This describes MissionOS's actual,
    always-true architecture (see `app.rag`/`app.ai`) — static per report,
    not derived from a specific mission's data."""

    label: str
    description: str


class ReportRagSection(BaseModel):
    """Everything the "Retrieval-Augmented Generation" report section shows,
    assembled entirely from already-persisted backend state: each mission's
    `DatasetIndex` rows (chunk counts, embedding model, indexing status) and
    the `RetrievalStats` snapshot captured once per analysis run (see
    `app.rag.models.RetrievalStats`). `None` for any optional field means
    that value genuinely isn't available (e.g. no analysis has ever run, or
    nothing is indexed yet) — the template omits it rather than guessing.
    """

    embedding_model: str | None
    vector_store: str
    retrieval_strategy: str
    total_chunks_indexed: int
    chunks_retrieved: int | None
    top_k: int | None
    average_similarity_score: float | None
    retrieval_time_ms: float | None
    index_status_label: str
    index_status_variant: str
    last_indexed: datetime | None
    knowledge_base_sources: list[str]
    retrieval_query: str | None


class ReportEvidenceGroup(BaseModel):
    """One agent's cited evidence for the "Evidence Used" section — sourced
    directly from that agent's own `evidence_used` output field (see
    `app.ai.models`), never regenerated or re-derived."""

    agent_name: str
    agent_role: str
    evidence: list[str]


class ReportConfidenceFactor(BaseModel):
    label: str
    value_percent: int
    variant: str
    description: str


class ReportAgentCollaboration(BaseModel):
    name: str
    role: str
    confidence_percent: int
    confidence_variant: str
    evidence_count: int
    evidence: list[str]
    chunks_retrieved: int | None
    status_label: str
    status_variant: str


class ReportDatasetIntelligence(BaseModel):
    """Technical dataset + indexing metadata for the "Dataset Intelligence"
    section — distinct from `ReportDatasetSummary` (the pre-existing
    business-facing "Dataset Summary" table, left unchanged) even though the
    two overlap on row/column counts, since this one exists specifically to
    surface RAG indexing state the original section never showed."""

    filename: str
    row_count: int
    column_count: int
    missing_value_count: int
    duplicate_row_count: int
    chunk_count: int | None
    # Always equal to chunk_count (one vector per chunk in Chroma) — kept as
    # its own field since "Total Vectors" and "Chunk Count" are two distinct
    # labels the report shows, even though they're the same real number.
    total_vectors: int | None
    embedding_model: str | None
    index_status_label: str
    index_status_variant: str
    indexed_at: datetime | None
    retrieval_ready: bool
    health_percent: int
    health_label: str
    health_variant: str


class ReportRetrievalAnalytics(BaseModel):
    """Distinct from `ReportRagSection` (which explains RAG configuration
    and status) — this is a pure metrics readout of the one retrieval call
    made for this analysis run, sourced entirely from the persisted
    `RetrievalStats` snapshot. Every field is `None` when genuinely
    unavailable (e.g. no analysis has run) rather than guessed; the
    template renders those as "Not Available"."""

    retrieval_latency_ms: float | None
    query_count: int | None
    embedding_requests: int | None
    retrieved_chunks: int | None
    average_similarity_score: float | None
    context_size_chars: int | None
    indexed_documents: int | None


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
    analysis_id: uuid.UUID
    app_version: str
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

    # Retrieval-Augmented Generation additions — all optional/gracefully
    # empty where the underlying backend state doesn't exist yet, per
    # "never fabricate values."
    retrieval_stats: RetrievalStats | None = None
    methodology: list[ReportMethodologyStep] = Field(default_factory=list)
    rag: ReportRagSection | None = None
    evidence_groups: list[ReportEvidenceGroup] = Field(default_factory=list)
    confidence_factors: list[ReportConfidenceFactor] = Field(default_factory=list)
    agent_collaboration: list[ReportAgentCollaboration] = Field(default_factory=list)
    dataset_intelligence: list[ReportDatasetIntelligence] = Field(default_factory=list)
    retrieval_analytics: ReportRetrievalAnalytics | None = None
    badges: list[str] = Field(default_factory=list)

    # Small scalar summaries the enhanced Executive Summary section reads
    # directly, rather than re-deriving them from the lists above in Jinja.
    data_sources_used: int = 0
    evidence_coverage_percent: int = 0
    ai_methodology_summary: str = ""
    confidence_explanation: str = ""
    retrieved_knowledge_summary: str = ""
    decision_readiness_label: str = ""
    decision_readiness_variant: str = "neutral"
