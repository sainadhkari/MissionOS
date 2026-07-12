import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import AnalysisStatus
from app.models.mission_analysis import MissionAnalysis


class MissionAnalysisRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_for_mission(self, mission_id: uuid.UUID) -> MissionAnalysis | None:
        stmt = select(MissionAnalysis).where(MissionAnalysis.mission_id == mission_id)
        return self.db.scalar(stmt)

    def upsert_pending(self, mission_id: uuid.UUID) -> MissionAnalysis:
        """Creates a fresh PENDING analysis row for `mission_id`, or resets an
        existing one — analysis is 1:1 with a mission, so re-running it starts
        clean rather than leaving stale results from a prior run mixed in."""
        existing = self.get_for_mission(mission_id)
        if existing is not None:
            existing.status = AnalysisStatus.PENDING
            existing.business_analysis = None
            existing.strategy_analysis = None
            existing.risk_analysis = None
            existing.executive_analysis = None
            existing.retrieval_stats = None
            existing.error_message = None
            existing.started_at = None
            existing.completed_at = None
            self.db.flush()
            return existing

        analysis = MissionAnalysis(mission_id=mission_id, status=AnalysisStatus.PENDING)
        self.db.add(analysis)
        self.db.flush()
        return analysis
