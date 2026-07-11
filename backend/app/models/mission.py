from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import MissionPriority, MissionStatus

if TYPE_CHECKING:
    from app.models.dataset import Dataset
    from app.models.user import User


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    business_domain: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[MissionPriority] = mapped_column(
        Enum(MissionPriority, name="mission_priority", native_enum=True),
        nullable=False,
        index=True,
        default=MissionPriority.MEDIUM,
    )
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MissionStatus] = mapped_column(
        Enum(MissionStatus, name="mission_status", native_enum=True),
        nullable=False,
        index=True,
        default=MissionStatus.DRAFT,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="missions")
    datasets: Mapped[list[Dataset]] = relationship(
        back_populates="mission", cascade="all, delete-orphan"
    )
