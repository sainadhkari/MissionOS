import uuid

from app.ai.models import (
    AnalysisRequest,
    AnalysisResult,
    BusinessAnalysisOutput,
    DatasetContext,
    ExecutiveAnalysisOutput,
    MissionContext,
    RiskAnalysisOutput,
    StrategyAnalysisOutput,
)
from app.ai.orchestrator import OrchestratorRun
from app.rag.models import RetrievalStats
from app.services.confidence_service import apply_grounded_confidence, compute_agent_confidence


def _mission(
    problem_statement: str = "Store B sales underperform the rest of the network.",
) -> MissionContext:
    return MissionContext(
        mission_id=uuid.uuid4(),
        title="Reduce Store B Underperformance",
        business_domain="Retail",
        priority="high",
        problem_statement=problem_statement,
        objective="Identify the cause and recommend fixes to close the gap.",
        expected_output="A concrete action plan.",
        status="draft",
    )


def _dataset(
    *,
    computed_insights: dict | None = None,
    row_count: int = 100,
    column_count: int = 3,
    missing_count: int = 0,
) -> DatasetContext:
    return DatasetContext(
        dataset_id=uuid.uuid4(),
        original_filename="sales.csv",
        file_type="csv",
        row_count=row_count,
        column_count=column_count,
        computed_insights=computed_insights or {},
        columns=[
            {"name": "store", "dtype": "object", "category": "categorical", "missing_count": 0},
            {
                "name": "sales",
                "dtype": "int64",
                "category": "numeric",
                "missing_count": missing_count,
            },
            {"name": "is_holiday", "dtype": "bool", "category": "numeric", "missing_count": 0},
        ],
    )


_RELEVANT_INSIGHTS = {
    "group_insights": [
        {
            "group_column": "store",
            "metric_column": "sales",
            "top_groups": [{"group": "C", "mean": 195.0, "sum": 780.0, "count": 4}],
            "bottom_groups": [{"group": "B", "mean": 22.5, "sum": 90.0, "count": 4}],
        }
    ],
    "binary_splits": [],
    "correlations": [],
    "notes": [],
}

_IRRELEVANT_INSIGHTS = {
    "group_insights": [
        {
            "group_column": "warehouse_shift",
            "metric_column": "employee_count",
            "top_groups": [{"group": "Night", "mean": 12.0, "sum": 48.0, "count": 4}],
            "bottom_groups": [{"group": "Day", "mean": 8.0, "sum": 32.0, "count": 4}],
        }
    ],
    "binary_splits": [],
    "correlations": [],
    "notes": [],
}


def test_strong_signals_produce_high_confidence():
    confidence = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS, missing_count=0)],
        evidence_used=["Store B averages 22.5 vs Store C's 195.0"],
        retrieved_chunk_count=6,
        retrieval_similarity=0.85,
    )

    assert confidence >= 0.8


def test_empty_dataset_and_no_insights_scores_meaningfully_lower():
    confidence = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights={}, row_count=0, column_count=0, missing_count=0)],
        evidence_used=[],
        retrieved_chunk_count=0,
        retrieval_similarity=None,
    )

    assert confidence < 0.5


def test_heavy_missingness_and_uncited_evidence_reduces_confidence():
    # Material was available (computed_insights relevant, chunks retrieved)
    # but the agent didn't cite anything, and the dataset is heavily
    # incomplete -- both should pull confidence down from the strong case.
    strong = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS, missing_count=0)],
        evidence_used=["cited something"],
        retrieved_chunk_count=6,
        retrieval_similarity=0.85,
    )
    weak = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS, row_count=100, missing_count=90)],
        evidence_used=[],  # nothing cited despite material being available
        retrieved_chunk_count=6,
        retrieval_similarity=0.2,
    )

    assert weak < strong


def test_failed_retrieval_scores_no_better_than_weak_retrieval():
    # A stage whose retrieval failed/never ran (retrieval_similarity=None)
    # must not score *better* than a stage that retrieved something and
    # honestly got a low similarity score -- otherwise an outage would look
    # better than an honest weak result on a dashboard literally labeled
    # "AI Confidence". All other signals held identical.
    common_kwargs = {
        "mission": _mission(),
        "datasets": [_dataset(computed_insights=_RELEVANT_INSIGHTS, missing_count=0)],
        "evidence_used": [],
    }
    failed_retrieval = compute_agent_confidence(
        **common_kwargs, retrieved_chunk_count=0, retrieval_similarity=None
    )
    weak_retrieval = compute_agent_confidence(
        **common_kwargs, retrieved_chunk_count=1, retrieval_similarity=0.2
    )
    very_weak_retrieval = compute_agent_confidence(
        **common_kwargs, retrieved_chunk_count=1, retrieval_similarity=0.0
    )

    assert failed_retrieval <= weak_retrieval
    # A failed retrieval should also be no better than the worst possible
    # *attempted* retrieval (similarity=0.0) -- they're deliberately equal,
    # not "no evidence" scoring above rock-bottom evidence.
    assert failed_retrieval == very_weak_retrieval


def test_irrelevant_computed_insights_scores_between_relevant_and_none():
    relevant = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS)],
        evidence_used=["x"],
        retrieved_chunk_count=3,
        retrieval_similarity=0.7,
    )
    irrelevant = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights=_IRRELEVANT_INSIGHTS)],
        evidence_used=["x"],
        retrieved_chunk_count=3,
        retrieval_similarity=0.7,
    )
    none_at_all = compute_agent_confidence(
        mission=_mission(),
        datasets=[_dataset(computed_insights={})],
        evidence_used=[],
        retrieved_chunk_count=0,
        retrieval_similarity=None,
    )

    assert relevant > irrelevant > none_at_all


def test_confidence_is_not_constant_across_varying_inputs():
    # Regression guard for the exact bug this feature fixes: a model that
    # self-reports ~0.85 flatly regardless of input. Five distinct,
    # realistic scenarios should not collapse to the same score.
    scenarios = [
        compute_agent_confidence(
            mission=_mission(),
            datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS, missing_count=0)],
            evidence_used=["a"],
            retrieved_chunk_count=6,
            retrieval_similarity=0.9,
        ),
        compute_agent_confidence(
            mission=_mission(),
            datasets=[_dataset(computed_insights={}, missing_count=0)],
            evidence_used=[],
            retrieved_chunk_count=0,
            retrieval_similarity=None,
        ),
        compute_agent_confidence(
            mission=_mission(),
            datasets=[
                _dataset(computed_insights=_RELEVANT_INSIGHTS, row_count=100, missing_count=60)
            ],
            evidence_used=["a"],
            retrieved_chunk_count=2,
            retrieval_similarity=0.4,
        ),
        compute_agent_confidence(
            mission=_mission(),
            datasets=[_dataset(computed_insights=_IRRELEVANT_INSIGHTS)],
            evidence_used=[],
            retrieved_chunk_count=4,
            retrieval_similarity=0.3,
        ),
        compute_agent_confidence(
            mission=_mission(),
            datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS)],
            evidence_used=[],  # had material, didn't cite it
            retrieved_chunk_count=6,
            retrieval_similarity=0.9,
        ),
    ]

    assert len(set(scenarios)) == len(scenarios), f"expected all distinct, got {scenarios}"
    assert all(0.0 <= score <= 1.0 for score in scenarios)


def test_no_signal_available_at_all_does_not_raise():
    # No datasets, no retrieval, nothing to cite -- an unreachable state in
    # the real pipeline (start_analysis already requires at least one ready
    # dataset), but compute_agent_confidence should still degrade honestly
    # rather than raising a division error.
    confidence = compute_agent_confidence(
        mission=_mission(),
        datasets=[],
        evidence_used=[],
        retrieved_chunk_count=0,
        retrieval_similarity=None,
    )

    assert confidence == 0.0


def _flat_self_reported_result(mission_id: uuid.UUID) -> AnalysisResult:
    """Mimics the exact bug this feature fixes: every agent self-reports the
    same ~0.85, regardless of the (very different) evidence each one
    actually had."""
    return AnalysisResult(
        mission_id=mission_id,
        business_analysis=BusinessAnalysisOutput(
            business_problem="p",
            key_opportunities=["o"],
            important_metrics=["m"],
            recommended_next_steps=["s"],
            confidence=0.85,
            evidence_used=["cited a computed insight"],
        ),
        strategy_analysis=StrategyAnalysisOutput(
            strategic_objectives=["o"],
            recommended_initiatives=["i"],
            implementation_roadmap=["r"],
            kpis=["k"],
            business_impact="b",
            priority="High",
            confidence=0.85,
            evidence_used=[],  # nothing cited despite having material available
        ),
        risk_analysis=RiskAnalysisOutput(
            critical_risks=[],
            assumptions=[],
            recommended_mitigations=[],
            overall_risk_level="Medium",
            confidence=0.85,
            evidence_used=[],
        ),
        executive_analysis=ExecutiveAnalysisOutput(
            executive_summary="e",
            key_findings=[],
            trade_offs=[],
            final_recommendation="f",
            confidence=0.85,
            evidence_used=["cited a synthesis point"],
        ),
    )


def test_apply_grounded_confidence_overwrites_the_flat_self_reported_scores():
    mission = _mission()
    request = AnalysisRequest(
        mission=mission,
        datasets=[_dataset(computed_insights=_RELEVANT_INSIGHTS, missing_count=0)],
    )
    run = OrchestratorRun(
        result=_flat_self_reported_result(mission.mission_id),
        retrieval_stats_by_stage={
            # Business: strong retrieval.
            "business": RetrievalStats(
                query="q",
                top_k=6,
                chunks_retrieved=6,
                average_similarity_score=0.9,
                retrieval_time_ms=10.0,
                sources=["a.csv"],
                embedding_model="m",
            ),
            # Strategy: weak retrieval, and it didn't cite anything either.
            "strategy": RetrievalStats(
                query="q",
                top_k=6,
                chunks_retrieved=6,
                average_similarity_score=0.2,
                retrieval_time_ms=10.0,
                sources=["a.csv"],
                embedding_model="m",
            ),
            # Risk: retrieval failed entirely for this stage.
            "risk": None,
            "executive": None,
        },
        chunks_retrieved_by_stage={"business": 6, "strategy": 6, "risk": 0, "executive": 12},
    )

    updated = apply_grounded_confidence(request, run)

    all_confidences = [
        updated.business_analysis.confidence,
        updated.strategy_analysis.confidence,
        updated.risk_analysis.confidence,
        updated.executive_analysis.confidence,
    ]

    # None of the flat 0.85 self-reports survive.
    assert all(confidence != 0.85 for confidence in all_confidences)
    # They aren't all equal to each other either -- the whole point of this
    # feature is that confidence actually reflects each agent's own,
    # different evidence quality.
    assert len(set(all_confidences)) > 1
    # Business had the strongest retrieval and cited evidence -- it should
    # score at least as high as Strategy, which had weak retrieval and cited
    # nothing despite having material available.
    assert updated.business_analysis.confidence >= updated.strategy_analysis.confidence
    # Risk's retrieval failed outright (None) while Strategy's merely came
    # back weak (0.2 similarity) -- with every other input identical between
    # them, Risk must not score *better* than Strategy for having no
    # evidence at all, or the dashboard would perversely reward the outage
    # over the honest weak result.
    assert updated.risk_analysis.confidence < updated.strategy_analysis.confidence
