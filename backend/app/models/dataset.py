from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import DatasetUploadStatus

if TYPE_CHECKING:
    from app.models.dataset_index import DatasetIndex
    from app.models.dataset_profile import DatasetProfile
    from app.models.mission import Mission


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    upload_status: Mapped[DatasetUploadStatus] = mapped_column(
        Enum(DatasetUploadStatus, name="dataset_upload_status", native_enum=True),
        nullable=False,
        index=True,
        default=DatasetUploadStatus.UPLOADED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    mission: Mapped[Mission] = relationship(back_populates="datasets")
    profile: Mapped[DatasetProfile | None] = relationship(
        back_populates="dataset", cascade="all, delete-orphan", uselist=False
    )
    index: Mapped[DatasetIndex | None] = relationship(
        back_populates="dataset", cascade="all, delete-orphan", uselist=False
    )
