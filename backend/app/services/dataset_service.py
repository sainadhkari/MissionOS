import uuid

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.storage import FileTooLargeError as StorageFileTooLargeError
from app.core.storage import delete_upload, save_upload
from app.models.dataset import Dataset
from app.models.enums import DatasetUploadStatus
from app.models.user import User
from app.repositories.dataset_repository import DatasetRepository
from app.services import mission_service

ALLOWED_EXTENSIONS = {"csv", "xlsx", "json"}


class DatasetNotFoundError(Exception):
    pass


class UnsupportedFileTypeError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


def _extract_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def list_datasets(db: Session, *, user: User, mission_id: uuid.UUID) -> list[Dataset]:
    mission_service.get_mission(db, user=user, mission_id=mission_id)
    return DatasetRepository(db).list_for_mission(mission_id)


def upload_dataset(
    db: Session, *, user: User, mission_id: uuid.UUID, upload: UploadFile
) -> Dataset:
    mission_service.get_mission(db, user=user, mission_id=mission_id)

    extension = _extract_extension(upload.filename or "")
    if extension not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(extension)

    try:
        stored_filename, file_size = save_upload(upload, extension=extension)
    except StorageFileTooLargeError as exc:
        raise FileTooLargeError from exc

    dataset = DatasetRepository(db).create(
        mission_id=mission_id,
        original_filename=upload.filename,
        stored_filename=stored_filename,
        file_type=extension,
        file_size=file_size,
        upload_status=DatasetUploadStatus.UPLOADED,
    )
    db.commit()
    db.refresh(dataset)
    return dataset


def get_dataset(db: Session, *, user: User, dataset_id: uuid.UUID) -> Dataset:
    dataset = DatasetRepository(db).get_owned(dataset_id, user.id)
    if dataset is None:
        raise DatasetNotFoundError(dataset_id)
    return dataset


def delete_dataset(db: Session, *, user: User, dataset_id: uuid.UUID) -> None:
    repo = DatasetRepository(db)
    dataset = repo.get_owned(dataset_id, user.id)
    if dataset is None:
        raise DatasetNotFoundError(dataset_id)

    delete_upload(dataset.stored_filename)
    repo.delete(dataset)
    db.commit()
