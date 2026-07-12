from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import RagIndexStatus

if TYPE_CHECKING:
    from app.models.dataset import Dataset


class DatasetIndex(Base):
    """RAG indexing status for a single dataset — 1:1 with `Dataset`, mirroring
    `DatasetProfile`. The actual chunk text and embeddings live in the vector
    store (Chroma), keyed by `vector_collection`; this row is Postgres's
    summary of that external state (status, chunk count, timestamps) so the
    API can answer "is this dataset indexed?" without querying Chroma."""

    __tablename__ = "dataset_indexes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    status: Mapped[RagIndexStatus] = mapped_column(
        Enum(RagIndexStatus, name="rag_index_status", native_enum=True),
        nullable=False,
        index=True,
        default=RagIndexStatus.PENDING,
    )
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # The Chroma collection this dataset's chunks live in — one collection per
    # mission (`mission_{mission_id}`), so a mission's agents can query across
    # every one of its datasets in a single call.
    vector_collection: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    dataset: Mapped[Dataset] = relationship(back_populates="index")
