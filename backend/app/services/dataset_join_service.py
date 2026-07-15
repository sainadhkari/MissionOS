"""Detects and executes safe cross-dataset joins for a mission's attached
datasets, so `compute_dataset_insights` (dataset_insights_service.py) can
also run against a *joined* view — e.g. a sales fact table joined to a
store dimension table on a shared Store identifier.

SCOPE -- read before assuming this handles "the Walmart Kaggle dataset" as a
whole: it handles single-column fact-to-dimension joins ONLY. Concretely,
of the well-known three-file Walmart split (train.csv + stores.csv +
features.csv):

- train.csv <-> stores.csv (both share Store; stores.csv has one row per
  Store, a genuine dimension) -- THIS is what this module solves, and it's
  the case that's been verified against the real files end-to-end.
- train.csv <-> features.csv is NOT solved here, and can't be with a
  single-column key: both are grained by Store *and* Date (many rows per
  store, one per date) -- there is no dimension side. A Store-only join
  between them would silently explode into a many-to-many cross product,
  exactly as unsafe as the fact-fact case `_build_candidate` rejects
  elsewhere in this file, so it's rejected the same way. Joining them
  correctly needs a composite (Store, Date) key, which this module
  deliberately does not attempt -- a reasonable follow-up, not part of
  this pass. Don't read "multi-dataset joins" support as "the three-file
  case is solved" -- it's the two-file, single-key case that is.

Every join here is inner, and only ever "many fact rows to at most one
dimension row" -- never fact-to-fact. See `build_joined_dataframe` for why
inner (not left/outer) is the right default for feeding aggregate insights.
"""

import re
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from app.services.dataset_insights_service import compute_dataset_insights

# ">50%" per the task this was built for -- confident enough that a name
# match reflects a real shared key, not a coincidence (e.g. two unrelated
# datasets both happening to have a low-cardinality "id"/"code" column with
# barely-overlapping values).
_MIN_OVERLAP_RATIO = 0.5


def _normalize_column_name(name: str) -> str:
    """Lowercases and strips everything but letters/digits, so "Store",
    "store_id", and "STORE ID" are all recognized as the same candidate key
    -- matching column names is only the first filter, not proof of a real
    relationship (see `_build_candidate`'s overlap check)."""
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


@dataclass(frozen=True)
class JoinKeyCandidate:
    """One detected, safety-checked opportunity to join 2+ datasets on a
    shared column.

    `base_dataset` is the fact-grain table the join is built around (or, if
    every participant's key is unique, an arbitrary but deterministic choice
    among them). `dimension_datasets` maps each other dataset's name to its
    own column name for this key (which may differ in case/spelling from
    the base's -- e.g. "store_id" vs "Store") -- only datasets that passed
    *both* the uniqueness safety check and the value-overlap threshold are
    included. `excluded_datasets` records every other dataset that shared
    this normalized column name but didn't qualify (a second fact-grain
    table, or one with too little value overlap), so callers/tests can see
    *why* it was left out, not just that it was.
    """

    key_name: str
    base_dataset: str
    dimension_datasets: dict[str, str]
    overlap_ratios: dict[str, float]
    excluded_datasets: tuple[str, ...] = field(default_factory=tuple)


def _is_dimension_column(df: pd.DataFrame, column: str) -> bool:
    """Whether `column` acts as a genuine primary key in `df` -- every
    non-null value distinct. This is the safety gate that makes a join safe
    regardless of how many times the key repeats on the *other* side: a
    fact-grain frame merged against a true one-row-per-key dimension can
    never gain rows, no matter how large the fact side already is."""
    non_null = df[column].dropna()
    return len(non_null) > 0 and non_null.nunique() == len(non_null)


def _overlap_ratio(base_values: set[Any], other_values: set[Any]) -> float:
    """Containment, not Jaccard: a dimension table's key set should be
    (near-)fully contained in the fact table's, but the fact table's key
    set is expected to be a repeated subset, not the same size -- dividing
    by the smaller side's cardinality is what a real foreign-key
    relationship actually looks like."""
    if not base_values or not other_values:
        return 0.0
    return len(base_values & other_values) / min(len(base_values), len(other_values))


def _build_candidate(
    dataframes: dict[str, pd.DataFrame], columns: dict[str, str], min_overlap_ratio: float
) -> JoinKeyCandidate | None:
    """Given one normalized key name and the (dataset -> its own column
    name) map of every dataset that has it, decides whether a safe join
    exists at all, and if so, which datasets participate in it.
    """
    dimension_names = []
    fact_names = []
    for dataset_name, column in columns.items():
        df = dataframes[dataset_name]
        if df[column].dropna().empty:
            continue
        if _is_dimension_column(df, column):
            dimension_names.append(dataset_name)
        else:
            fact_names.append(dataset_name)

    if not dimension_names:
        # No participant's key is a genuine primary key for its own
        # dataframe -- e.g. train.csv and features.csv both repeat Store
        # once per date. Joining two "many" sides on this column alone
        # would silently explode into a many-to-many cross product (every
        # train row for a store matched against every features row for
        # that same store), not a real join -- rejected outright rather
        # than attempted.
        return None

    excluded: list[str] = []
    if fact_names:
        # Exactly one fact-grain table becomes the join's spine. If 2+
        # datasets are all fact-grain for this key, only the largest is
        # kept -- combining two fact tables on a single column isn't safe
        # (same many-to-many risk as above), so the rest are excluded from
        # *this* join rather than forced into one.
        fact_names.sort(key=lambda name: len(dataframes[name]), reverse=True)
        base_name = fact_names[0]
        excluded.extend(fact_names[1:])
    else:
        # Every participant's key is unique -- a pure 1:1 relationship.
        # Any of them can serve as the base; pick deterministically.
        base_name = sorted(dimension_names)[0]
        dimension_names = [name for name in dimension_names if name != base_name]

    base_column = columns[base_name]
    base_values = set(dataframes[base_name][base_column].dropna())

    accepted: dict[str, str] = {}
    overlap_ratios: dict[str, float] = {}
    for name in dimension_names:
        column = columns[name]
        other_values = set(dataframes[name][column].dropna())
        ratio = _overlap_ratio(base_values, other_values)
        if ratio >= min_overlap_ratio:
            accepted[name] = column
            overlap_ratios[name] = round(ratio, 4)
        else:
            excluded.append(name)

    if not accepted:
        return None

    return JoinKeyCandidate(
        key_name=base_column,
        base_dataset=base_name,
        dimension_datasets=accepted,
        overlap_ratios=overlap_ratios,
        excluded_datasets=tuple(excluded),
    )


def detect_join_keys(
    dataframes: dict[str, pd.DataFrame], *, min_overlap_ratio: float = _MIN_OVERLAP_RATIO
) -> list[JoinKeyCandidate]:
    """Finds every safe, confidently-shared join key across `dataframes`
    (keyed by dataset name/id -- any hashable label the caller finds
    convenient). Returns candidates sorted best-first (most datasets
    joined, then highest total overlap), so a caller that only wants one
    "primary" cross-dataset join can just take `candidates[0]` (see
    `compute_cross_dataset_insights`)."""
    if len(dataframes) < 2:
        return []

    columns_by_normalized: dict[str, dict[str, str]] = {}
    for dataset_name, df in dataframes.items():
        for column in df.columns:
            normalized = _normalize_column_name(column)
            if not normalized:
                continue
            columns_by_normalized.setdefault(normalized, {})[dataset_name] = str(column)

    candidates = []
    for columns in columns_by_normalized.values():
        if len(columns) < 2:
            continue
        candidate = _build_candidate(dataframes, columns, min_overlap_ratio)
        if candidate is not None:
            candidates.append(candidate)

    candidates.sort(
        key=lambda c: (len(c.dimension_datasets), sum(c.overlap_ratios.values())),
        reverse=True,
    )
    return candidates


def build_joined_dataframe(
    dataframes: dict[str, pd.DataFrame], candidate: JoinKeyCandidate
) -> pd.DataFrame:
    """Inner-joins `candidate.base_dataset` with each of its accepted
    dimension datasets, on the detected key.

    Inner, not left/outer, by design: this feeds straight into
    `compute_dataset_insights` for aggregate stats (group means,
    correlations) over the joined result. A left/outer join would leave
    unmatched rows with null dimension columns, which would either have to
    be silently included (skewing group-by/correlation results with rows
    that have no real dimension value) or explicitly imputed -- a policy
    choice this service has no basis for making on a caller's behalf. An
    inner join instead simply excludes rows whose key has no match on the
    other side, which only affects *this joined view* -- the base dataset's
    own independent profile/computed_insights (computed separately, over
    its full unjoined data) is completely unaffected, which is why this is
    additive rather than a replacement (see `compute_cross_dataset_insights`).
    """
    joined = dataframes[candidate.base_dataset]
    for name, column in candidate.dimension_datasets.items():
        other = dataframes[name]
        if column != candidate.key_name:
            other = other.rename(columns={column: candidate.key_name})
        joined = joined.merge(other, on=candidate.key_name, how="inner", suffixes=("", f"_{name}"))
    return joined


def compute_cross_dataset_insights(
    dataframes: dict[str, pd.DataFrame],
    *,
    mission_problem_statement: str | None = None,
    mission_objective: str | None = None,
    min_overlap_ratio: float = _MIN_OVERLAP_RATIO,
) -> dict[str, Any] | None:
    """Ties detection, joining, and insight computation together: the one
    entry point most callers (see `mission_analysis_service`) need.

    Returns `None` -- not an empty dict -- when no confident cross-dataset
    join was found at all, so a caller can tell "nothing to join" apart
    from "joined, but `compute_dataset_insights` itself had nothing to
    report" (which still returns a dict, just with empty lists/a note --
    see `dataset_insights_service`).
    """
    candidates = detect_join_keys(dataframes, min_overlap_ratio=min_overlap_ratio)
    if not candidates:
        return None

    best = candidates[0]
    joined_df = build_joined_dataframe(dataframes, best)
    insights = compute_dataset_insights(
        joined_df,
        mission_problem_statement=mission_problem_statement,
        mission_objective=mission_objective,
    )

    return {
        "join_key": best.key_name,
        "joined_datasets": [best.base_dataset, *sorted(best.dimension_datasets)],
        "joined_row_count": int(len(joined_df)),
        "excluded_datasets": list(best.excluded_datasets),
        "insights": insights,
    }
