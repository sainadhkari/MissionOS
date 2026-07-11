import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MissionPriority, MissionStatus

_TEXT_MAX_LENGTH = 5000


class MissionCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    business_domain: str = Field(min_length=1, max_length=255)
    priority: MissionPriority
    problem_statement: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)
    objective: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)
    expected_output: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)


class MissionUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    business_domain: str = Field(min_length=1, max_length=255)
    priority: MissionPriority
    problem_statement: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)
    objective: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)
    expected_output: str = Field(min_length=1, max_length=_TEXT_MAX_LENGTH)
    status: MissionStatus


class MissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    business_domain: str
    priority: MissionPriority
    problem_statement: str
    objective: str
    expected_output: str
    status: MissionStatus
    created_at: datetime
    updated_at: datetime
