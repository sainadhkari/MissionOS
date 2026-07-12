from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from app.rag.exceptions import ChunkingException

# Conservative character budget per chunk, comfortably under
# text-embedding-3-small's ~8191-token input limit without needing a
# tokenizer dependency just for this.
_MAX_CHUNK_CHARS = 6000


@dataclass
class Chunk:
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


def _format_row(row: pd.Series) -> str:
    parts = [f"{column}: {value}" for column, value in row.items() if pd.notna(value)]
    return "; ".join(parts) if parts else "(all values missing)"


def _schema_chunk(df: pd.DataFrame, *, filename: str) -> Chunk:
    lines = [f"Schema of dataset '{filename}' ({df.shape[0]} rows, {df.shape[1]} columns):"]
    lines.extend(f"- {column} (dtype: {df[column].dtype})" for column in df.columns)
    return Chunk(
        text="\n".join(lines),
        # row_start/row_end are 0 (not None) for the schema chunk — Chroma
        # metadata values must be str/int/float/bool, never None.
        metadata={"chunk_type": "schema", "row_start": 0, "row_end": 0},
    )


def _row_group_chunks(df: pd.DataFrame, *, filename: str, start: int, end: int) -> list[Chunk]:
    """Renders rows `[start, end)` (0-indexed, half-open) as one chunk, or —
    if the rendered text would be too large for a single embedding call —
    recursively halves the group until each piece fits."""
    group = df.iloc[start:end]
    rendered_rows = [
        f"Row {start + offset + 1}: {_format_row(row)}"
        for offset, (_, row) in enumerate(group.iterrows())
    ]
    text = f"Rows from dataset '{filename}' (rows {start + 1}-{end}):\n" + "\n".join(rendered_rows)

    if len(text) <= _MAX_CHUNK_CHARS or end - start <= 1:
        metadata = {"chunk_type": "rows", "row_start": start + 1, "row_end": end}
        return [Chunk(text=text, metadata=metadata)]

    midpoint = start + (end - start) // 2
    return _row_group_chunks(df, filename=filename, start=start, end=midpoint) + _row_group_chunks(
        df, filename=filename, start=midpoint, end=end
    )


def chunk_dataframe(df: pd.DataFrame, *, filename: str, row_group_size: int = 25) -> list[Chunk]:
    """Splits a parsed dataset into row-aligned, readable text chunks for
    embedding. A chunk never splits a single row; any group whose rendered
    text is too large for one embedding call is halved recursively rather
    than silently truncated. The first chunk is always a schema summary
    (column names + types), since "what columns does this dataset have" is
    itself a common thing to retrieve for — this works uniformly across CSV,
    XLSX, and JSON sources since `dataset_validation_service` already
    normalizes all three into a `pandas.DataFrame` before this ever runs.
    """
    if row_group_size < 1:
        raise ChunkingException("row_group_size must be at least 1.")
    if df.shape[1] == 0:
        raise ChunkingException("Dataset has no columns to chunk.")

    chunks = [_schema_chunk(df, filename=filename)]

    total_rows = df.shape[0]
    for start in range(0, total_rows, row_group_size):
        end = min(start + row_group_size, total_rows)
        chunks.extend(_row_group_chunks(df, filename=filename, start=start, end=end))

    return chunks
