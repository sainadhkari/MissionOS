import asyncio
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.agents import BusinessAgent, ExecutiveAgent, RiskAgent, StrategyAgent
from app.ai.exceptions import AIException
from app.ai.models import AnalysisRequest, DatasetColumnSummary, DatasetContext, MissionContext
from app.ai.orchestrator import AnalysisOrchestrator
from app.ai.prompt_loader import PromptLoader
from app.ai.providers import OpenAIClient
from app.config.settings import settings
from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.models.enums import AnalysisStatus, DatasetUploadStatus
from app.models.mission import Mission
from app.models.mission_analysis import MissionAnalysis
from app.models.user import User
from app.repositories.mission_analysis_repository import MissionAnalysisRepository
from app.repositories.mission_repository import MissionRepository
from app.services import mission_service

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
    )


def build_analysis_request(mission: Mission, datasets: list[Dataset]) -> AnalysisRequest:
    return AnalysisRequest(
        mission=build_mission_context(mission),
        datasets=[build_dataset_context(dataset) for dataset in datasets],
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
    )


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

            request = build_analysis_request(mission, datasets)
            result = asyncio.run(_build_orchestrator().run(request))

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
