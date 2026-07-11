import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.mission import Mission


class DatasetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_mission(self, mission_id: uuid.UUID) -> list[Dataset]:
        stmt = (
            select(Dataset)
            .where(Dataset.mission_id == mission_id)
            .order_by(Dataset.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_owned(self, dataset_id: uuid.UUID, user_id: uuid.UUID) -> Dataset | None:
        stmt = (
            select(Dataset)
            .join(Mission, Mission.id == Dataset.mission_id)
            .where(Dataset.id == dataset_id, Mission.user_id == user_id)
        )
        return self.db.scalar(stmt)

    def create(self, *, mission_id: uuid.UUID, **fields: Any) -> Dataset:
        dataset = Dataset(mission_id=mission_id, **fields)
        self.db.add(dataset)
        self.db.flush()
        return dataset

    def delete(self, dataset: Dataset) -> None:
        self.db.delete(dataset)
