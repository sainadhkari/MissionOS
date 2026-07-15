from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.dataset import Dataset


class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    column_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    columns: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    missing_values: Mapped[dict[str, int]] = mapped_column(JSONB, nullable=False, default=dict)
    duplicate_row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    numeric_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    categorical_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    computed_insights: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=True, default=dict)
    encoding: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delimiter: Mapped[str | None] = mapped_column(String(10), nullable=True)
    validation_errors: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    dataset: Mapped[Dataset] = relationship(back_populates="profile")
