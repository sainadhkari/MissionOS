import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.mission import Mission


class MissionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_user(self, user_id: uuid.UUID) -> list[Mission]:
        stmt = (
            select(Mission)
            .where(Mission.user_id == user_id)
            .order_by(Mission.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_for_user(self, mission_id: uuid.UUID, user_id: uuid.UUID) -> Mission | None:
        stmt = select(Mission).where(Mission.id == mission_id, Mission.user_id == user_id)
        return self.db.scalar(stmt)

    def get_by_id(self, mission_id: uuid.UUID) -> Mission | None:
        """Unfiltered lookup for internal/background use only — never call this
        on behalf of an HTTP request; use `get_for_user` there instead."""
        return self.db.get(Mission, mission_id)

    def create(self, *, user_id: uuid.UUID, **fields: Any) -> Mission:
        mission = Mission(user_id=user_id, **fields)
        self.db.add(mission)
        self.db.flush()
        return mission

    def update(self, mission: Mission, **fields: Any) -> Mission:
        for key, value in fields.items():
            setattr(mission, key, value)
        self.db.flush()
        return mission

    def delete(self, mission: Mission) -> None:
        self.db.delete(mission)
