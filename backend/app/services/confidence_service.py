"""Computes a per-agent confidence score from concrete, grounded signals —
replacing the model's free-form self-reported `confidence` field, which in
production has been observed to sit flatly around ~0.85 across every agent
and every mission, because the prompt only ever asks the model to
self-report "a number reflecting your confidence" with nothing concrete to
compute it from.

Every signal used here comes from data the pipeline already produced:
whether `computed_insights` (see `app.services.dataset_insights_service`)
exists and is topically relevant to the mission's stated problem, how
similar this specific agent's own retrieved evidence was (see
`app.ai.orchestrator`), how complete the underlying dataset is, and whether
the agent actually cited evidence when it had material available to cite.

DECISION: a failed/never-attempted retrieval is scored as the *worst*
retrieval-quality outcome (0.0), not omitted as "no signal, stay neutral."
An earlier version omitted it, on the theory that a signal that doesn't
apply shouldn't be guessed at -- but that let a stage whose retrieval
failed outright score *higher* than a stage that retrieved something and
honestly got a low similarity score, since the failed stage simply dropped
that axis from its average instead of being penalized on it. On a dashboard
literally labeled "AI Confidence," rewarding an outage over an honest weak
result is the wrong intuition to ship, so "no evidence" is treated as no
better than the worst "evidence, but weak" case, never better.
"""

import re

from app.ai.models import AnalysisRequest, AnalysisResult, DatasetContext, MissionContext
from app.ai.orchestrator import OrchestratorRun

_INSIGHTS_RELEVANCE_WEIGHT = 0.3
_RETRIEVAL_QUALITY_WEIGHT = 0.3
_DATASET_COMPLETENESS_WEIGHT = 0.2
_EVIDENCE_COVERAGE_WEIGHT = 0.2

_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "is", "are", "by", "this", "that", "as", "at", "it", "its", "from",
    "be", "will", "can", "which", "our", "we", "into", "than", "then",
    "these", "those", "their", "your", "you", "how", "what", "when",
}  # fmt: skip


def _significant_terms(text: str) -> set[str]:
    """Lowercased alphanumeric tokens with stopwords and very short words
    removed -- a simple, defensible proxy for "the topic this text is
    about" without pulling in an NLP dependency."""
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {word for word in words if len(word) > 3 and word not in _STOPWORDS}


def _computed_insights_relevance(datasets: list[DatasetContext], mission: MissionContext) -> float:
    """1.0 if at least one dataset has non-empty `computed_insights` whose
    group/metric column names share a term with the mission's problem
    statement/objective; 0.5 if `computed_insights` exists but none of its
    column names obviously relate (the keyword heuristic is coarse enough
    that a real relevant match can still be missed, so this doesn't zero
    out an otherwise-real signal); 0.0 if no dataset has any
    `computed_insights` at all."""
    mission_terms = _significant_terms(f"{mission.problem_statement} {mission.objective}")

    any_insights = False
    any_relevant = False
    for dataset in datasets:
        insights = dataset.computed_insights or {}
        group_insights = insights.get("group_insights", [])
        correlations = insights.get("correlations", [])
        if not group_insights and not correlations:
            continue
        any_insights = True

        column_names: set[str] = set()
        for group in group_insights:
            column_names.add(str(group.get("group_column", "")))
            column_names.add(str(group.get("metric_column", "")))
        for correlation in correlations:
            column_names.add(str(correlation.get("metric_column", "")))

        if _significant_terms(" ".join(column_names)) & mission_terms:
            any_relevant = True

    if not any_insights:
        return 0.0
    return 1.0 if any_relevant else 0.5


def _dataset_completeness(datasets: list[DatasetContext]) -> float:
    """Share of non-missing cells across every attached dataset. Mirrors
    `app.reports.derive._dataset_completeness_percent`'s measure, but
    computed from `DatasetContext` (available inside the pipeline, before
    persistence) rather than the ORM `Dataset`/`DatasetProfile` (only
    available later, at report-generation time)."""
    total_cells = missing_cells = 0
    for dataset in datasets:
        total_cells += dataset.row_count * dataset.column_count
        missing_cells += sum(column.missing_count for column in dataset.columns)
    if total_cells == 0:
        return 0.0
    return max(0.0, min(1.0, 1 - missing_cells / total_cells))


def compute_agent_confidence(
    *,
    mission: MissionContext,
    datasets: list[DatasetContext],
    evidence_used: list[str],
    retrieved_chunk_count: int,
    retrieval_similarity: float | None,
) -> float:
    """Computes one agent's grounded confidence score in [0, 1] as a
    weighted average of four signals:

    - `computed_insights` relevance to the mission (shared across every
      agent -- the dataset context is the same for all four stages).
    - This agent's own retrieved-evidence similarity (`retrieval_similarity`,
      from that agent's own retrieval call -- see `app.ai.orchestrator`).
      Low similarity pulls confidence down; a failed or never-attempted
      retrieval (`None`) scores as the *worst* case (0.0) on this axis, not
      a neutral omission -- see the module docstring for why "no evidence"
      must not score better than "evidence, but weak."
    - Dataset completeness -- heavy missingness across the datasets actually
      used reduces confidence.
    - Evidence coverage -- whether `evidence_used` is non-empty when this
      agent had `computed_insights` or retrieved chunks available to cite.
      Skipped entirely if nothing was available to cite at all, since an
      empty `evidence_used` isn't a mark against the agent in that case
      (this one *is* a genuine "doesn't apply" omission, unlike retrieval
      quality above -- there's no analogous "worst case" for a citation
      opportunity that never existed).
    """
    insights_relevance = _computed_insights_relevance(datasets, mission)
    retrieval_quality = (
        max(0.0, min(1.0, retrieval_similarity)) if retrieval_similarity is not None else 0.0
    )
    components: list[tuple[float, float]] = [
        (insights_relevance, _INSIGHTS_RELEVANCE_WEIGHT),
        (retrieval_quality, _RETRIEVAL_QUALITY_WEIGHT),
        (_dataset_completeness(datasets), _DATASET_COMPLETENESS_WEIGHT),
    ]

    has_citable_material = retrieved_chunk_count > 0 or insights_relevance > 0
    if has_citable_material:
        components.append((1.0 if evidence_used else 0.0, _EVIDENCE_COVERAGE_WEIGHT))

    # The first three components above are unconditional, so `components`
    # always has at least those -- no "nothing available at all" fallback
    # needed; with zero datasets and no retrieval, all three correctly
    # evaluate to 0.0, an honestly-computed floor rather than a guessed
    # neutral value.
    total_weight = sum(weight for _, weight in components)
    return round(sum(value * weight for value, weight in components) / total_weight, 4)


# Maps each pipeline stage to the `AnalysisResult` field holding its output --
# the same Business/Strategy/Risk/Executive stage keys
# `OrchestratorRun.chunks_retrieved_by_stage`/`retrieval_stats_by_stage` use.
_STAGE_RESULT_FIELDS = {
    "business": "business_analysis",
    "strategy": "strategy_analysis",
    "risk": "risk_analysis",
    "executive": "executive_analysis",
}


def _executive_retrieval_similarity(run: OrchestratorRun) -> float | None:
    """Executive makes no retrieval call of its own -- it reuses the
    deduplicated union of Business/Strategy/Risk's retrieved chunks (see
    `AnalysisOrchestrator.run`), so its retrieval-quality signal is the
    chunk-count-weighted average of whichever of those three stages
    actually retrieved something, not `None` (which would just drop the
    signal for an agent that in fact inherited plenty of evidence)."""
    weighted = [
        (stats.average_similarity_score, run.chunks_retrieved_by_stage.get(stage, 0))
        for stage, stats in run.retrieval_stats_by_stage.items()
        if stage != "executive" and stats is not None and stats.average_similarity_score is not None
    ]
    total_count = sum(count for _, count in weighted)
    if not weighted or total_count == 0:
        return None
    return sum(score * count for score, count in weighted) / total_count


def apply_grounded_confidence(request: AnalysisRequest, run: OrchestratorRun) -> AnalysisResult:
    """Overwrites each agent's self-reported `confidence` with a
    server-computed, grounded score (`compute_agent_confidence`).

    DECISION (see the task this was built for): this *replaces*
    `confidence` in place rather than storing a separate
    `grounded_confidence` field alongside it. That means every existing
    consumer -- the persisted `MissionAnalysis` record, the Executive
    Report's KPIs and confidence breakdown (`app.reports.derive`), and the
    live AI Collaboration Center -- benefits automatically, with no further
    changes needed anywhere else, since a self-reported number the model
    can't actually ground is actively misleading as a dashboard metric
    otherwise. This is a product decision as much as a technical one --
    "AI Confidence" changing its meaning from "what the model claims" to
    "what the pipeline can actually support" is worth confirming
    deliberately, not just shipping silently because it was the smaller
    code change.
    """
    result = run.result
    updates: dict[str, object] = {}

    for stage, field_name in _STAGE_RESULT_FIELDS.items():
        output = getattr(result, field_name)
        if output is None:
            continue

        similarity = (
            _executive_retrieval_similarity(run)
            if stage == "executive"
            else (
                run.retrieval_stats_by_stage[stage].average_similarity_score
                if run.retrieval_stats_by_stage.get(stage) is not None
                else None
            )
        )
        confidence = compute_agent_confidence(
            mission=request.mission,
            datasets=request.datasets,
            evidence_used=output.evidence_used,
            retrieved_chunk_count=run.chunks_retrieved_by_stage.get(stage, 0),
            retrieval_similarity=similarity,
        )
        updates[field_name] = output.model_copy(update={"confidence": confidence})

    return result.model_copy(update=updates)
