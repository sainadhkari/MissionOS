"""Ground truth for the `walmart_macro_drivers` eval fixture.

The CSV at `fixtures/walmart_macro_drivers.csv` is the exact 60-row
synthetic dataset introduced in `tests/test_dataset_insights_service.py` to
reproduce the real mission-relevance production bug (Store/Holiday_Flag/
Unemployment strongly correlate with Weekly_Sales by magnitude; Temperature/
Fuel_Price/CPI are weak but directly named in the mission text), tiled
back-to-back 6x (360 rows total). Tiling an exact block leaves every mean,
correlation, and binary-split identical -- duplicating whole rows changes
neither Pearson correlation nor group means -- but was necessary because a
live run of `run_eval.py` against the original untiled 60 rows found the
`per_agent_chunks` check failing every time: 60 rows / `rag_chunk_row_size`
(25) is only 3 row chunks, well under `rag_top_k` (6) + the schema-demotion
backfill window (5) = 11, so every stage's retrieval call returned literally
every chunk that existed regardless of its query -- not a pipeline bug, a
fixture too small for that assertion to ever have room to fail. 360 rows is
15 row chunks, safely above that window. It's checked in here as a static
file rather than regenerated at run time, so this eval's ground truth can
never silently drift from what's actually on disk.

Every number below was computed once, directly from this CSV, via
`compute_dataset_insights()` itself (see the git history of this file for
the verification script) -- these are not hand-guessed estimates.
"""

import pathlib

FIXTURE_CSV_PATH = pathlib.Path(__file__).parent / "fixtures" / "walmart_macro_drivers.csv"

MISSION_TITLE = "Understand Weekly Sales Macro Drivers"
MISSION_BUSINESS_DOMAIN = "Retail"
MISSION_PRIORITY = "high"
# Deliberately names "store" and "weekly sales" (so Store/Weekly_Sales earn a
# mission-relevance priority slot alongside Unemployment) plus every macro
# column this eval checks for -- see fixtures.py's module docstring and
# dataset_insights_service._prioritize_relevant/_is_mission_relevant for why
# exact wording here controls which columns survive the group/metric column
# cap.
MISSION_PROBLEM_STATEMENT = (
    "We want to understand which store underperforms on Weekly_Sales, and how "
    "weekly sales relate to Temperature, Fuel_Price, CPI, and Unemployment."
)
MISSION_OBJECTIVE = (
    "Identify the weakest-performing store and which macro factors (temperature, "
    "fuel price, CPI, unemployment) affect weekly sales."
)
MISSION_EXPECTED_OUTPUT = (
    "A ranked list of underperforming stores and the macro factors that explain "
    "weekly sales variation, with concrete supporting figures."
)

# --- Ground truth, computed directly from the fixture CSV -------------------

# Store 1 is the clear worst performer (28 of 60 rows), Store 3 the best (15
# rows) -- group_insights on Store x Weekly_Sales, guaranteed a slot by the
# mission text naming "store" and "weekly sales" explicitly.
LOWEST_PERFORMING_STORE = "1"
LOWEST_PERFORMING_STORE_MEAN_WEEKLY_SALES = 201.43
HIGHEST_PERFORMING_STORE = "3"
HIGHEST_PERFORMING_STORE_MEAN_WEEKLY_SALES = 1192.40

# binary_splits is never capped/prioritized (see dataset_insights_service.
# compute_dataset_insights), so this holiday uplift is present regardless of
# mission wording.
HOLIDAY_MEAN_WEEKLY_SALES = 736.29
NON_HOLIDAY_MEAN_WEEKLY_SALES = 557.72
HOLIDAY_UPLIFT = 178.57

# Strongest correlation with Weekly_Sales by magnitude -- present regardless
# of mission relevance (top_by_magnitude is never removed, only added to).
STRONG_CORRELATION_COLUMN = "Store"
STRONG_CORRELATION_VALUE = 0.970

# Weak-but-mission-relevant correlations with Weekly_Sales: these are the
# exact three columns the original production bug silently dropped (see
# tests/test_dataset_insights_service.py::
# test_without_mission_context_reproduces_the_original_production_bug).
# A regression that stops citing these (or stops flagging them
# `mission_relevant`) reintroduces that exact bug.
WEAK_RELEVANT_CORRELATIONS = {
    "Fuel_Price": 0.087,
    "Temperature": 0.018,
    "CPI": 0.005,
}

# Phrases that would indicate the Prompt 1 regression (a mission-relevant
# metric silently treated as unavailable/uncomputed) if they appear anywhere
# in an agent's output -- case-insensitive substring check.
UNCOMPUTED_METRIC_PHRASES = (
    "should be computed",
    "not computed",
    "cannot be computed",
    "could not be computed",
    "needs to be computed",
    "data not available",
    "insufficient data to determine",
)
