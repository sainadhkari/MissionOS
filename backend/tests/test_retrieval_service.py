from app.rag.retrieval_service import _demote_schema_chunk
from app.rag.vector_store import VectorMatch


def _match(id_: str, chunk_type: str, score: float) -> VectorMatch:
    return VectorMatch(id=id_, text=f"text-{id_}", metadata={"chunk_type": chunk_type}, score=score)


def test_schema_chunk_kept_when_it_wins_by_a_wide_margin():
    matches = [
        _match("schema", "schema", 0.90),
        _match("row1", "rows", 0.50),
        _match("row2", "rows", 0.40),
    ]

    result = _demote_schema_chunk(matches, top_k=2)

    assert [m.id for m in result] == ["schema", "row1"]


def test_schema_chunk_demoted_and_backfilled_when_a_row_chunk_scores_close():
    matches = [
        _match("schema", "schema", 0.52),
        _match("row1", "rows", 0.50),
        _match("row2", "rows", 0.48),
    ]

    result = _demote_schema_chunk(matches, top_k=2)

    assert [m.id for m in result] == ["row1", "row2"]


def test_no_schema_chunk_present_leaves_ranking_untouched():
    matches = [
        _match("row1", "rows", 0.5),
        _match("row2", "rows", 0.4),
    ]

    result = _demote_schema_chunk(matches, top_k=2)

    assert [m.id for m in result] == ["row1", "row2"]


def test_schema_chunk_already_outside_top_k_is_dropped_without_special_handling():
    matches = [
        _match("row1", "rows", 0.9),
        _match("row2", "rows", 0.8),
        _match("schema", "schema", 0.1),
    ]

    result = _demote_schema_chunk(matches, top_k=2)

    assert [m.id for m in result] == ["row1", "row2"]


def test_schema_only_dataset_keeps_the_schema_chunk():
    matches = [_match("schema", "schema", 0.9)]

    result = _demote_schema_chunk(matches, top_k=2)

    assert [m.id for m in result] == ["schema"]


def test_multiple_schema_chunks_all_demoted_when_all_have_close_row_matches():
    # Two datasets attached to the same mission -- two schema chunks, both
    # within the top_k window and both narrowly beaten by a row chunk.
    matches = [
        _match("schema_a", "schema", 0.55),
        _match("schema_b", "schema", 0.53),
        _match("row1", "rows", 0.52),
        _match("row2", "rows", 0.50),
        _match("row3", "rows", 0.48),
    ]

    result = _demote_schema_chunk(matches, top_k=3)

    assert [m.id for m in result] == ["row1", "row2", "row3"]


def test_multiple_schema_chunks_only_the_close_one_is_demoted():
    # schema_a wins by a wide margin (no row chunk comes close) and should
    # be kept; schema_b is narrowly beaten by a row chunk and should be
    # demoted -- each schema chunk is judged independently.
    matches = [
        _match("schema_a", "schema", 0.95),
        _match("schema_b", "schema", 0.52),
        _match("row1", "rows", 0.50),
        _match("row2", "rows", 0.40),
    ]

    result = _demote_schema_chunk(matches, top_k=3)

    assert [m.id for m in result] == ["schema_a", "row1", "row2"]


def test_small_collection_returns_fewer_than_top_k_without_raising():
    # A dataset with very few chunks: the vector store has fewer total
    # matches than top_k + the backfill budget, so `retrieve()` would pass
    # in a short list here regardless of what it requested.
    matches = [
        _match("schema", "schema", 0.6),
        _match("row1", "rows", 0.58),
    ]

    result = _demote_schema_chunk(matches, top_k=6)

    assert [m.id for m in result] == ["row1"]
