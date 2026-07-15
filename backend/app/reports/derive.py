"""Pure presentation-layer derivations for the exported report: KPI labels,
top-5 slicing, dataset quality scoring, roadmap phase formatting.

Everything here reads already-computed fields off a completed
`MissionAnalysis` and its datasets' `DatasetProfile`s — nothing here calls
the AI, re-parses model output, or invents a number the analysis didn't
already produce. This intentionally mirrors what
`frontend/src/utils/executiveDashboard.ts` computes for the Executive
Dashboard (Ticket-017): same source data, same kind of derivation, applied
independently on the server for the export path so neither the frontend
nor the backend has to reach into the other to build its own view.
"""

import re
import statistics

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    RiskItem,
    StrategyAnalysisOutput,
)
from app.models.dataset import Dataset
from app.models.enums import AnalysisStatus, MissionPriority, RagIndexStatus
from app.rag.models import RetrievalStats
from app.reports.models import (
    ReportAgentCollaboration,
    ReportConfidenceFactor,
    ReportDatasetIntelligence,
    ReportDatasetSummary,
    ReportEvidenceGroup,
    ReportKpi,
    ReportMethodologyStep,
    ReportRagSection,
    ReportRetrievalAnalytics,
    ReportRoadmapPhase,
)

_TOP_N = 5

_RAG_INDEX_STATUS_LABELS: dict[RagIndexStatus, tuple[str, str]] = {
    RagIndexStatus.PENDING: ("Not Indexed", "neutral"),
    RagIndexStatus.INDEXING: ("Indexing", "warning"),
    RagIndexStatus.INDEXED: ("Indexed", "success"),
    RagIndexStatus.FAILED: ("Indexing Failed", "danger"),
}


def confidence_label(value: float) -> str:
    if value >= 0.8:
        return "High"
    if value >= 0.5:
        return "Moderate"
    return "Low"


def confidence_variant(value: float) -> str:
    if value >= 0.8:
        return "success"
    if value >= 0.5:
        return "warning"
    return "danger"


def severity_rank(value: str) -> int:
    normalized = value.strip().lower()
    if "critical" in normalized:
        return 4
    if "high" in normalized:
        return 3
    if "medium" in normalized or "moderate" in normalized:
        return 2
    if "low" in normalized:
        return 1
    return 0


def severity_variant(value: str) -> str:
    normalized = value.strip().lower()
    if "critical" in normalized:
        return "danger"
    if "high" in normalized:
        return "warning"
    if "medium" in normalized or "moderate" in normalized:
        return "info"
    if "low" in normalized:
        return "neutral"
    return "neutral"


def average_confidence(
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
) -> float:
    """Feeds the "AI Confidence" KPI/`decision_readiness`. Each `.confidence`
    is a server-computed, grounded score (see
    `app.services.confidence_service.apply_grounded_confidence`), not the
    model's own self-report -- it's overwritten in place before persistence,
    so every consumer here reads the grounded number automatically."""
    values = [business.confidence, strategy.confidence, risk.confidence, executive.confidence]
    return sum(values) / len(values)


def top_risks(risks: list[RiskItem], limit: int = _TOP_N) -> list[RiskItem]:
    return sorted(risks, key=lambda risk: severity_rank(risk.severity), reverse=True)[:limit]


def top_recommendations(strategy: StrategyAnalysisOutput, limit: int = _TOP_N) -> list[str]:
    return strategy.recommended_initiatives[:limit]


_PHASE_PREFIX_RE = re.compile(r"^\s*phase\s+(\d+)\s*[:\-—]?\s*(.*)$", re.IGNORECASE)


def parse_roadmap(items: list[str]) -> list[ReportRoadmapPhase]:
    """Turns `implementation_roadmap` strings into labeled phase cards. If
    an item already starts with "Phase N: ..." (the strategy prompt
    encourages this), that number and the remaining text are reused as-is;
    otherwise it's numbered by its position in the list. Text formatting
    only -- the roadmap's content and order are never changed."""
    phases = []
    for index, item in enumerate(items):
        match = _PHASE_PREFIX_RE.match(item)
        if match and match.group(2):
            phases.append(
                ReportRoadmapPhase(label=f"Phase {match.group(1)}", description=match.group(2))
            )
        else:
            phases.append(ReportRoadmapPhase(label=f"Phase {index + 1}", description=item))
    return phases


def _dataset_quality(datasets: list[Dataset]) -> tuple[int, str, str]:
    """Same completeness-minus-duplicate-rate scoring
    `computeDatasetQuality` uses on the frontend, applied here to the same
    `DatasetProfile` fields."""
    profiled = [d for d in datasets if d.profile is not None]
    if not profiled:
        return 0, "Unknown", "neutral"

    total_cells = missing_cells = total_rows = duplicate_rows = 0
    for dataset in profiled:
        profile = dataset.profile
        total_cells += profile.row_count * profile.column_count
        missing_cells += sum(profile.missing_values.values())
        total_rows += profile.row_count
        duplicate_rows += profile.duplicate_row_count

    completeness = 1.0 if total_cells == 0 else 1 - missing_cells / total_cells
    duplicate_rate = 0.0 if total_rows == 0 else duplicate_rows / total_rows
    score = max(0.0, min(1.0, completeness - duplicate_rate * 0.5))
    percent = round(score * 100)

    if percent >= 90:
        return percent, "Excellent", "success"
    if percent >= 75:
        return percent, "Good", "info"
    if percent >= 50:
        return percent, "Fair", "warning"
    return percent, "Poor", "danger"


_VALIDATION_LABELS: dict[str, tuple[str, str]] = {
    "ready": ("Validated", "success"),
    "validating": ("Validating", "warning"),
    "uploaded": ("Uploaded", "neutral"),
    "failed": ("Validation Failed", "danger"),
}


def build_dataset_summaries(datasets: list[Dataset]) -> list[ReportDatasetSummary]:
    summaries = []
    for dataset in datasets:
        label, variant = _VALIDATION_LABELS.get(dataset.upload_status.value, ("Unknown", "neutral"))
        profile = dataset.profile
        if profile is None:
            summaries.append(
                ReportDatasetSummary(
                    filename=dataset.original_filename,
                    row_count=0,
                    column_count=0,
                    missing_value_count=0,
                    duplicate_row_count=0,
                    validation_status_label=label,
                    validation_status_variant=variant,
                    numeric_column_count=0,
                    categorical_column_count=0,
                    date_column_count=0,
                    quality_percent=0,
                    quality_label="Unknown",
                    quality_variant="neutral",
                )
            )
            continue

        quality_percent, quality_label, quality_variant = _dataset_quality([dataset])
        summaries.append(
            ReportDatasetSummary(
                filename=dataset.original_filename,
                row_count=profile.row_count,
                column_count=profile.column_count,
                missing_value_count=sum(profile.missing_values.values()),
                duplicate_row_count=profile.duplicate_row_count,
                validation_status_label=label,
                validation_status_variant=variant,
                numeric_column_count=sum(
                    1 for c in profile.columns if c.get("category") == "numeric"
                ),
                categorical_column_count=sum(
                    1 for c in profile.columns if c.get("category") == "categorical"
                ),
                date_column_count=sum(1 for c in profile.columns if c.get("category") == "date"),
                quality_percent=quality_percent,
                quality_label=quality_label,
                quality_variant=quality_variant,
            )
        )
    return summaries


def dataset_column_breakdown(datasets: list[Dataset]) -> list[tuple[str, str, int]]:
    """Aggregate numeric/categorical/date column counts across every
    dataset used in the analysis -- the same aggregation
    `DatasetSummaryChart` performs on the frontend. Returns
    (category_key, label, count) triples, filtered to non-zero counts, in a
    fixed category order -- the key is kept alongside the label so the
    caller can look up each slice's color by category rather than by list
    position (which shifts whenever a category is empty and dropped)."""
    counts = {"numeric": 0, "categorical": 0, "date": 0}
    for dataset in datasets:
        if dataset.profile is None:
            continue
        for column in dataset.profile.columns:
            category = column.get("category")
            if category in counts:
                counts[category] += 1
    labels = {"numeric": "Numeric", "categorical": "Categorical", "date": "Date"}
    return [(key, labels[key], value) for key, value in counts.items() if value > 0]


def risk_category_breakdown(risks: list[RiskItem]) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for risk in risks:
        counts[risk.category] = counts.get(risk.category, 0) + 1
    return list(counts.items())


_PRIORITY_VARIANTS: dict[MissionPriority, str] = {
    MissionPriority.LOW: "neutral",
    MissionPriority.MEDIUM: "info",
    MissionPriority.HIGH: "warning",
    MissionPriority.CRITICAL: "danger",
}


def build_kpis(
    *,
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
    mission_priority: MissionPriority,
    business_domain: str,
    datasets: list[Dataset],
) -> list[ReportKpi]:
    # "Business Health" and "AI Confidence" below both read `.confidence` --
    # a server-computed, grounded score (see
    # `app.services.confidence_service.apply_grounded_confidence`), not the
    # model's free-form self-report, since a number the model can't
    # actually ground was actively misleading as a dashboard metric.
    ai_confidence = average_confidence(business, strategy, risk, executive)
    quality_percent, quality_label, quality_variant = _dataset_quality(datasets)
    priority_label = mission_priority.value.capitalize()

    return [
        ReportKpi(
            label="Business Health",
            value=f"{round(business.confidence * 100)}%",
            badge_label=confidence_label(business.confidence),
            variant=confidence_variant(business.confidence),
            caption="Business analysis confidence",
        ),
        ReportKpi(
            label="AI Confidence",
            value=f"{round(ai_confidence * 100)}%",
            badge_label=confidence_label(ai_confidence),
            variant=confidence_variant(ai_confidence),
            caption="Average across all four analyses",
        ),
        ReportKpi(
            label="Overall Risk Level",
            value=risk.overall_risk_level.capitalize(),
            badge_label=f"{len(risk.critical_risks)} risks",
            variant=severity_variant(risk.overall_risk_level),
            caption="Overall assessed risk",
        ),
        ReportKpi(
            label="Dataset Quality",
            value=f"{quality_percent}%",
            badge_label=quality_label,
            variant=quality_variant,
            caption=f"{len(datasets)} dataset(s) validated",
        ),
        ReportKpi(
            label="Mission Priority",
            value=priority_label,
            badge_label=priority_label,
            variant=_PRIORITY_VARIANTS.get(mission_priority, "neutral"),
            caption="Assigned mission priority",
        ),
        ReportKpi(
            label="Business Domain",
            value=business_domain,
            badge_label=business_domain,
            variant="primary",
            caption="Mission's business domain",
        ),
    ]


def biggest_opportunity(business: BusinessAnalysisOutput) -> str:
    return business.key_opportunities[0] if business.key_opportunities else "Not identified."


def highest_risk_summary(risk: RiskAnalysisOutput) -> str:
    top = top_risks(risk.critical_risks, limit=1)
    if not top:
        return "No critical risks identified."
    item = top[0]
    return f"{item.title} ({item.severity} severity)"


# ---------------------------------------------------------------------------
# Retrieval-Augmented Generation additions
# ---------------------------------------------------------------------------

_AGENT_ROLES: list[tuple[str, str]] = [
    ("Business Agent", "Business Analyst — interprets mission context and dataset profile"),
    ("Strategy Agent", "Strategic Planner — builds objectives, initiatives, and roadmap"),
    ("Risk Agent", "Risk Analyst — identifies risks, assumptions, and mitigations"),
    ("Executive Agent", "Executive Synthesizer — integrates every prior agent's findings"),
]


def _dataset_completeness_percent(datasets: list[Dataset]) -> int:
    """Completeness only (no duplicate-row penalty) — a distinct signal
    from the blended `_dataset_quality` score, shown as its own confidence
    factor."""
    profiled = [d for d in datasets if d.profile is not None]
    if not profiled:
        return 0
    total_cells = missing_cells = 0
    for dataset in profiled:
        profile = dataset.profile
        total_cells += profile.row_count * profile.column_count
        missing_cells += sum(profile.missing_values.values())
    completeness = 1.0 if total_cells == 0 else 1 - missing_cells / total_cells
    return round(max(0.0, min(1.0, completeness)) * 100)


def _agent_agreement_percent(
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
) -> int:
    """How closely the four agents' independent confidence scores agree —
    100% when identical, decreasing as they spread apart. A real statistic
    over the four real confidence values, not an invented number. Now that
    `.confidence` is a grounded, server-computed score rather than the
    model's free-form self-report (see `app.services.confidence_service`),
    this spread reflects genuine differences in how well-supported each
    stage's own evidence was, not just how the model happened to phrase its
    self-assessment four separate times."""
    values = [business.confidence, strategy.confidence, risk.confidence, executive.confidence]
    spread = statistics.pstdev(values)
    # A spread of 0.25 (e.g. confidences ranging from ~0.55 to ~0.95) is
    # treated as "no agreement" (0%); scales linearly from there.
    return round(max(0.0, min(1.0, 1 - spread / 0.25)) * 100)


def evidence_coverage_percent(
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
) -> int:
    """Share of the four agents that cited at least one piece of retrieved
    evidence in their own `evidence_used` output."""
    outputs = [business, strategy, risk, executive]
    with_evidence = sum(1 for output in outputs if output.evidence_used)
    return round((with_evidence / len(outputs)) * 100)


def build_confidence_factors(
    *,
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
    datasets: list[Dataset],
    retrieval_stats: RetrievalStats | None,
    analysis_status: AnalysisStatus,
) -> list[ReportConfidenceFactor]:
    """Decomposes the single "AI Confidence" percentage into the real
    signals that feed a well-grounded analysis — every value here is
    computed from data the analysis actually produced, not invented to fill
    out the list. These largely mirror the same real signals
    `app.services.confidence_service.compute_agent_confidence` itself
    weighs when computing each agent's `.confidence` (dataset
    completeness, retrieved-evidence quality, evidence coverage) --
    presented here as an independent, per-signal breakdown rather than
    recomputed from the grounded score, so this section explains *why* AI
    Confidence is what it is instead of just restating it."""
    quality_percent, _label, _variant = _dataset_quality(datasets)
    agreement_percent = _agent_agreement_percent(business, strategy, risk, executive)
    coverage_percent = evidence_coverage_percent(business, strategy, risk, executive)
    completeness_percent = _dataset_completeness_percent(datasets)

    factors = [
        ReportConfidenceFactor(
            label="Dataset Quality",
            value_percent=quality_percent,
            variant=confidence_variant(quality_percent / 100),
            description="Completeness and duplication across every dataset used in this analysis.",
        ),
        ReportConfidenceFactor(
            label="Agent Agreement",
            value_percent=agreement_percent,
            variant=confidence_variant(agreement_percent / 100),
            description="How closely the four agents' independent confidence scores align.",
        ),
        ReportConfidenceFactor(
            label="Retrieved Evidence Coverage",
            value_percent=coverage_percent,
            variant=confidence_variant(coverage_percent / 100),
            description="Share of agents that grounded findings in retrieved dataset evidence.",
        ),
        ReportConfidenceFactor(
            label="Dataset Completeness",
            value_percent=completeness_percent,
            variant=confidence_variant(completeness_percent / 100),
            description="Share of non-missing values across every dataset cell analyzed.",
        ),
    ]

    if retrieval_stats is not None and retrieval_stats.average_similarity_score is not None:
        similarity_percent = round(
            max(0.0, min(1.0, retrieval_stats.average_similarity_score)) * 100
        )
        factors.append(
            ReportConfidenceFactor(
                label="RAG Retrieval Consistency",
                value_percent=similarity_percent,
                variant=confidence_variant(similarity_percent / 100),
                description=(
                    "Average semantic similarity of the evidence retrieved for this analysis."
                ),
            )
        )

    factors.append(
        ReportConfidenceFactor(
            label="Business Rule Validation",
            value_percent=100 if analysis_status == AnalysisStatus.COMPLETED else 0,
            variant="success" if analysis_status == AnalysisStatus.COMPLETED else "danger",
            description="Every agent's output passed strict schema validation before being stored.",
        )
    )

    return factors


def build_evidence_groups(
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
) -> list[ReportEvidenceGroup]:
    """One group per agent that actually cited retrieved evidence — an
    agent with an empty `evidence_used` list is omitted entirely rather
    than shown with a "no evidence" placeholder, per "gracefully hide
    unavailable fields." Evidence text is rendered exactly as each agent
    wrote it — never regenerated or re-derived here."""
    outputs = [business, strategy, risk, executive]
    groups = []
    for (name, role), output in zip(_AGENT_ROLES, outputs, strict=True):
        if output.evidence_used:
            groups.append(
                ReportEvidenceGroup(agent_name=name, agent_role=role, evidence=output.evidence_used)
            )
    return groups


def build_methodology_steps() -> list[ReportMethodologyStep]:
    """Describes MissionOS's fixed analysis architecture (see `app.rag` and
    `app.ai`) — the same stages every mission's analysis actually passes
    through, in order. Static per report: a description of how the system
    works, not a per-mission measurement."""
    return [
        ReportMethodologyStep(
            label="Dataset Upload",
            description="User uploads CSV, XLSX, or JSON files to a mission.",
        ),
        ReportMethodologyStep(
            label="Validation",
            description=(
                "Files are parsed, encoding/delimiter detected, and structurally validated."
            ),
        ),
        ReportMethodologyStep(
            label="Dataset Profiling",
            description=(
                "Row/column counts, types, missing values, and summary statistics computed."
            ),
        ),
        ReportMethodologyStep(
            label="Chunk Generation",
            description="Validated data is split into row-aligned, schema-aware text chunks.",
        ),
        ReportMethodologyStep(
            label="OpenAI Embeddings",
            description=(
                "Each chunk is converted into a vector embedding via the OpenAI Embeddings API."
            ),
        ),
        ReportMethodologyStep(
            label="Vector Database (ChromaDB)",
            description="Embeddings are persisted in a per-mission ChromaDB collection.",
        ),
        ReportMethodologyStep(
            label="Semantic Retrieval",
            description=(
                "The mission's objective is embedded and matched against the collection "
                "for the most relevant chunks."
            ),
        ),
        ReportMethodologyStep(
            label="Shared Context",
            description=(
                "Retrieved evidence is assembled once and shared across every downstream agent."
            ),
        ),
        ReportMethodologyStep(
            label="Business Agent",
            description="Interprets the business problem, opportunities, and metrics.",
        ),
        ReportMethodologyStep(
            label="Strategy Agent",
            description="Builds strategic objectives, initiatives, and an implementation roadmap.",
        ),
        ReportMethodologyStep(
            label="Risk Agent",
            description="Identifies risks, assumptions, and mitigations.",
        ),
        ReportMethodologyStep(
            label="Executive Agent",
            description="Synthesizes all prior findings into a decision-ready summary.",
        ),
        ReportMethodologyStep(
            label="Executive Report",
            description="Every stage's output is assembled into this report.",
        ),
    ]


def build_rag_section(
    datasets: list[Dataset], retrieval_stats: RetrievalStats | None
) -> ReportRagSection | None:
    """Assembled entirely from `DatasetIndex` rows already persisted per
    dataset and the `RetrievalStats` snapshot captured for this specific
    analysis run. Returns `None` only when there is truly nothing to show
    (no dataset has ever been indexed and no retrieval was attempted) — the
    template omits the whole section in that case rather than rendering an
    empty shell."""
    indexes = [dataset.index for dataset in datasets if dataset.index is not None]
    if not indexes and retrieval_stats is None:
        return None

    total_chunks = sum(index.chunk_count for index in indexes)
    embedding_models = {index.embedding_model for index in indexes if index.embedding_model}
    embedding_model = (
        next(iter(embedding_models)) if len(embedding_models) == 1 else None
    ) or (retrieval_stats.embedding_model if retrieval_stats else None)

    if any(index.status == RagIndexStatus.FAILED for index in indexes):
        status_label, status_variant = "Partially Indexed", "warning"
    elif indexes and all(index.status == RagIndexStatus.INDEXED for index in indexes):
        status_label, status_variant = "Fully Indexed", "success"
    elif any(
        index.status in (RagIndexStatus.PENDING, RagIndexStatus.INDEXING) for index in indexes
    ):
        status_label, status_variant = "Indexing In Progress", "warning"
    else:
        status_label, status_variant = "Not Indexed", "neutral"

    indexed_ats = [index.indexed_at for index in indexes if index.indexed_at is not None]
    last_indexed = max(indexed_ats) if indexed_ats else None

    return ReportRagSection(
        embedding_model=embedding_model,
        vector_store=retrieval_stats.vector_store if retrieval_stats else "ChromaDB",
        retrieval_strategy="Semantic similarity search over per-mission vector collections",
        total_chunks_indexed=total_chunks,
        chunks_retrieved=retrieval_stats.chunks_retrieved if retrieval_stats else None,
        top_k=retrieval_stats.top_k if retrieval_stats else None,
        average_similarity_score=(
            retrieval_stats.average_similarity_score if retrieval_stats else None
        ),
        retrieval_time_ms=retrieval_stats.retrieval_time_ms if retrieval_stats else None,
        index_status_label=status_label,
        index_status_variant=status_variant,
        last_indexed=last_indexed,
        knowledge_base_sources=sorted(
            {dataset.original_filename for dataset in datasets if dataset.index is not None}
        ),
        retrieval_query=retrieval_stats.query if retrieval_stats else None,
    )


def build_retrieval_analytics(
    retrieval_stats: RetrievalStats | None, datasets: list[Dataset]
) -> ReportRetrievalAnalytics | None:
    """A pure metrics readout of every retrieval call made for this analysis
    run, combined (see `mission_analysis_service._combine_retrieval_stats`).
    Returns `None` when no retrieval was ever attempted (no analysis has run
    yet) — the template omits the whole section rather than showing an
    all-"Not Available" shell. Once an analysis has run, individual fields
    still fall back to `None` (rendered as "Not Available") if that specific
    value was never captured, e.g. `context_size_chars` on an analysis
    persisted before that field existed."""
    if retrieval_stats is None:
        return None

    indexed_documents = sum(1 for dataset in datasets if dataset.index is not None)

    return ReportRetrievalAnalytics(
        retrieval_latency_ms=retrieval_stats.retrieval_time_ms,
        # One query embedding and one vector search per retrieval call this
        # run made (see `app.ai.orchestrator.AnalysisOrchestrator.run`) --
        # `query_count` is the genuine count `RetrievalStats` combined from,
        # not a structural constant (retrieval now happens per agent stage,
        # not once shared across all four).
        query_count=retrieval_stats.query_count,
        embedding_requests=retrieval_stats.query_count,
        retrieved_chunks=retrieval_stats.chunks_retrieved,
        average_similarity_score=retrieval_stats.average_similarity_score,
        context_size_chars=retrieval_stats.total_context_chars,
        indexed_documents=indexed_documents if indexed_documents > 0 else None,
    )


# Stage keys `RetrievalStats.per_agent_chunks` is keyed by (see
# `app.ai.orchestrator.OrchestratorRun.chunks_retrieved_by_stage`), in the
# same Business/Strategy/Risk/Executive order as `_AGENT_ROLES`.
_AGENT_STAGE_KEYS = ["business", "strategy", "risk", "executive"]


def build_agent_collaboration(
    *,
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
    retrieval_stats: RetrievalStats | None,
) -> list[ReportAgentCollaboration]:
    """One card per agent — confidence and evidence counts come straight
    from that agent's own stored output. `chunks_retrieved` is that agent's
    own genuine count (each stage retrieves independently with its own
    query, see `app.ai.orchestrator.AnalysisOrchestrator.run`), sourced from
    `retrieval_stats.per_agent_chunks`. Falls back to the same shared total
    on every card for analyses persisted before per-agent retrieval existed
    (when `per_agent_chunks` wasn't captured) — preserves exactly what those
    older reports already showed, rather than turning accurate old numbers
    into "Not Available"."""
    outputs = [business, strategy, risk, executive]
    per_agent_chunks = retrieval_stats.per_agent_chunks if retrieval_stats else {}
    shared_total = retrieval_stats.chunks_retrieved if retrieval_stats else None
    return [
        ReportAgentCollaboration(
            name=name,
            role=role,
            confidence_percent=round(output.confidence * 100),
            confidence_variant=confidence_variant(output.confidence),
            evidence_count=len(output.evidence_used),
            evidence=output.evidence_used,
            chunks_retrieved=per_agent_chunks.get(stage_key, shared_total),
            status_label="Complete",
            status_variant="success",
        )
        for (name, role), stage_key, output in zip(
            _AGENT_ROLES, _AGENT_STAGE_KEYS, outputs, strict=True
        )
    ]


def build_dataset_intelligence(datasets: list[Dataset]) -> list[ReportDatasetIntelligence]:
    """Technical metadata per dataset, combining its `DatasetProfile` (rows,
    columns, missing values, duplicates) with its `DatasetIndex` (chunk
    count, embedding model, indexing status) — the exact fields each already
    stores, placed side by side."""
    entries = []
    for dataset in datasets:
        profile = dataset.profile
        index = dataset.index

        status_label, status_variant = (
            _RAG_INDEX_STATUS_LABELS.get(index.status, ("Unknown", "neutral"))
            if index is not None
            else ("Not Indexed", "neutral")
        )
        quality_percent, quality_label, quality_variant = _dataset_quality([dataset])

        entries.append(
            ReportDatasetIntelligence(
                filename=dataset.original_filename,
                row_count=profile.row_count if profile else 0,
                column_count=profile.column_count if profile else 0,
                missing_value_count=sum(profile.missing_values.values()) if profile else 0,
                duplicate_row_count=profile.duplicate_row_count if profile else 0,
                chunk_count=index.chunk_count if index else None,
                total_vectors=index.chunk_count if index else None,
                embedding_model=index.embedding_model if index else None,
                index_status_label=status_label,
                index_status_variant=status_variant,
                indexed_at=index.indexed_at if index else None,
                retrieval_ready=index is not None and index.status == RagIndexStatus.INDEXED,
                health_percent=quality_percent,
                health_label=quality_label,
                health_variant=quality_variant,
            )
        )
    return entries


def decision_readiness(ai_confidence: float) -> tuple[str, str]:
    if ai_confidence >= 0.8:
        return "Ready for Decision", "success"
    if ai_confidence >= 0.5:
        return "Ready with Caveats", "warning"
    return "Needs Further Review", "danger"


def build_confidence_explanation(
    factors: list[ReportConfidenceFactor], ai_confidence: float
) -> str:
    """A one-line explanation naming the strongest real contributor to the
    overall AI Confidence score, so the number isn't presented as a black
    box — the full breakdown lives in the Confidence Breakdown section."""
    if not factors:
        return f"{round(ai_confidence * 100)}% overall confidence."
    strongest = max(factors, key=lambda factor: factor.value_percent)
    return (
        f"{round(ai_confidence * 100)}% overall confidence, driven primarily by "
        f"{strongest.label.lower()} ({strongest.value_percent}%)."
    )


def build_retrieved_knowledge_summary(rag: ReportRagSection | None) -> str:
    if rag is None:
        return "No indexed knowledge base was available for this analysis."
    if rag.chunks_retrieved is None:
        return f"{rag.total_chunks_indexed} chunks indexed across this mission's datasets."
    source_count = len(rag.knowledge_base_sources)
    return (
        f"{rag.chunks_retrieved} of {rag.total_chunks_indexed} indexed chunks retrieved "
        f"from {source_count} dataset{'s' if source_count != 1 else ''}."
    )


def build_badges(
    rag: ReportRagSection | None, evidence_groups: list[ReportEvidenceGroup]
) -> list[str]:
    """Only includes a badge when the technology it names was genuinely
    used for this specific mission's analysis — e.g. no "ChromaDB"/"Vector
    Search" badges if nothing was ever indexed, and no "Grounded AI" badge
    unless some agent actually cited retrieved evidence."""
    badges = ["Enterprise AI", "Multi-Agent", "Data Driven"]
    if rag is not None and rag.total_chunks_indexed > 0:
        badges.extend(
            [
                "Retrieval-Augmented Generation",
                "Vector Search",
                "OpenAI Embeddings",
                "ChromaDB",
                "Semantic Search",
            ]
        )
    if evidence_groups:
        badges.append("Grounded AI")
    return badges
