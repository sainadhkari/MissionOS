import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DatasetUploadStatus


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mission_id: uuid.UUID
    original_filename: str
    file_type: str
    file_size: int
    upload_status: DatasetUploadStatus
    created_at: datetime
