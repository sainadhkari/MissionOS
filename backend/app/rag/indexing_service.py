import asyncio
import logging
import uuid

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.vector_storage import VECTOR_STORE_DIR
from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.rag.chunking import chunk_dataframe
from app.rag.embedding_service import EmbeddingClient, OpenAIEmbeddingClient
from app.rag.exceptions import RagException
from app.rag.retrieval_service import mission_collection_name
from app.rag.vector_store import ChromaVectorStore, VectorStore
from app.repositories.dataset_index_repository import DatasetIndexRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.dataset_validation_service import ParsedDataset, validate_and_read

logger = logging.getLogger("missionos.rag.indexing")


def build_rag_components() -> tuple[EmbeddingClient, VectorStore]:
    # `settings` (not `get_settings()`): this runs outside FastAPI's
    # dependency graph, same convention `mission_analysis_service.
    # _build_orchestrator()` and `alembic/env.py` use.
    return OpenAIEmbeddingClient(settings), ChromaVectorStore(VECTOR_STORE_DIR)


async def index_dataset(
    db: Session,
    *,
    dataset: Dataset,
    parsed: ParsedDataset,
    embedding_client: EmbeddingClient,
    vector_store: VectorStore,
) -> None:
    """Chunks, embeds, and upserts one dataset's content into its mission's
    vector collection, then records the outcome on `DatasetIndex`. Deletes
    this dataset's existing chunks first, so calling this again — a manual
    re-index, or a future re-run after replacing the file — fully replaces
    the old vectors rather than duplicating or leaving stale ones behind.

    Indexing failures are caught here and recorded on `DatasetIndex.status`;
    they never propagate to the caller, since RAG indexing is additive and
    must never fail the dataset upload/profiling flow it's chained onto.
    """
    repo = DatasetIndexRepository(db)
    collection = mission_collection_name(dataset.mission_id)

    try:
        vector_store.delete_where(collection, where={"dataset_id": str(dataset.id)})

        chunks = chunk_dataframe(
            parsed.dataframe,
            filename=dataset.original_filename,
            row_group_size=settings.rag_chunk_row_size,
        )
        embeddings = await embedding_client.embed([chunk.text for chunk in chunks])

        ids = [f"{dataset.id}:{index}" for index in range(len(chunks))]
        metadatas = [
            {
                "dataset_id": str(dataset.id),
                "mission_id": str(dataset.mission_id),
                "filename": dataset.original_filename,
                **chunk.metadata,
            }
            for chunk in chunks
        ]
        vector_store.upsert(
            collection,
            ids=ids,
            documents=[chunk.text for chunk in chunks],
            embeddings=embeddings,
            metadatas=metadatas,
        )

        repo.mark_indexed(
            dataset.id,
            chunk_count=len(chunks),
            embedding_model=settings.openai_embedding_model,
            vector_collection=collection,
        )
    except RagException as exc:
        logger.warning(
            "RAG indexing failed for dataset %s: %s: %s", dataset.id, type(exc).__name__, exc
        )
        repo.mark_failed(dataset.id, error_message=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error indexing dataset %s", dataset.id)
        repo.mark_failed(dataset.id, error_message=f"Unexpected error: {exc}")


def run_dataset_indexing(dataset_id: uuid.UUID) -> None:
    """Standalone entry point for a manual re-index (POST
    /datasets/{id}/reindex) — owns its own DB session and re-reads the file
    from disk, mirroring `dataset_profiling_pipeline.run_dataset_profiling`'s
    shape. The automatic post-upload path doesn't use this function; it
    calls `index_dataset` directly from inside the profiling pipeline,
    reusing the dataframe already parsed there instead of re-reading the
    file a second time."""
    db = SessionLocal()
    try:
        dataset = DatasetRepository(db).get_by_id(dataset_id)
        if dataset is None:
            return

        DatasetIndexRepository(db).mark_indexing(dataset_id)
        db.commit()

        try:
            parsed = validate_and_read(dataset)
        except Exception as exc:
            DatasetIndexRepository(db).mark_failed(
                dataset_id, error_message=f"Could not read file: {exc}"
            )
            db.commit()
            return

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
    finally:
        db.close()
