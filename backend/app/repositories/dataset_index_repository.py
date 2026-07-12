import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dataset_index import DatasetIndex
from app.models.enums import RagIndexStatus


class DatasetIndexRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_for_dataset(self, dataset_id: uuid.UUID) -> DatasetIndex | None:
        stmt = select(DatasetIndex).where(DatasetIndex.dataset_id == dataset_id)
        return self.db.scalar(stmt)

    def mark_indexing(self, dataset_id: uuid.UUID) -> DatasetIndex:
        """Creates or resets the row for `dataset_id` to INDEXING — called at
        the start of every index/re-index attempt, mirroring
        `MissionAnalysisRepository.upsert_pending`'s reset-in-place approach
        rather than accumulating one row per attempt."""
        existing = self.get_for_dataset(dataset_id)
        if existing is not None:
            existing.status = RagIndexStatus.INDEXING
            existing.error_message = None
            self.db.flush()
            return existing

        index = DatasetIndex(dataset_id=dataset_id, status=RagIndexStatus.INDEXING)
        self.db.add(index)
        self.db.flush()
        return index

    def mark_indexed(
        self,
        dataset_id: uuid.UUID,
        *,
        chunk_count: int,
        embedding_model: str,
        vector_collection: str,
    ) -> DatasetIndex:
        index = self.get_for_dataset(dataset_id)
        if index is None:
            index = DatasetIndex(dataset_id=dataset_id)
            self.db.add(index)

        index.status = RagIndexStatus.INDEXED
        index.chunk_count = chunk_count
        index.embedding_model = embedding_model
        index.vector_collection = vector_collection
        index.error_message = None
        index.indexed_at = datetime.now(UTC)
        self.db.flush()
        return index

    def mark_failed(self, dataset_id: uuid.UUID, *, error_message: str) -> DatasetIndex:
        index = self.get_for_dataset(dataset_id)
        if index is None:
            index = DatasetIndex(dataset_id=dataset_id)
            self.db.add(index)

        index.status = RagIndexStatus.FAILED
        index.error_message = error_message
        self.db.flush()
        return index
