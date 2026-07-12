from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.rag.exceptions import VectorStoreException


@dataclass
class VectorMatch:
    id: str
    text: str
    metadata: dict[str, Any]
    # Higher is more relevant. Concrete stores may use different underlying
    # distance metrics; each is responsible for normalizing to this shape.
    score: float


class VectorStore(ABC):
    """Reusable interface for a vector database — mirrors `app.ai.client.
    AIClient`'s provider-agnostic shape, so nothing outside this module
    hardcodes Chroma specifically. Every method is collection-scoped: this
    codebase uses one collection per mission (see
    `app.rag.retrieval_service.mission_collection_name`), so a dataset's
    vectors always live alongside its mission's other datasets."""

    @abstractmethod
    def upsert(
        self,
        collection: str,
        *,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_where(self, collection: str, *, where: dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def query(
        self, collection: str, *, query_embedding: list[float], top_k: int
    ) -> list[VectorMatch]:
        raise NotImplementedError

    @abstractmethod
    def count(self, collection: str) -> int:
        raise NotImplementedError


@lru_cache
def _get_chroma_client(persist_dir: str) -> Any:
    """A single Chroma client per persist directory, reused for the life of
    the process — unlike `OpenAIClient`/`PromptLoader` (cheap and stateless,
    constructed fresh per use), a `PersistentClient` owns an on-disk index
    and is meant to be reused, the same way `database/session.py`'s `engine`
    is a module-level singleton rather than reconstructed per call."""
    import chromadb

    return chromadb.PersistentClient(path=persist_dir)


class ChromaVectorStore(VectorStore):
    def __init__(self, persist_dir: Path) -> None:
        self._client = _get_chroma_client(str(persist_dir))

    def _collection(self, name: str) -> Any:
        try:
            return self._client.get_or_create_collection(name)
        except Exception as exc:
            raise VectorStoreException(f"Could not open collection '{name}': {exc}") from exc

    def upsert(
        self,
        collection: str,
        *,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        if not ids:
            return
        try:
            self._collection(collection).upsert(
                ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas
            )
        except Exception as exc:
            raise VectorStoreException(f"Could not upsert into '{collection}': {exc}") from exc

    def delete_where(self, collection: str, *, where: dict[str, Any]) -> None:
        try:
            coll = self._collection(collection)
            if coll.count() == 0:
                return
            coll.delete(where=where)
        except Exception as exc:
            raise VectorStoreException(f"Could not delete from '{collection}': {exc}") from exc

    def query(
        self, collection: str, *, query_embedding: list[float], top_k: int
    ) -> list[VectorMatch]:
        coll = self._collection(collection)
        available = coll.count()
        if available == 0:
            return []

        try:
            result = coll.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, available),
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            raise VectorStoreException(f"Could not query '{collection}': {exc}") from exc

        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        return [
            VectorMatch(
                id=id_,
                text=document,
                metadata=dict(metadata or {}),
                # Chroma's default space is L2 distance (lower = closer);
                # remapped to a 0..1-ish "higher is closer" score so callers
                # and prompts don't need to know the underlying metric.
                score=1.0 / (1.0 + distance),
            )
            for id_, document, metadata, distance in zip(
                ids, documents, metadatas, distances, strict=True
            )
        ]

    def count(self, collection: str) -> int:
        return self._collection(collection).count()
