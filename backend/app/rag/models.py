from pydantic import BaseModel, Field


class RetrievalStats(BaseModel):
    """A snapshot of an analysis run's retrieval activity — persisted onto
    `MissionAnalysis.retrieval_stats` so reports can show genuine RAG
    metrics instead of recomputing (or fabricating) them after the fact.

    Retrieval now happens once per agent stage rather than once shared
    across all four (see `app.ai.orchestrator.AnalysisOrchestrator.run`), so
    this snapshot is a combined, honest summary of every retrieval call made
    during the run (see `mission_analysis_service._combine_retrieval_stats`)
    rather than one single call's numbers — kept as one object, not one per
    agent, so every existing consumer (the Executive Report's RAG/Retrieval
    Analytics sections, the live AI Collaboration Center) keeps working
    against the same shape unmodified. `query_count` and `per_agent_chunks`
    exist specifically to recover the per-call/per-agent detail that
    combining the rest of the fields loses.
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
    # How many distinct retrieval calls this snapshot combines. Defaults to 1
    # so analyses persisted before per-agent retrieval existed (when this
    # field didn't exist and every run genuinely made exactly one call)
    # still describe themselves correctly.
    query_count: int = 1
    # Maps stage name ("business"/"strategy"/"risk"/"executive") to how many
    # chunks that stage's own context ultimately contained -- lets the
    # Executive Report's Agent Collaboration cards show a real per-agent
    # count instead of the same run-wide total on every card. Empty for
    # analyses persisted before per-agent retrieval existed.
    per_agent_chunks: dict[str, int] = Field(default_factory=dict)
