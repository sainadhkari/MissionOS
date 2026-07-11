import logging
import uuid

from app.database.session import SessionLocal
from app.models.enums import DatasetUploadStatus
from app.repositories.dataset_repository import DatasetRepository
from app.services import dataset_profile_service
from app.services.dataset_validation_service import DatasetValidationError, validate_and_read

logger = logging.getLogger("missionos.dataset_profiling")


def run_dataset_profiling(dataset_id: uuid.UUID) -> None:
    """Runs as a FastAPI BackgroundTask after upload, so it owns its own DB
    session — the request-scoped session is already closed by the time this runs."""
    db = SessionLocal()
    try:
        dataset = DatasetRepository(db).get_by_id(dataset_id)
        if dataset is None:
            return

        dataset.upload_status = DatasetUploadStatus.VALIDATING
        db.commit()

        try:
            parsed = validate_and_read(dataset)
            dataset_profile_service.save_profile(db, dataset=dataset, parsed=parsed)
            dataset.upload_status = DatasetUploadStatus.READY
        except DatasetValidationError as exc:
            dataset_profile_service.save_validation_failure(db, dataset=dataset, errors=exc.errors)
            dataset.upload_status = DatasetUploadStatus.FAILED
        except Exception:
            logger.exception("Unexpected error profiling dataset %s", dataset_id)
            dataset_profile_service.save_validation_failure(
                db, dataset=dataset, errors=["Unexpected error while validating this file."]
            )
            dataset.upload_status = DatasetUploadStatus.FAILED

        db.commit()
    finally:
        db.close()
