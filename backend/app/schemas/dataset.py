import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import DatasetUploadStatus


class DatasetColumnInfo(BaseModel):
    name: str
    dtype: str
    category: str
    missing_count: int


class DatasetProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    row_count: int
    column_count: int
    columns: list[DatasetColumnInfo]
    missing_values: dict[str, int]
    duplicate_row_count: int
    numeric_summary: dict[str, Any]
    categorical_summary: dict[str, Any]
    encoding: str | None
    delimiter: str | None
    validation_errors: list[str] | None
    created_at: datetime
    updated_at: datetime


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mission_id: uuid.UUID
    original_filename: str
    file_type: str
    file_size: int
    upload_status: DatasetUploadStatus
    created_at: datetime
    profile: DatasetProfileResponse | None
