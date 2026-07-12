from pydantic import BaseModel, Field


class RetrievalStats(BaseModel):
    """A snapshot of the single shared retrieval call made once per analysis
    run (see `mission_analysis_service._retrieve_context`) — persisted onto
    `MissionAnalysis.retrieval_stats` so reports can show genuine RAG
    metrics instead of recomputing (or fabricating) them after the fact.
    """

    query: str
    top_k: int
    chunks_retrieved: int
    average_similarity_score: float | None = None
    retrieval_time_ms: float
    sources: list[str] = Field(default_factory=list)
    embedding_model: str
    vector_store: str = "ChromaDB"
    # Total character length of every retrieved chunk's text, summed —
    # a genuine measurement of how much retrieved context the agents
    # received, not a token count (no tokenizer dependency for this).
    # `None` only for analyses persisted before this field existed.
    total_context_chars: int | None = None
