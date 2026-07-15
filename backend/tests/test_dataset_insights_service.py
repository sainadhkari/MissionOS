import json

import pandas as pd
import pytest

from app.services.dataset_insights_service import compute_dataset_insights


def test_group_insights_surfaces_top_and_bottom_groups():
    df = pd.DataFrame(
        {
            "store": ["A"] * 5 + ["B"] * 5 + ["C"] * 5,
            "sales": [10, 12, 11, 9, 10, 50, 52, 51, 49, 50, 100, 102, 101, 99, 100],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)  # must be JSON-serializable

    insight = next(
        gi
        for gi in result["group_insights"]
        if gi["group_column"] == "store" and gi["metric_column"] == "sales"
    )
    assert insight["top_groups"][0]["group"] == "C"
    assert insight["top_groups"][0]["mean"] == pytest.approx(100.4)
    assert insight["bottom_groups"][0]["group"] == "A"
    assert insight["bottom_groups"][0]["mean"] == pytest.approx(10.4)
    # every group appears exactly once in a 3-group column
    assert {g["group"] for g in insight["top_groups"]} == {"A", "B", "C"}


def test_binary_split_computes_mean_by_value():
    df = pd.DataFrame(
        {
            "is_weekend": [True, False, False, False, True, False, False, False, True, False],
            "visits": [200, 100, 100, 95, 210, 98, 100, 101, 205, 99],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    split = next(
        s
        for s in result["binary_splits"]
        if s["binary_column"] == "is_weekend" and s["metric_column"] == "visits"
    )
    assert split["mean_by_value"]["True"] == pytest.approx(205.0)
    assert split["mean_by_value"]["False"] == pytest.approx(99.0)
    assert split["difference"] == pytest.approx(
        split["mean_by_value"]["True"] - split["mean_by_value"]["False"]
    )


def test_correlation_surfaces_strong_relationship():
    df = pd.DataFrame(
        {
            "x": [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
            "y": [2, 2, 4, 4, 6, 6, 8, 8, 10, 10],  # y = 2x exactly
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    x_correlations = next(c for c in result["correlations"] if c["metric_column"] == "x")
    top = x_correlations["top_correlations"][0]
    assert top["column"] == "y"
    assert top["correlation"] == pytest.approx(1.0)


def test_dataset_with_fewer_than_five_rows_returns_note_without_raising():
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})

    result = compute_dataset_insights(df)

    assert "notes" in result
    assert "fewer than 5 rows" in result["notes"][0]


def test_empty_dataframe_does_not_raise():
    result = compute_dataset_insights(pd.DataFrame())

    assert "notes" in result


def test_dataset_with_no_numeric_columns_does_not_raise():
    df = pd.DataFrame(
        {
            "category": ["x", "y", "p", "x", "y", "p", "x"],
            "flag": ["p", "q", "p", "q", "p", "q", "p"],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    assert result["group_insights"] == []
    assert result["binary_splits"] == []
    assert result["correlations"] == []
    assert any("No numeric metric columns" in note for note in result["notes"])


def test_dataset_with_no_group_columns_still_computes_correlations():
    # Two continuous numeric columns with >100 unique values (out of range for a
    # "group" column) but far fewer than the row count (so neither is ID-like).
    row_count = 150
    df = pd.DataFrame(
        {
            "metric_a": [i % 120 for i in range(row_count)],
            "metric_b": [(i % 120) * 2 for i in range(row_count)],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    assert result["group_insights"] == []
    assert any("No categorical/low-cardinality columns" in note for note in result["notes"])
    assert len(result["correlations"]) == 2


def test_all_unique_float_metric_is_not_excluded_as_id_like():
    # Reproduces the exact bug a live run against the real 6,435-row Walmart
    # Kaggle dataset surfaced: Weekly_Sales (precise dollars-and-cents) had
    # zero duplicate values across every row, purely by chance -- and was
    # being silently excluded from ever being its own metric column, as if
    # it were a primary key. A float column with no duplicates is not the
    # same claim as an integer one; see _identify_metric_columns.
    row_count = 20
    df = pd.DataFrame(
        {
            "store": ["A"] * 10 + ["B"] * 10,
            # Every value here is unique -- deliberately, to reproduce the bug.
            "revenue": [100.01 + i * 1.37 for i in range(row_count)],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    group = next(
        gi
        for gi in result["group_insights"]
        if gi["group_column"] == "store" and gi["metric_column"] == "revenue"
    )
    assert group["top_groups"][0]["group"] == "B"


def test_all_unique_integer_column_is_still_excluded_as_id_like():
    # An incrementing integer column is exactly the case this exclusion
    # exists for -- a real primary key, not a real metric -- and must still
    # be excluded even after scoping the check to integer dtypes.
    row_count = 20
    df = pd.DataFrame(
        {
            "store": ["A"] * 10 + ["B"] * 10,
            "row_id": list(range(row_count)),
            "revenue": [100.0 + (i % 5) for i in range(row_count)],
        }
    )

    result = compute_dataset_insights(df)
    json.dumps(result)

    metric_columns_used = {
        gi["metric_column"] for gi in result["group_insights"] if gi["group_column"] == "store"
    }
    assert "row_id" not in metric_columns_used
    assert "revenue" in metric_columns_used


# ---------------------------------------------------------------------------
# Mission-relevance: reproduces the production case where a mission asked
# about Weekly_Sales vs Temperature/Fuel_Price/CPI/Unemployment, but
# Temperature/Fuel_Price/CPI were dropped by the magnitude-based "strongest
# few" cutoff because Store/Holiday_Flag/Unemployment happened to correlate
# more strongly. Deterministic (hardcoded, not randomly generated per test
# run) so the exact rank order -- and therefore what gets cut -- is stable.
# ---------------------------------------------------------------------------

def _column(*values: float) -> list[float]:
    return list(values)


_STORE = _column(
    1, 2, 3, 1, 2, 3, 1, 2, 3, 3, 3, 1, 3, 1, 1, 1, 1, 3, 3, 1,
    1, 2, 1, 1, 2, 1, 2, 1, 3, 1, 2, 3, 3, 1, 3, 2, 1, 1, 2, 1,
    1, 3, 2, 1, 1, 1, 3, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 3, 2,
)  # fmt: skip
_HOLIDAY_FLAG = _column(
    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
)  # fmt: skip
_UNEMPLOYMENT = _column(
    7.52, 6.01, 6.84, 6.93, 6.11, 7.08, 7.22, 7.66, 7.88, 6.26,
    6.46, 7.32, 6.26, 6.45, 7.15, 6.34, 7.56, 7.71, 6.07, 7.07,
    7.59, 7.95, 6.55, 6.34, 7.75, 7.82, 6.4, 6.88, 7.44, 7.69,
    6.34, 7.33, 7.62, 7.1, 6.33, 6.07, 6.56, 7.62, 6.09, 6.02,
    6.72, 6.13, 6.3, 6.05, 7.05, 7.39, 6.85, 6.27, 6.66, 7.18,
    7.88, 7.99, 6.48, 6.02, 7.66, 7.85, 6.92, 7.54, 7.73, 7.22,
)  # fmt: skip
_WEEKLY_SALES = _column(
    415.0, 690.0, 1156.0, 147.0, 682.0, 1143.0, 166.0, 633.0, 1117.0, 1178.0,
    1173.0, 130.0, 1174.0, 462.0, 130.0, 177.0, 105.0, 1111.0, 1205.0, 447.0,
    436.0, 590.0, 187.0, 189.0, 614.0, 115.0, 690.0, 144.0, 1138.0, 128.0,
    682.0, 1139.0, 1114.0, 146.0, 1196.0, 703.0, 166.0, 110.0, 701.0, 184.0,
    141.0, 1477.0, 688.0, 191.0, 452.0, 142.0, 1465.0, 680.0, 170.0, 638.0,
    89.0, 107.0, 699.0, 201.0, 624.0, 603.0, 163.0, 621.0, 1100.0, 649.0,
)  # fmt: skip
_TEMPERATURE = _column(
    60.0, 52.0, 48.0, 66.0, 32.0, 52.0, 43.0, 31.0, 60.0, 52.0,
    66.0, 54.0, 43.0, 69.0, 35.0, 32.0, 59.0, 45.0, 44.0, 65.0,
    43.0, 66.0, 56.0, 43.0, 32.0, 40.0, 69.0, 46.0, 36.0, 42.0,
    66.0, 37.0, 61.0, 35.0, 68.0, 51.0, 32.0, 67.0, 44.0, 59.0,
    51.0, 34.0, 34.0, 36.0, 36.0, 32.0, 32.0, 68.0, 34.0, 50.0,
    35.0, 39.0, 61.0, 68.0, 49.0, 30.0, 70.0, 32.0, 46.0, 52.0,
)  # fmt: skip
_FUEL_PRICE = _column(
    3.51, 3.46, 3.29, 3.12, 3.47, 3.5, 3.5, 3.37, 2.88, 3.04,
    3.19, 3.2, 3.47, 2.99, 3.33, 3.1, 3.42, 2.96, 3.18, 2.88,
    2.97, 3.55, 3.05, 3.51, 3.22, 2.83, 3.43, 2.84, 3.46, 2.81,
    3.34, 2.93, 3.07, 3.56, 3.19, 3.33, 3.39, 2.89, 3.47, 3.53,
    2.92, 3.24, 3.03, 3.39, 2.82, 3.21, 3.43, 3.39, 2.89, 3.47,
    2.99, 3.45, 3.2, 2.93, 3.39, 3.45, 3.36, 3.57, 3.0, 2.99,
)  # fmt: skip
_CPI = _column(
    206.5, 210.4, 209.0, 208.6, 209.6, 207.7, 205.0, 209.7, 207.8, 209.5,
    214.3, 206.8, 211.4, 211.4, 207.8, 209.7, 214.7, 208.4, 212.1, 213.4,
    208.6, 214.9, 211.3, 210.0, 212.1, 209.2, 212.1, 207.7, 214.3, 210.4,
    207.4, 209.4, 214.0, 213.1, 209.8, 208.5, 208.8, 214.8, 206.1, 213.9,
    213.6, 207.2, 208.5, 210.7, 213.0, 214.5, 214.9, 207.8, 206.9, 209.9,
    210.6, 211.6, 206.1, 211.5, 214.2, 214.2, 214.4, 214.2, 214.6, 205.5,
)  # fmt: skip

_MISSION_PROBLEM_STATEMENT = (
    "We want to understand the relationship between Weekly_Sales and "
    "Temperature/Fuel_Price/CPI/Unemployment."
)
_MISSION_OBJECTIVE = "Identify which macro factors affect weekly sales."


def _walmart_style_df() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "Store": _STORE,
            "Holiday_Flag": _HOLIDAY_FLAG,
            "Unemployment": _UNEMPLOYMENT,
            "Weekly_Sales": _WEEKLY_SALES,
            "Temperature": _TEMPERATURE,
            "Fuel_Price": _FUEL_PRICE,
            "CPI": _CPI,
        }
    )


def _weekly_sales_correlations(result: dict) -> list[dict]:
    entry = next(c for c in result["correlations"] if c["metric_column"] == "Weekly_Sales")
    return entry["top_correlations"]


def test_without_mission_context_reproduces_the_original_production_bug():
    # Baseline: Store/Holiday_Flag/Unemployment are the strongest by
    # magnitude; Temperature/Fuel_Price/CPI are weaker and, without mission
    # context, get dropped entirely -- this is the bug as originally
    # observed in production.
    df = _walmart_style_df()

    result = compute_dataset_insights(df)
    json.dumps(result)

    columns_shown = {c["column"] for c in _weekly_sales_correlations(result)}
    assert columns_shown == {"Store", "Holiday_Flag", "Unemployment"}
    assert not any(c.get("mission_relevant") for c in _weekly_sales_correlations(result))


def test_mission_context_surfaces_previously_dropped_correlations():
    df = _walmart_style_df()

    result = compute_dataset_insights(
        df,
        mission_problem_statement=_MISSION_PROBLEM_STATEMENT,
        mission_objective=_MISSION_OBJECTIVE,
    )
    json.dumps(result)

    correlations = _weekly_sales_correlations(result)
    by_column = {c["column"]: c for c in correlations}

    # The strong ones are still there, unmarked (not present "because of"
    # relevance -- their magnitude alone already justified them).
    for strong_column in ("Store", "Holiday_Flag", "Unemployment"):
        assert strong_column in by_column
        assert "mission_relevant" not in by_column[strong_column]

    # All three previously-dropped, mission-asked-about columns now appear,
    # correctly flagged, with their real (weak) correlation values -- not
    # omitted, not fabricated as strong.
    for weak_relevant_column in ("Temperature", "Fuel_Price", "CPI"):
        assert weak_relevant_column in by_column, f"{weak_relevant_column} was dropped"
        assert by_column[weak_relevant_column]["mission_relevant"] is True
        assert abs(by_column[weak_relevant_column]["correlation"]) < 0.2


def test_absolute_cap_still_holds_with_many_mission_relevant_columns():
    # Every numeric column beyond the metric itself is named in the mission
    # text -- without a cap, all of them would be forced in.
    df = pd.DataFrame(
        {
            "target": [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4],
            "alpha": [2, 1, 5, 3, 9, 2, 4, 8, 1, 6, 7, 3],
            "beta": [9, 3, 1, 7, 2, 8, 5, 4, 6, 1, 3, 2],
            "gamma": [4, 8, 2, 1, 6, 3, 9, 5, 7, 2, 1, 8],
            "delta": [1, 5, 9, 2, 4, 7, 3, 6, 8, 1, 2, 5],
            "epsilon": [7, 2, 4, 9, 1, 5, 8, 3, 2, 6, 4, 1],
            "zeta": [3, 6, 1, 8, 5, 2, 9, 4, 7, 3, 1, 6],
        }
    )
    mission_text = "How does target relate to alpha, beta, gamma, delta, epsilon, and zeta?"

    result = compute_dataset_insights(df, mission_problem_statement=mission_text)
    json.dumps(result)

    entry = next(c for c in result["correlations"] if c["metric_column"] == "target")
    assert len(entry["top_correlations"]) <= 6  # _MAX_TOTAL_CORRELATIONS_PER_METRIC


def test_mission_relevant_group_column_gets_priority_slot_over_cap():
    # More than _MAX_GROUP_COLUMNS (3) candidate group columns exist; the
    # mission-relevant one ("region") is deliberately placed last in column
    # order, where the raw cardinality-based heuristic alone would have
    # dropped it in favor of the first three.
    df = pd.DataFrame(
        {
            "col_a": ["x", "y", "x", "y", "x", "y", "x", "y"],
            "col_b": ["p", "q", "p", "q", "p", "q", "p", "q"],
            "col_c": ["m", "n", "m", "n", "m", "n", "m", "n"],
            "region": ["north", "south", "north", "south", "north", "south", "north", "south"],
            # Repeated values (not all-unique), or this would look ID-like and
            # get excluded from metric-column candidacy entirely.
            "sales": [10, 20, 10, 20, 11, 21, 10, 20],
        }
    )

    result = compute_dataset_insights(
        df,
        mission_problem_statement="How does region affect sales?",
    )
    json.dumps(result)

    group_columns_used = {gi["group_column"] for gi in result["group_insights"]}
    assert "region" in group_columns_used


def test_no_mission_context_is_unchanged_from_before_mission_awareness_existed():
    df = _walmart_style_df()

    with_defaults = compute_dataset_insights(df)
    explicit_none = compute_dataset_insights(
        df, mission_problem_statement=None, mission_objective=None
    )

    assert with_defaults == explicit_none
