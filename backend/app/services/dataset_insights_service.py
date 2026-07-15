import math
import re
from typing import Any

import numpy as np
import pandas as pd

_MIN_ROWS_FOR_INSIGHTS = 5
_MIN_GROUP_CARDINALITY = 2
_MAX_GROUP_CARDINALITY = 100
_MAX_GROUP_COLUMNS = 3
_MAX_METRIC_COLUMNS = 3
_TOP_N_GROUPS = 5
_TOP_N_CORRELATIONS = 3
# Absolute ceiling on one metric column's correlation list once
# mission-relevant entries are added on top of the top-N-by-magnitude ones --
# prioritizing relevant columns within a cap, not removing the cap (a
# payload with dozens of forced-relevant correlations would be its own
# problem). See `_correlations`.
_MAX_TOTAL_CORRELATIONS_PER_METRIC = 6

# Common English words filtered out of both the mission text and column
# names before checking for overlap -- deliberately just a stopword list,
# not a minimum-length cutoff, since real column names are often short and
# meaningful (e.g. "CPI") and a length filter would silently break the
# exact case this exists to catch.
_STOPWORDS = frozenset(
    {
        "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
        "is", "are", "by", "this", "that", "as", "at", "it", "its", "from",
        "be", "will", "can", "which", "our", "we", "into", "than", "then",
    }
)  # fmt: skip


def _to_jsonable(value: Any) -> Any:
    """Recursively converts numpy/pandas scalars (not natively JSON-serializable)
    to plain Python values, and NaN/NaT to None. Duplicated from
    dataset_profile_service's helper of the same name rather than imported, so
    this module doesn't reach into another service's private helper."""
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(v) for v in value]
    if value is None:
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _significant_words(text: str) -> set[str]:
    """Lowercases and splits into words, stripping underscores/punctuation
    (e.g. "Fuel_Price" -> {"fuel", "price"}) and dropping common stopwords --
    a simple, dependency-free normalization shared by both the mission text
    and column names so their words can be compared directly."""
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return {word for word in normalized.split() if word and word not in _STOPWORDS}


def _is_mission_relevant(column_name: str, mission_words: set[str]) -> bool:
    """Whether `column_name` is likely referenced in the mission's own
    problem_statement/objective text -- e.g. a "Fuel_Price" column matches
    text mentioning "fuel" and/or "price". Deliberately simple word-overlap,
    not NLP: it only needs to catch a column's own name showing up in what
    the mission explicitly asked about, which is what a purely
    magnitude-based cutoff can miss (see `_correlations`,
    `_prioritize_relevant`). Always `False` when no mission context was
    given, so behavior is unchanged for callers without it."""
    if not mission_words:
        return False
    column_words = _significant_words(column_name)
    return bool(column_words & mission_words)


def _prioritize_relevant(columns: list[str], mission_words: set[str], cap: int) -> list[str]:
    """Reorders `columns` so any mission-relevant column is guaranteed a
    slot within the first `cap` entries, instead of being silently dropped
    because a higher-cardinality or coincidentally-earlier column already
    filled the cap. Relevant columns move to the front (keeping their
    relative order); the rest follow in their original order -- a priority
    reordering, not a full re-sort -- then the combined list is capped."""
    if not mission_words:
        return columns[:cap]
    relevant = [column for column in columns if _is_mission_relevant(str(column), mission_words)]
    rest = [column for column in columns if column not in relevant]
    return (relevant + rest)[:cap]


def _identify_group_columns(df: pd.DataFrame) -> list[str]:
    """Columns generically usable as a grouping dimension: low enough
    cardinality to be a real category, but not a constant."""
    candidates = []
    for column in df.columns:
        nunique = df[column].dropna().nunique()
        if _MIN_GROUP_CARDINALITY <= nunique <= _MAX_GROUP_CARDINALITY:
            candidates.append(column)
    return candidates


def _identify_metric_columns(df: pd.DataFrame) -> list[str]:
    """Numeric columns that behave like a measurable quantity rather than an
    identifier.

    A column with one unique value per row carries no aggregate signal *if*
    it's a genuine identifier (e.g. an incrementing integer primary key) --
    but found live, against the real 6,435-row Walmart Kaggle dataset: a
    precise real-valued measurement (Weekly_Sales, dollars-and-cents) is
    every bit as likely to have zero duplicate values across thousands of
    rows, purely by chance, without being an identifier at all -- and this
    check was silently excluding it, the single most important metric in
    that dataset, from ever being its own group/binary-split metric column.
    Real identifiers are virtually always integer- or string-typed, never a
    precise float, so the "every value is unique" exclusion is now scoped
    to integer-dtype columns only -- a fully-unique float column is treated
    as a genuine continuous metric, not a false primary key.
    """
    row_count = len(df)
    candidates = []
    for column in df.select_dtypes("number").columns:
        series = df[column].dropna()
        if series.nunique() < 2:
            continue
        looks_like_id_column = (
            pd.api.types.is_integer_dtype(df[column]) and df[column].nunique() == row_count
        )
        if looks_like_id_column:
            continue
        candidates.append(column)
    return candidates


def _top_bottom_groups(
    df: pd.DataFrame, group_column: str, metric_column: str
) -> dict[str, Any] | None:
    grouped = df.groupby(group_column)[metric_column].agg(["mean", "sum", "count"])
    grouped = grouped.dropna(subset=["mean"])
    if grouped.empty:
        return None
    ordered = grouped.sort_values("mean", ascending=False)

    def _rows(frame: pd.DataFrame) -> list[dict[str, Any]]:
        return [
            {
                "group": _to_jsonable(index),
                "mean": _to_jsonable(row["mean"]),
                "sum": _to_jsonable(row["sum"]),
                "count": int(row["count"]),
            }
            for index, row in frame.iterrows()
        ]

    return {
        "group_column": str(group_column),
        "metric_column": str(metric_column),
        "top_groups": _rows(ordered.head(_TOP_N_GROUPS)),
        # tail() keeps the frame's overall descending order, so it lands
        # smallest-last -- reversed here to read worst-first, matching top_groups'
        # best-first order.
        "bottom_groups": _rows(ordered.tail(_TOP_N_GROUPS).iloc[::-1]),
    }


def _group_insights(
    df: pd.DataFrame, group_columns: list[str], metric_columns: list[str]
) -> list[dict[str, Any]]:
    """Pairs every given group column with every given metric column.
    Callers are expected to have already applied `_prioritize_relevant`
    (which also caps at `_MAX_GROUP_COLUMNS`/`_MAX_METRIC_COLUMNS`) -- this
    function just iterates whatever it's given, so a mission-relevant
    column that earned a priority slot isn't re-truncated back out here."""
    insights = []
    for group_column in group_columns:
        for metric_column in metric_columns:
            if group_column == metric_column:
                continue
            result = _top_bottom_groups(df, group_column, metric_column)
            if result is not None:
                insights.append(result)
    return insights


def _binary_splits(df: pd.DataFrame, metric_columns: list[str]) -> list[dict[str, Any]]:
    splits = []
    for column in df.columns:
        if df[column].dropna().nunique() != 2:
            continue
        for metric_column in metric_columns:
            if metric_column == column:
                continue
            means = df.groupby(column)[metric_column].mean().dropna()
            if len(means) != 2:
                continue
            mean_by_value = {
                str(_to_jsonable(value)): _to_jsonable(mean) for value, mean in means.items()
            }
            splits.append(
                {
                    "binary_column": str(column),
                    "metric_column": str(metric_column),
                    "mean_by_value": mean_by_value,
                    "difference": _to_jsonable(means.iloc[1] - means.iloc[0]),
                }
            )
    return splits


def _correlations(
    df: pd.DataFrame, metric_columns: list[str], mission_words: set[str]
) -> list[dict[str, Any]]:
    """For each metric column, reports its strongest correlations by
    magnitude, plus -- distinctly flagged -- any other numeric column whose
    name is referenced in the mission's own text, even if its correlation
    is too weak to have made the magnitude-based cut on its own. A
    weak-but-directly-asked-about relationship is more useful to an agent
    than a moderate one nobody asked about; the top-N-by-magnitude entries
    are never removed to make room, only added to, up to
    `_MAX_TOTAL_CORRELATIONS_PER_METRIC`."""
    numeric_df = df.select_dtypes("number")
    if numeric_df.shape[1] < 2:
        return []
    corr_matrix = numeric_df.corr()

    results = []
    for column in metric_columns:
        if column not in corr_matrix.columns:
            continue
        correlations = corr_matrix[column].drop(index=column, errors="ignore").dropna()
        if correlations.empty:
            continue
        ordered = correlations.reindex(correlations.abs().sort_values(ascending=False).index)

        top_by_magnitude = list(ordered.head(_TOP_N_CORRELATIONS).items())
        selected_names = {name for name, _ in top_by_magnitude}
        relevant_extras = [
            (name, value)
            for name, value in ordered.items()
            if name not in selected_names and _is_mission_relevant(str(name), mission_words)
        ]
        combined = (top_by_magnitude + relevant_extras)[:_MAX_TOTAL_CORRELATIONS_PER_METRIC]
        if not combined:
            continue

        # `mission_relevant` marks only the entries that are present *because*
        # of the relevance guarantee -- i.e. `relevant_extras` -- not
        # top-by-magnitude entries that happen to also match, since those
        # need no explanation for why they're shown (their magnitude alone
        # justifies it). This lets a renderer correctly say "here because of
        # relevance, not strength" only where that's actually true.
        relevant_extra_names = {name for name, _ in relevant_extras}
        top_correlations = []
        for other, value in combined:
            entry: dict[str, Any] = {"column": str(other), "correlation": round(float(value), 3)}
            if other in relevant_extra_names:
                entry["mission_relevant"] = True
            top_correlations.append(entry)

        results.append({"metric_column": str(column), "top_correlations": top_correlations})
    return results


def compute_dataset_insights(
    df: pd.DataFrame,
    *,
    mission_problem_statement: str | None = None,
    mission_objective: str | None = None,
) -> dict[str, Any]:
    """Computes generic cross-column aggregate insights -- group comparisons,
    binary-flag splits, correlations -- that go beyond dataset_profile_service's
    per-column summaries. Column names are never hardcoded: candidates are
    discovered from cardinality/dtype alone, so this works on any dataset.

    `mission_problem_statement`/`mission_objective` are optional -- when
    given, a column whose name is referenced in that text gets a priority
    slot in group/metric column selection and a guaranteed (distinctly
    flagged) slot in its correlation list, even if it wouldn't otherwise
    survive the magnitude-based cutoffs (`_MAX_GROUP_COLUMNS`/
    `_MAX_METRIC_COLUMNS`/`_TOP_N_CORRELATIONS`) -- see `_is_mission_relevant`.
    Omitting both keeps every result identical to the mission-agnostic
    behavior this function had before mission context existed here at all.
    """
    if len(df) < _MIN_ROWS_FOR_INSIGHTS:
        note = f"Dataset has fewer than {_MIN_ROWS_FOR_INSIGHTS} rows; skipped aggregate insights."
        return {"notes": [note]}

    mission_words = _significant_words(
        f"{mission_problem_statement or ''} {mission_objective or ''}"
    )

    notes: list[str] = []
    group_columns = _identify_group_columns(df)
    metric_columns = _identify_metric_columns(df)

    if not group_columns:
        notes.append("No categorical/low-cardinality columns found for group comparisons.")
    if not metric_columns:
        notes.append("No numeric metric columns found for group comparisons.")

    group_insights: list[dict[str, Any]] = []
    if group_columns and metric_columns:
        prioritized_group_columns = _prioritize_relevant(
            group_columns, mission_words, _MAX_GROUP_COLUMNS
        )
        prioritized_metric_columns = _prioritize_relevant(
            metric_columns, mission_words, _MAX_METRIC_COLUMNS
        )
        group_insights = _group_insights(df, prioritized_group_columns, prioritized_metric_columns)
    binary_splits = _binary_splits(df, metric_columns) if metric_columns else []
    correlations = _correlations(df, metric_columns, mission_words) if metric_columns else []

    return _to_jsonable(
        {
            "group_insights": group_insights,
            "binary_splits": binary_splits,
            "correlations": correlations,
            "notes": notes,
        }
    )
