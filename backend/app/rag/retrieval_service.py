import uuid

from app.rag.embedding_service import EmbeddingClient
from app.rag.vector_store import VectorMatch, VectorStore


def mission_collection_name(mission_id: uuid.UUID) -> str:
    """The single source of truth for how a mission's Chroma collection is
    named — every dataset attached to a mission shares one collection, so a
    mission's agents can retrieve across all of its datasets in one query."""
    return f"mission_{mission_id}"


class RetrievalService:
    """Embeds a query and retrieves the top-k most similar chunks from a
    mission's vector collection. Depends only on `EmbeddingClient` and
    `VectorStore`, both injected — mirrors every other service in `app.ai`/
    `app.rag` that takes its dependencies as constructor arguments rather
    than importing a concrete implementation directly.
    """

    def __init__(
        self, embedding_client: EmbeddingClient, vector_store: VectorStore, *, top_k: int
    ) -> None:
        self._embedding_client = embedding_client
        self._vector_store = vector_store
        self._top_k = top_k

    async def retrieve(self, *, mission_id: uuid.UUID, query_text: str) -> list[VectorMatch]:
        collection = mission_collection_name(mission_id)
        if self._vector_store.count(collection) == 0:
            return []

        embeddings = await self._embedding_client.embed([query_text])
        if not embeddings:
            return []

        return self._vector_store.query(
            collection, query_embedding=embeddings[0], top_k=self._top_k
        )
