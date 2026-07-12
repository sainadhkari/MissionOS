from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import AnalysisStatus

if TYPE_CHECKING:
    from app.models.mission import Mission


class MissionAnalysis(Base):
    __tablename__ = "mission_analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, name="analysis_status", native_enum=True),
        nullable=False,
        index=True,
        default=AnalysisStatus.PENDING,
    )
    business_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    strategy_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    risk_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    executive_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    # A `RetrievalStats` snapshot (app.rag.models) of the one shared RAG
    # retrieval call made before the four agents ran — null for analyses
    # that predate RAG, or where retrieval raised before producing a result.
    retrieval_stats: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    mission: Mapped[Mission] = relationship(back_populates="analysis")
