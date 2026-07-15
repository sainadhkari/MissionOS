import pandas as pd
import pytest

from app.services.dataset_join_service import (
    build_joined_dataframe,
    compute_cross_dataset_insights,
    detect_join_keys,
)

# ---------------------------------------------------------------------------
# A small Walmart-style fixture: `train` is a sales fact table (many rows
# per store), `stores` is a store-details dimension table (one row per
# store) -- the exact train.csv/stores.csv shape this service was built for.
# ---------------------------------------------------------------------------


def _train_and_stores() -> dict[str, pd.DataFrame]:
    train = pd.DataFrame(
        {
            "Store": [1, 1, 1, 2, 2, 2, 3, 3, 3, 3],
            # A repeated value (1200.0 appears twice) deliberately keeps this
            # column from looking "ID-like" (all-unique) to
            # _identify_metric_columns -- an all-unique metric column here
            # would otherwise be silently excluded as a false primary key.
            "Weekly_Sales": [
                200.0, 210.0, 195.0, 600.0, 620.0, 610.0, 1200.0, 1210.0, 1190.0, 1200.0,
            ],  # fmt: skip
        }
    )
    stores = pd.DataFrame(
        {
            "Store": [1, 2, 3],
            "Type": ["A", "B", "C"],
            "Size": [50000, 90000, 150000],
        }
    )
    return {"train": train, "stores": stores}


def test_detects_join_key_between_fact_and_dimension_table():
    candidates = detect_join_keys(_train_and_stores())

    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate.key_name == "Store"
    assert candidate.base_dataset == "train"
    assert candidate.dimension_datasets == {"stores": "Store"}
    assert candidate.overlap_ratios["stores"] == pytest.approx(1.0)
    assert candidate.excluded_datasets == ()


def test_joined_dataframe_attaches_dimension_columns_without_inflating_row_count():
    dataframes = _train_and_stores()
    candidate = detect_join_keys(dataframes)[0]

    joined = build_joined_dataframe(dataframes, candidate)

    assert len(joined) == len(dataframes["train"])
    assert set(joined["Store"]) == {1, 2, 3}
    # Every train row picked up its store's Type/Size from the dimension table.
    store_to_type = dict(zip(joined["Store"], joined["Type"], strict=True))
    assert store_to_type == {1: "A", 2: "B", 3: "C"}


def test_compute_cross_dataset_insights_surfaces_a_group_by_type_only_derivable_from_the_join():
    dataframes = _train_and_stores()

    result = compute_cross_dataset_insights(dataframes)

    assert result is not None
    assert result["join_key"] == "Store"
    assert result["joined_datasets"] == ["train", "stores"]
    assert result["joined_row_count"] == len(dataframes["train"])

    # "average sales by store Type" only exists after the join -- Type isn't
    # a column in train.csv at all.
    type_group = next(
        gi
        for gi in result["insights"]["group_insights"]
        if gi["group_column"] == "Type" and gi["metric_column"] == "Weekly_Sales"
    )
    assert type_group["top_groups"][0]["group"] == "C"
    assert type_group["bottom_groups"][0]["group"] == "A"


def test_no_plausible_shared_key_returns_no_candidates_and_omits_cross_dataset_section():
    dataframes = {
        "orders": pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "amount": [10, 20, 30, 40, 50]}),
        "weather": pd.DataFrame(
            {"city": ["NY", "LA", "SF", "NY", "LA"], "temperature": [70, 80, 65, 72, 78]}
        ),
    }

    assert detect_join_keys(dataframes) == []
    assert compute_cross_dataset_insights(dataframes) is None


def test_coincidental_name_match_with_low_value_overlap_is_rejected():
    # Both datasets have a uniquely-valued "code" column (so neither is
    # rejected for lacking a dimension side), but the actual values barely
    # overlap -- a coincidental name match, not a real shared key.
    dataframes = {
        "a": pd.DataFrame({"code": list(range(1, 21)), "metric_a": list(range(20))}),
        "b": pd.DataFrame({"code": list(range(1000, 1020)), "metric_b": list(range(20))}),
    }

    assert detect_join_keys(dataframes) == []
    assert compute_cross_dataset_insights(dataframes) is None


def test_two_fact_grain_tables_sharing_a_key_are_not_joined_to_each_other():
    # Neither `train` nor `features` has a unique Store column (both repeat
    # it once per date) -- joining them on Store alone would silently
    # explode into a many-to-many cross product, so this key must be
    # rejected outright rather than joined unsafely.
    dataframes = {
        "train": pd.DataFrame({"Store": [1, 1, 2, 2, 3, 3], "Weekly_Sales": [1, 2, 3, 4, 5, 6]}),
        "features": pd.DataFrame(
            {"Store": [1, 1, 2, 2, 3, 3], "Temperature": [60, 61, 62, 63, 64, 65]}
        ),
    }

    assert detect_join_keys(dataframes) == []
    assert compute_cross_dataset_insights(dataframes) is None


def test_second_fact_grain_table_excluded_when_a_dimension_also_shares_the_key():
    # train (fact) + stores (dimension) + features (fact) all share Store.
    # The safe join is train+stores; features must be excluded from it
    # rather than forcing an unsafe three-way join.
    dataframes = {
        "train": pd.DataFrame(
            {"Store": [1, 1, 1, 2, 2, 2], "Weekly_Sales": [10, 11, 12, 20, 21, 22]}
        ),
        "stores": pd.DataFrame({"Store": [1, 2], "Type": ["A", "B"]}),
        "features": pd.DataFrame({"Store": [1, 1, 2, 2], "Temperature": [50, 51, 60, 61]}),
    }

    candidates = detect_join_keys(dataframes)

    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate.base_dataset == "train"
    assert candidate.dimension_datasets == {"stores": "Store"}
    assert candidate.excluded_datasets == ("features",)
