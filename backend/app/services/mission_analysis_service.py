import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.agents import BusinessAgent, ExecutiveAgent, RiskAgent, StrategyAgent
from app.ai.exceptions import AIException
from app.ai.models import (
    AnalysisRequest,
    AnalysisResult,
    DatasetColumnSummary,
    DatasetContext,
    MissionContext,
    RetrievedChunk,
)
from app.ai.orchestrator import AnalysisOrchestrator, OrchestratorRun
from app.ai.prompt_loader import PromptLoader
from app.ai.providers import OpenAIClient
from app.config.settings import settings
from app.core.vector_storage import VECTOR_STORE_DIR
from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.models.enums import AnalysisStatus, DatasetUploadStatus
from app.models.mission import Mission
from app.models.mission_analysis import MissionAnalysis
from app.models.user import User
from app.rag.embedding_service import OpenAIEmbeddingClient
from app.rag.exceptions import RagException
from app.rag.models import RetrievalStats
from app.rag.retrieval_service import RetrievalService
from app.rag.vector_store import ChromaVectorStore
from app.repositories.mission_analysis_repository import MissionAnalysisRepository
from app.repositories.mission_repository import MissionRepository
from app.services import confidence_service, dataset_join_service, mission_service
from app.services.dataset_validation_service import DatasetValidationError, validate_and_read

logger = logging.getLogger("missionos.mission_analysis")


class NoValidatedDatasetsError(Exception):
    pass


class AnalysisNotFoundError(Exception):
    pass


def _ready_datasets(db: Session, mission_id: uuid.UUID) -> list[Dataset]:
    stmt = select(Dataset).where(
        Dataset.mission_id == mission_id, Dataset.upload_status == DatasetUploadStatus.READY
    )
    return list(db.scalars(stmt))


def build_mission_context(mission: Mission) -> MissionContext:
    return MissionContext(
        mission_id=mission.id,
        title=mission.title,
        business_domain=mission.business_domain,
        priority=mission.priority.value,
        problem_statement=mission.problem_statement,
        objective=mission.objective,
        expected_output=mission.expected_output,
        status=mission.status.value,
    )


def build_dataset_context(dataset: Dataset) -> DatasetContext:
    profile = dataset.profile
    columns = [DatasetColumnSummary(**column) for column in (profile.columns if profile else [])]
    return DatasetContext(
        dataset_id=dataset.id,
        original_filename=dataset.original_filename,
        file_type=dataset.file_type,
        row_count=profile.row_count if profile else 0,
        column_count=profile.column_count if profile else 0,
        duplicate_row_count=profile.duplicate_row_count if profile else 0,
        columns=columns,
        numeric_summary=profile.numeric_summary if profile else {},
        categorical_summary=profile.categorical_summary if profile else {},
        # `computed_insights` is a nullable column (added after profiles already
        # existed, so old rows have no backfilled value) -- `or {}` covers both
        # "no profile at all" and "profile predates this column".
        computed_insights=(profile.computed_insights or {}) if profile else {},
    )


def _build_cross_dataset_insights(mission: Mission, datasets: list[Dataset]) -> dict:
    """Best-effort cross-dataset join detection (see `dataset_join_service`)
    across every ready dataset attached to this mission.

    Requires each dataset's actual rows, not just its persisted
    `DatasetProfile` -- profiles only ever store aggregate stats
    (numeric_summary, computed_insights, etc.), never raw rows, since
    keeping a second full copy of every uploaded file's data in Postgres
    would be wasteful. Join detection genuinely needs the rows (to check
    key uniqueness and actual value overlap, not just column names), so
    this re-reads and re-parses each dataset's file from disk -- the same
    `validate_and_read` the original profiling background task used, run
    again here because that task's already-parsed DataFrame isn't
    available this far downstream, in a separate run at analysis time.

    A dataset whose file can no longer be read/parsed is simply excluded
    from join detection (not a failure of the whole analysis) -- its own
    independent profile/computed_insights, already persisted, is
    unaffected either way.

    COST NOTE: this re-parse happens on *every* call to this function --
    every analysis run, including a retry of a previously-failed one, not
    just the first. There's no cache keyed on dataset content/version, so
    a mission with large attached files that gets re-analyzed frequently
    pays this file-read/parse cost each time. Fine at today's dataset
    sizes; worth revisiting (e.g. caching the parsed frame keyed on
    dataset id + file hash, alongside the existing profile) if either
    grows enough for this to show up as real latency or I/O cost.
    """
    if len(datasets) < 2:
        return {}

    dataframes = {}
    for dataset in datasets:
        try:
            parsed = validate_and_read(dataset)
        except DatasetValidationError:
            continue
        dataframes[dataset.original_filename] = parsed.dataframe

    if len(dataframes) < 2:
        return {}

    return (
        dataset_join_service.compute_cross_dataset_insights(
            dataframes,
            mission_problem_statement=mission.problem_statement,
            mission_objective=mission.objective,
        )
        or {}
    )


def build_analysis_request(mission: Mission, datasets: list[Dataset]) -> AnalysisRequest:
    # `retrieved_context` is deliberately left at its default (empty) --
    # retrieval now happens per stage, inside `AnalysisOrchestrator.run`,
    # which overrides it with each stage's own results via `model_copy()`
    # rather than reading whatever this base request was built with.
    return AnalysisRequest(
        mission=build_mission_context(mission),
        datasets=[build_dataset_context(dataset) for dataset in datasets],
        cross_dataset_insights=_build_cross_dataset_insights(mission, datasets),
    )


def start_analysis(db: Session, *, user: User, mission_id: uuid.UUID) -> MissionAnalysis:
    """Synchronous, request-time half of triggering an analysis: validates
    ownership and readiness, then creates/resets the PENDING row the
    background task will pick up. Does not call the model."""
    mission = mission_service.get_mission(db, user=user, mission_id=mission_id)

    if not _ready_datasets(db, mission.id):
        raise NoValidatedDatasetsError(mission_id)

    analysis = MissionAnalysisRepository(db).upsert_pending(mission.id)
    db.commit()
    db.refresh(analysis)
    return analysis


def get_analysis(db: Session, *, user: User, mission_id: uuid.UUID) -> MissionAnalysis:
    mission = mission_service.get_mission(db, user=user, mission_id=mission_id)
    analysis = MissionAnalysisRepository(db).get_for_mission(mission.id)
    if analysis is None:
        raise AnalysisNotFoundError(mission_id)
    return analysis


def _build_orchestrator() -> AnalysisOrchestrator:
    # `settings` (not `get_settings()`): this runs outside FastAPI's dependency
    # graph, same convention `alembic/env.py` uses — see settings.py's docstring.
    client = OpenAIClient(settings)
    prompt_loader = PromptLoader()
    return AnalysisOrchestrator(
        business_agent=BusinessAgent(client, prompt_loader),
        strategy_agent=StrategyAgent(client, prompt_loader),
        risk_agent=RiskAgent(client, prompt_loader),
        executive_agent=ExecutiveAgent(client, prompt_loader),
        retriever=_retrieve,
    )


def _build_retrieval_service() -> RetrievalService:
    # Same "settings, not get_settings()" convention as _build_orchestrator().
    return RetrievalService(
        OpenAIEmbeddingClient(settings),
        ChromaVectorStore(VECTOR_STORE_DIR),
        top_k=settings.rag_top_k,
    )


async def _retrieve(
    mission_id: uuid.UUID, query: str
) -> tuple[list[RetrievedChunk], RetrievalStats | None]:
    """Best-effort retrieval for one query: RAG is additive on top of a
    pipeline that already worked without it, so a retrieval failure
    (embedding API down, vector store unavailable, nothing indexed yet)
    degrades to "no retrieved context" for that stage rather than failing
    the entire analysis run. Called once per agent stage by
    `AnalysisOrchestrator.run` (see `app.ai.orchestrator`), each with that
    stage's own query, rather than once shared across every agent.
    """
    started = time.perf_counter()
    try:
        retrieval = _build_retrieval_service()
        matches = await retrieval.retrieve(mission_id=mission_id, query_text=query)
    except RagException as exc:
        logger.warning(
            "RAG retrieval failed for mission %s, proceeding without it: %s: %s",
            mission_id,
            type(exc).__name__,
            exc,
        )
        return [], None
    elapsed_ms = (time.perf_counter() - started) * 1000

    sources = sorted({str(match.metadata.get("filename", "unknown")) for match in matches})
    stats = RetrievalStats(
        query=query,
        top_k=settings.rag_top_k,
        chunks_retrieved=len(matches),
        average_similarity_score=(
            sum(match.score for match in matches) / len(matches) if matches else None
        ),
        retrieval_time_ms=round(elapsed_ms, 1),
        sources=sources,
        embedding_model=settings.openai_embedding_model,
        total_context_chars=sum(len(match.text) for match in matches),
    )

    retrieved_context = [
        RetrievedChunk(
            text=match.text,
            source_filename=str(match.metadata.get("filename", "unknown")),
            score=match.score,
        )
        for match in matches
    ]
    return retrieved_context, stats


def _combine_retrieval_stats(run: OrchestratorRun) -> RetrievalStats | None:
    """Combines the per-agent retrieval calls one orchestrator run made into
    a single, honest snapshot of that run's whole RAG activity. Keeping
    `MissionAnalysis.retrieval_stats` a single object (rather than one row
    per agent) means every existing consumer — the Executive Report's RAG
    and Retrieval Analytics sections, the live AI Collaboration Center —
    keeps working against the same shape unmodified; `query_count` and
    `per_agent_chunks` (see `RetrievalStats`) carry the per-call/per-agent
    detail that combining the rest of the fields would otherwise lose.
    Returns `None` only when no retrieval call succeeded at all (e.g. RAG is
    down for the whole run), matching `_retrieve`'s existing "no stats
    fabricated on failure" behavior.
    """
    stats_list = [stats for stats in run.retrieval_stats_by_stage.values() if stats is not None]
    if not stats_list:
        return None

    total_chunks = sum(s.chunks_retrieved for s in stats_list)
    scored = [
        (s.average_similarity_score, s.chunks_retrieved)
        for s in stats_list
        if s.average_similarity_score is not None and s.chunks_retrieved > 0
    ]
    weighted_similarity = (
        sum(score * count for score, count in scored) / sum(count for _, count in scored)
        if scored
        else None
    )

    return RetrievalStats(
        query="; ".join(s.query for s in stats_list),
        top_k=stats_list[0].top_k,
        chunks_retrieved=total_chunks,
        average_similarity_score=weighted_similarity,
        retrieval_time_ms=round(sum(s.retrieval_time_ms for s in stats_list), 1),
        sources=sorted({source for s in stats_list for source in s.sources}),
        embedding_model=stats_list[0].embedding_model,
        vector_store=stats_list[0].vector_store,
        total_context_chars=sum(s.total_context_chars or 0 for s in stats_list),
        query_count=len(stats_list),
        per_agent_chunks=run.chunks_retrieved_by_stage,
    )


async def _run_pipeline_async(
    mission: Mission, datasets: list[Dataset]
) -> tuple[AnalysisResult, RetrievalStats | None]:
    """Builds the mission/dataset context once, then runs the four-agent
    orchestrator — which retrieves this mission's relevant evidence itself,
    once per stage with that stage's own query (see
    `AnalysisOrchestrator.run`) — bridged into with a single `asyncio.run()`
    call from the sync background task below. Each agent's self-reported
    `confidence` is then overwritten with a server-computed, grounded score
    (see `confidence_service.apply_grounded_confidence` for the replace-
    in-place decision and why) before the result is returned for
    persistence."""
    request = build_analysis_request(mission, datasets)
    run = await _build_orchestrator().run(request)
    result = confidence_service.apply_grounded_confidence(request, run)
    return result, _combine_retrieval_stats(run)


def run_analysis_pipeline(mission_id: uuid.UUID) -> None:
    """Runs as a FastAPI BackgroundTask after POST /missions/{id}/analyze, so
    it owns its own DB session — the request-scoped session is already
    closed by the time this runs. A plain `def` (not `async def`), matching
    `dataset_profiling_pipeline.run_dataset_profiling`, so Starlette
    dispatches it to the thread pool rather than the request event loop;
    `asyncio.run` bridges into the (async) AnalysisOrchestrator from there.
    """
    db = SessionLocal()
    try:
        repo = MissionAnalysisRepository(db)
        analysis = repo.get_for_mission(mission_id)
        if analysis is None:
            return

        analysis.status = AnalysisStatus.RUNNING
        analysis.started_at = datetime.now(UTC)
        db.commit()

        try:
            mission = MissionRepository(db).get_by_id(mission_id)
            if mission is None:
                raise AIException(f"Mission {mission_id} no longer exists.")

            datasets = _ready_datasets(db, mission_id)
            if not datasets:
                raise AIException("No validated datasets remain for this mission.")

            result, retrieval_stats = asyncio.run(_run_pipeline_async(mission, datasets))

            analysis.retrieval_stats = (
                retrieval_stats.model_dump(mode="json") if retrieval_stats else None
            )
            analysis.business_analysis = (
                result.business_analysis.model_dump(mode="json")
                if result.business_analysis
                else None
            )
            analysis.strategy_analysis = (
                result.strategy_analysis.model_dump(mode="json")
                if result.strategy_analysis
                else None
            )
            analysis.risk_analysis = (
                result.risk_analysis.model_dump(mode="json") if result.risk_analysis else None
            )
            analysis.executive_analysis = (
                result.executive_analysis.model_dump(mode="json")
                if result.executive_analysis
                else None
            )
            analysis.status = AnalysisStatus.COMPLETED
        except AIException as exc:
            # Not `.exception()` — this is an expected, already-handled failure
            # mode (a bad API key, a rate limit, a malformed model response),
            # not a bug, so no traceback is needed — but it must still be
            # visible in the server logs, not just the DB row, or an AI outage
            # is invisible until someone happens to query mission_analyses.
            logger.warning(
                "AI analysis failed for mission %s: %s: %s",
                mission_id,
                type(exc).__name__,
                exc,
            )
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(exc)
        except Exception as exc:
            logger.exception("Unexpected error running analysis for mission %s", mission_id)
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = f"Unexpected error: {exc}"

        analysis.completed_at = datetime.now(UTC)
        db.commit()
    finally:
        db.close()
