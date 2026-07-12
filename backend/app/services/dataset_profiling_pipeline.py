import asyncio
import logging
import uuid

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.models.enums import DatasetUploadStatus
from app.rag.indexing_service import build_rag_components, index_dataset
from app.repositories.dataset_index_repository import DatasetIndexRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services import dataset_profile_service
from app.services.dataset_validation_service import (
    DatasetValidationError,
    ParsedDataset,
    validate_and_read,
)

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

        parsed: ParsedDataset | None = None
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

        if parsed is not None and dataset.upload_status == DatasetUploadStatus.READY:
            _index_after_profiling(db, dataset, parsed)
    finally:
        db.close()


def _index_after_profiling(db: Session, dataset: Dataset, parsed: ParsedDataset) -> None:
    """Chains automatic RAG indexing onto a successful profiling run, in the
    same background task, so the file is only read/parsed once. Indexing
    failures are isolated to `DatasetIndex.status` — they never affect
    `Dataset.upload_status`, which reflects profiling/validation only."""
    DatasetIndexRepository(db).mark_indexing(dataset.id)
    db.commit()

    embedding_client, vector_store = build_rag_components()
    asyncio.run(
        index_dataset(
            db,
            dataset=dataset,
            parsed=parsed,
            embedding_client=embedding_client,
            vector_store=vector_store,
        )
    )
    db.commit()
