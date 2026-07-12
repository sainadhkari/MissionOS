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
# Matches the `original_filename` column's String(255) — reject before the
# DB does, with a clear error instead of an opaque constraint failure.
_MAX_FILENAME_LENGTH = 255


class DatasetNotFoundError(Exception):
    pass


class UnsupportedFileTypeError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


class InvalidFilenameError(Exception):
    pass


def _extract_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _validate_filename(filename: str) -> None:
    """`filename` is only ever stored as metadata (never used to build a
    filesystem path — see app/core/storage.py), so this isn't a path-
    traversal check. It rejects the two things that are still real problems
    regardless: control/null characters (never legitimate in a filename, and
    can cause confusing behavior wherever the name is later displayed or
    logged) and anything too long for the `original_filename` DB column.
    """
    if not filename:
        raise InvalidFilenameError("Filename is required.")
    if len(filename) > _MAX_FILENAME_LENGTH:
        raise InvalidFilenameError(f"Filename exceeds {_MAX_FILENAME_LENGTH} characters.")
    if any(ord(char) < 32 for char in filename):
        raise InvalidFilenameError("Filename contains invalid control characters.")


def list_datasets(db: Session, *, user: User, mission_id: uuid.UUID) -> list[Dataset]:
    mission_service.get_mission(db, user=user, mission_id=mission_id)
    return DatasetRepository(db).list_for_mission(mission_id)


def upload_dataset(
    db: Session, *, user: User, mission_id: uuid.UUID, upload: UploadFile
) -> Dataset:
    mission_service.get_mission(db, user=user, mission_id=mission_id)

    _validate_filename(upload.filename or "")

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
