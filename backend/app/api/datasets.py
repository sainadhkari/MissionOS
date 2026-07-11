import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.dataset import DatasetResponse
from app.services import dataset_service, mission_service

mission_datasets_router = APIRouter(prefix="/missions/{mission_id}/datasets", tags=["datasets"])
dataset_router = APIRouter(prefix="/datasets", tags=["datasets"])


@mission_datasets_router.post(
    "", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED
)
def upload_dataset(
    mission_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dataset:
    try:
        return dataset_service.upload_dataset(
            db, user=current_user, mission_id=mission_id, upload=file
        )
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc
    except dataset_service.UnsupportedFileTypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Allowed types: CSV, XLSX, JSON.",
        ) from exc
    except dataset_service.FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 25 MB size limit.",
        ) from exc


@mission_datasets_router.get("", response_model=list[DatasetResponse])
def list_mission_datasets(
    mission_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Dataset]:
    try:
        return dataset_service.list_datasets(db, user=current_user, mission_id=mission_id)
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc


@dataset_router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dataset:
    try:
        return dataset_service.get_dataset(db, user=current_user, dataset_id=dataset_id)
    except dataset_service.DatasetNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found"
        ) from exc


@dataset_router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        dataset_service.delete_dataset(db, user=current_user, dataset_id=dataset_id)
    except dataset_service.DatasetNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found"
        ) from exc
