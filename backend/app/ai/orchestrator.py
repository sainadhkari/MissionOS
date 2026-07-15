import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field

from app.ai.agents.business_agent import BusinessAgent
from app.ai.agents.executive_agent import ExecutiveAgent
from app.ai.agents.risk_agent import RiskAgent
from app.ai.agents.strategy_agent import StrategyAgent
from app.ai.models import (
    AnalysisRequest,
    AnalysisResult,
    BusinessAnalysisOutput,
    MissionContext,
    RetrievedChunk,
    StrategyAnalysisOutput,
)
from app.rag.models import RetrievalStats

# (mission_id, query_text) -> (retrieved chunks, a stats snapshot, or None if
# retrieval failed/wasn't attempted). Matches
# `mission_analysis_service._retrieve`'s signature -- the orchestrator only
# needs *a* retriever, not a concrete `RetrievalService`, so tests can inject
# a fake one with no RAG infrastructure at all.
Retriever = Callable[
    [uuid.UUID, str], Awaitable[tuple[list[RetrievedChunk], RetrievalStats | None]]
]


def business_retrieval_query(mission: MissionContext) -> str:
    """Business is the first stage and has no prior agent output to ground a
    query in yet, so it stays close to the mission's own framing."""
    return f"{mission.title}. {mission.problem_statement} {mission.objective}"


def strategy_retrieval_query(mission: MissionContext, business: BusinessAnalysisOutput) -> str:
    """Grounded in what Business actually found rather than the abstract
    mission -- Strategy's retrieval should surface evidence relevant to the
    specific problem and opportunities Business identified, not a generic
    restatement of the mission."""
    opportunities = " ".join(business.key_opportunities)
    return f"{mission.title}. {business.business_problem} {opportunities}".strip()


def risk_retrieval_query(mission: MissionContext, strategy: StrategyAnalysisOutput) -> str:
    """Tied to what could concretely go wrong with the specific plan Strategy
    proposed, not the abstract mission -- Risk needs evidence about the
    initiatives themselves, not just the original problem statement."""
    initiatives = " ".join(strategy.recommended_initiatives)
    return f"{mission.title}. Risks and challenges affecting: {initiatives}".strip()


def _dedupe_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Business/Strategy/Risk retrieve independently and can easily surface
    the same chunk more than once (e.g. the same row group is relevant to
    both the problem and a risk about it) -- Executive reuses their combined
    results, so duplicates are collapsed before it sees them."""
    seen: set[tuple[str, str]] = set()
    deduped: list[RetrievedChunk] = []
    for chunk in chunks:
        key = (chunk.source_filename, chunk.text)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(chunk)
    return deduped


@dataclass
class OrchestratorRun:
    """Everything one full pipeline run produced: the threaded analysis
    result, a `RetrievalStats` snapshot per retrieval call actually made
    (Business/Strategy/Risk -- Executive makes none, see `AnalysisOrchestrator.
    run`), and how many chunks each agent's context ultimately contained.
    `retrieval_stats_by_stage` is keyed by stage name ("business"/"strategy"/
    "risk"; "executive" is always `None`, it never retrieves) rather than a
    plain list -- a list would lose which stage a snapshot belonged to the
    moment any single stage's retrieval failed (e.g. business's retrieval
    fails but strategy's succeeds: a list holds one entry, but nothing
    records whether it's strategy's or a shifted business's). Keying by
    stage keeps every consumer honest about which agent a given similarity
    score/query actually came from -- `mission_analysis_service.
    _combine_retrieval_stats` folds this into one whole-run `RetrievalStats`
    snapshot, and `confidence_service` reads each stage's own score directly
    to ground that specific agent's confidence."""

    result: AnalysisResult
    retrieval_stats_by_stage: dict[str, RetrievalStats | None] = field(default_factory=dict)
    chunks_retrieved_by_stage: dict[str, int] = field(default_factory=dict)


class AnalysisOrchestrator:
    """Wires the four-agent pipeline together:

        Mission -> Business -> Strategy -> Risk -> Executive -> AnalysisResult

    Every agent is constructor-injected, so this class has no knowledge of
    *how* analysis happens — only the order in which agents run and how
    results are threaded between them. Swapping an agent's implementation,
    or inserting a new stage, never requires touching `run()`'s control flow,
    only the wiring at the call site that constructs the orchestrator —
    that's `_build_orchestrator()` in `app/services/mission_analysis_service.py`,
    which runs this pipeline as a background task per mission analysis request.

    Retrieval is also owned here, one call per stage rather than one shared
    call up front: each stage's query is built from what that specific stage
    needs (see `*_retrieval_query` above), using the `AnalysisResult` this
    same `run()` is already threading between stages -- no extra plumbing
    required to get Business's findings to Strategy's query, for example.
    `retriever` is optional so tests (or a future run with RAG disabled
    entirely) can omit it; every stage then proceeds with no retrieved
    context, exactly like a retrieval failure degrades today.
    """

    def __init__(
        self,
        business_agent: BusinessAgent,
        strategy_agent: StrategyAgent,
        risk_agent: RiskAgent,
        executive_agent: ExecutiveAgent,
        retriever: Retriever | None = None,
    ) -> None:
        self._business_agent = business_agent
        self._strategy_agent = strategy_agent
        self._risk_agent = risk_agent
        self._executive_agent = executive_agent
        self._retriever = retriever

    async def _retrieve(
        self, mission_id: uuid.UUID, query: str
    ) -> tuple[list[RetrievedChunk], RetrievalStats | None]:
        if self._retriever is None:
            return [], None
        return await self._retriever(mission_id, query)

    async def run(self, request: AnalysisRequest) -> OrchestratorRun:
        mission = request.mission
        stats_by_stage: dict[str, RetrievalStats | None] = {}

        business_chunks, stats_by_stage["business"] = await self._retrieve(
            mission.mission_id, business_retrieval_query(mission)
        )
        result = await self._business_agent.analyze(
            request.model_copy(update={"retrieved_context": business_chunks})
        )

        strategy_query = strategy_retrieval_query(mission, result.business_analysis)
        strategy_chunks, stats_by_stage["strategy"] = await self._retrieve(
            mission.mission_id, strategy_query
        )
        result = await self._strategy_agent.analyze(
            request.model_copy(update={"retrieved_context": strategy_chunks}), result
        )

        risk_query = risk_retrieval_query(mission, result.strategy_analysis)
        risk_chunks, stats_by_stage["risk"] = await self._retrieve(mission.mission_id, risk_query)
        result = await self._risk_agent.analyze(
            request.model_copy(update={"retrieved_context": risk_chunks}), result
        )

        # Executive's prompt already restricts it to only ground/illustrate a
        # point the prior three stages raised, never to introduce something
        # new -- so a fourth query would only add latency/cost for evidence
        # it isn't allowed to use for anything a fresh retrieval would be
        # needed for. It reuses everything already surfaced instead, and
        # makes no retrieval call of its own.
        executive_chunks = _dedupe_chunks(business_chunks + strategy_chunks + risk_chunks)
        stats_by_stage["executive"] = None
        result = await self._executive_agent.analyze(
            request.model_copy(update={"retrieved_context": executive_chunks}), result
        )

        return OrchestratorRun(
            result=result,
            retrieval_stats_by_stage=stats_by_stage,
            chunks_retrieved_by_stage={
                "business": len(business_chunks),
                "strategy": len(strategy_chunks),
                "risk": len(risk_chunks),
                "executive": len(executive_chunks),
            },
        )
