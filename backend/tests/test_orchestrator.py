import uuid

import pytest

from app.ai.models import (
    AgentName,
    AnalysisRequest,
    AnalysisResult,
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    MissionContext,
    RiskAnalysisOutput,
    StrategyAnalysisOutput,
)
from app.ai.orchestrator import AnalysisOrchestrator


def _mission_context() -> MissionContext:
    return MissionContext(
        mission_id=uuid.uuid4(),
        title="Reduce Store B Underperformance",
        business_domain="Retail",
        priority="high",
        problem_statement="Store B sales lag the rest of the network.",
        objective="Identify the cause and recommend fixes.",
        expected_output="A concrete action plan.",
        status="draft",
    )


class _StubBusinessAgent:
    async def analyze(self, request, prior=None):
        base = prior or AnalysisResult(mission_id=request.mission.mission_id)
        output = BusinessAnalysisOutput(
            business_problem="Store B underperforms due to low foot traffic",
            key_opportunities=["Targeted local marketing", "Extended weekend hours"],
            important_metrics=["Store B daily sales"],
            recommended_next_steps=["Launch a local marketing campaign"],
            confidence=0.8,
        )
        return base.model_copy(
            update={
                "business_analysis": output,
                "completed_stages": [*base.completed_stages, AgentName.BUSINESS],
            }
        )


class _StubStrategyAgent:
    async def analyze(self, request, prior):
        output = StrategyAnalysisOutput(
            strategic_objectives=["Close the Store B sales gap"],
            recommended_initiatives=["Run a 6-week local marketing campaign in Store B's zip code"],
            implementation_roadmap=["Phase 1: launch campaign"],
            kpis=["Store B weekly sales"],
            business_impact="Recovers an estimated $50k/quarter",
            priority="High",
            confidence=0.75,
        )
        return prior.model_copy(
            update={
                "strategy_analysis": output,
                "completed_stages": [*prior.completed_stages, AgentName.STRATEGY],
            }
        )


class _StubRiskAgent:
    async def analyze(self, request, prior):
        output = RiskAnalysisOutput(
            critical_risks=[],
            assumptions=[],
            recommended_mitigations=[],
            overall_risk_level="Medium",
            confidence=0.7,
        )
        return prior.model_copy(
            update={
                "risk_analysis": output,
                "completed_stages": [*prior.completed_stages, AgentName.RISK],
            }
        )


class _StubExecutiveAgent:
    async def analyze(self, request, prior):
        output = ExecutiveAnalysisOutput(
            executive_summary="Store B needs a targeted marketing push.",
            key_findings=[],
            trade_offs=[],
            final_recommendation="Launch the campaign.",
            confidence=0.8,
        )
        return prior.model_copy(
            update={
                "executive_analysis": output,
                "completed_stages": [*prior.completed_stages, AgentName.EXECUTIVE],
            }
        )


def _build_orchestrator(retriever):
    return AnalysisOrchestrator(
        business_agent=_StubBusinessAgent(),
        strategy_agent=_StubStrategyAgent(),
        risk_agent=_StubRiskAgent(),
        executive_agent=_StubExecutiveAgent(),
        retriever=retriever,
    )


@pytest.mark.anyio
async def test_each_stage_retrieves_with_a_distinct_query_built_from_its_own_input():
    recorded_queries: list[str] = []

    async def fake_retriever(mission_id, query):
        recorded_queries.append(query)
        return [], None

    orchestrator = _build_orchestrator(fake_retriever)
    request = AnalysisRequest(mission=_mission_context(), datasets=[])

    await orchestrator.run(request)

    # Business, Strategy, Risk each retrieve once; Executive reuses their
    # results rather than issuing a fourth query.
    assert len(recorded_queries) == 3
    business_query, strategy_query, risk_query = recorded_queries
    assert len({business_query, strategy_query, risk_query}) == 3

    # Business: close to the mission-level framing.
    assert "Reduce Store B Underperformance" in business_query
    assert "Store B sales lag the rest of the network" in business_query

    # Strategy: grounded in the Business Agent's actual output, not the
    # abstract mission.
    assert "Store B underperforms due to low foot traffic" in strategy_query
    assert "Targeted local marketing" in strategy_query

    # Risk: grounded in the Strategy Agent's actual initiatives.
    assert "Run a 6-week local marketing campaign in Store B's zip code" in risk_query


@pytest.mark.anyio
async def test_executive_receives_deduplicated_union_of_prior_stages_chunks():
    from app.ai.models import RetrievedChunk

    shared_chunk = RetrievedChunk(text="Row 1: sales=100", source_filename="a.csv", score=0.9)
    business_only = RetrievedChunk(text="Row 2: sales=90", source_filename="a.csv", score=0.8)
    risk_only = RetrievedChunk(text="Row 3: sales=80", source_filename="a.csv", score=0.7)

    call_count = 0

    async def fake_retriever(mission_id, query):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [shared_chunk, business_only], None
        if call_count == 2:
            return [shared_chunk], None
        return [risk_only], None

    captured_executive_request: dict = {}

    class _CapturingExecutiveAgent(_StubExecutiveAgent):
        async def analyze(self, request, prior):
            captured_executive_request["retrieved_context"] = request.retrieved_context
            return await super().analyze(request, prior)

    orchestrator = AnalysisOrchestrator(
        business_agent=_StubBusinessAgent(),
        strategy_agent=_StubStrategyAgent(),
        risk_agent=_StubRiskAgent(),
        executive_agent=_CapturingExecutiveAgent(),
        retriever=fake_retriever,
    )
    request = AnalysisRequest(mission=_mission_context(), datasets=[])

    run = await orchestrator.run(request)

    executive_chunks = captured_executive_request["retrieved_context"]
    # shared_chunk deduplicated across business+strategy, plus business_only
    # and risk_only -- 3 distinct chunks, not 4.
    assert len(executive_chunks) == 3
    assert run.chunks_retrieved_by_stage == {
        "business": 2,
        "strategy": 1,
        "risk": 1,
        "executive": 3,
    }


@pytest.mark.anyio
async def test_retrieval_failure_degrades_to_no_context_for_that_stage():
    async def failing_retriever(mission_id, query):
        return [], None

    orchestrator = _build_orchestrator(failing_retriever)
    request = AnalysisRequest(mission=_mission_context(), datasets=[])

    run = await orchestrator.run(request)

    assert run.retrieval_stats_by_stage == {
        "business": None,
        "strategy": None,
        "risk": None,
        "executive": None,
    }
    assert run.result.executive_analysis is not None


@pytest.mark.anyio
async def test_no_retriever_configured_runs_with_no_retrieved_context():
    orchestrator = AnalysisOrchestrator(
        business_agent=_StubBusinessAgent(),
        strategy_agent=_StubStrategyAgent(),
        risk_agent=_StubRiskAgent(),
        executive_agent=_StubExecutiveAgent(),
    )
    request = AnalysisRequest(mission=_mission_context(), datasets=[])

    run = await orchestrator.run(request)

    assert run.retrieval_stats_by_stage == {
        "business": None,
        "strategy": None,
        "risk": None,
        "executive": None,
    }
    assert run.chunks_retrieved_by_stage == {
        "business": 0,
        "strategy": 0,
        "risk": 0,
        "executive": 0,
    }
    assert run.result.executive_analysis is not None
