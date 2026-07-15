import uuid

from app.rag.embedding_service import EmbeddingClient
from app.rag.vector_store import VectorMatch, VectorStore

# How close a row-level chunk's score has to be to a schema chunk's before
# that schema chunk gets bumped for it. The schema chunk is short, dense
# column-name text that partially echoes almost any query, so it
# structurally out-scores row data even when a row chunk would answer the
# question better -- this margin lets a "close enough" row chunk win instead.
_SCHEMA_CHUNK_SCORE_MARGIN = 0.05

# How many extra candidates retrieve() fetches beyond top_k, so there's
# something to backfill with if one or more schema chunks get demoted. A
# mission can have multiple datasets attached, each contributing its own
# schema chunk to the mission's single shared collection (see
# `mission_collection_name`), so more than one can land in the window at
# once -- this comfortably covers demoting every schema chunk for any
# realistically-sized mission without needing to know the exact dataset
# count up front.
_SCHEMA_CHUNK_BACKFILL_BUDGET = 5


def mission_collection_name(mission_id: uuid.UUID) -> str:
    """The single source of truth for how a mission's Chroma collection is
    named — every dataset attached to a mission shares one collection, so a
    mission's agents can retrieve across all of its datasets in one query."""
    return f"mission_{mission_id}"


def _demote_schema_chunk(matches: list[VectorMatch], *, top_k: int) -> list[VectorMatch]:
    """Row-level chunks are the only ones that can answer "what happened in
    the data" questions, but a schema chunk (see `app.rag.chunking.
    _schema_chunk`) structurally wins embedding similarity regardless of
    query wording. For every schema chunk that placed within the requested
    `top_k`, if at least one row chunk scored within
    `_SCHEMA_CHUNK_SCORE_MARGIN` of it, drop that schema chunk and let the
    next-best row chunk (from the extra candidates `retrieve()` fetches for
    exactly this purpose) take its place instead. A multi-dataset mission
    can have more than one schema chunk in the window at once (one per
    dataset, all sharing the mission's collection) -- each is evaluated
    independently, so one dataset's schema chunk can be demoted while
    another's is kept, if only one has a close-enough row-chunk competitor.
    Leaves the ranking untouched otherwise -- a schema-only dataset, or a
    query a schema chunk clearly wins by a wide margin, still returns it.
    """
    window = matches[:top_k]
    schema_indices = [
        index for index, match in enumerate(window) if match.metadata.get("chunk_type") == "schema"
    ]
    if not schema_indices:
        return window

    row_matches = [match for match in matches if match.metadata.get("chunk_type") != "schema"]
    if not row_matches:
        return window

    demote_indices = {
        index
        for index in schema_indices
        if any(
            match.score >= window[index].score - _SCHEMA_CHUNK_SCORE_MARGIN for match in row_matches
        )
    }
    if not demote_indices:
        return window

    kept = [match for index, match in enumerate(matches) if index not in demote_indices]
    return kept[:top_k]


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

        # Fetch extra candidates beyond top_k so row chunks are available to
        # backfill with if `_demote_schema_chunk` bumps one or more schema
        # chunks (see `_SCHEMA_CHUNK_BACKFILL_BUDGET`).
        matches = self._vector_store.query(
            collection,
            query_embedding=embeddings[0],
            top_k=self._top_k + _SCHEMA_CHUNK_BACKFILL_BUDGET,
        )
        return _demote_schema_chunk(matches, top_k=self._top_k)
