import uuid

from app.ai.context_formatting import format_dataset, format_mission_and_datasets
from app.ai.models import AnalysisRequest, DatasetContext, MissionContext

_BASE_KWARGS = {
    "dataset_id": uuid.uuid4(),
    "original_filename": "sales.csv",
    "file_type": "csv",
    "row_count": 12,
    "column_count": 4,
}

_MISSION_KWARGS = {
    "mission_id": uuid.uuid4(),
    "title": "Understand Store Performance",
    "business_domain": "Retail",
    "priority": "high",
    "problem_statement": "Some stores underperform.",
    "objective": "Identify which store types underperform.",
    "expected_output": "A ranked list of underperforming store types.",
    "status": "draft",
}


def test_format_dataset_includes_computed_insights_section_when_present():
    computed_insights = {
        "group_insights": [
            {
                "group_column": "store",
                "metric_column": "units_sold",
                "top_groups": [{"group": "C", "mean": 100.5, "sum": 402.0, "count": 4}],
                "bottom_groups": [{"group": "B", "mean": 11.25, "sum": 45.0, "count": 4}],
            }
        ],
        "binary_splits": [
            {
                "binary_column": "is_holiday",
                "metric_column": "units_sold",
                "mean_by_value": {"True": 53.33, "False": 52.78},
                "difference": 0.56,
            }
        ],
        "correlations": [
            {
                "metric_column": "units_sold",
                "top_correlations": [{"column": "sales", "correlation": 1.0}],
            }
        ],
        "notes": [],
    }
    dataset = DatasetContext(**_BASE_KWARGS, computed_insights=computed_insights)

    output = format_dataset(dataset)

    assert "Computed Insights:" in output
    assert "Top performers by store (avg units_sold): C (100.50)" in output
    assert "Bottom performers by store (avg units_sold): B (11.25)" in output
    assert "By is_holiday (avg units_sold): True=53.33, False=52.78" in output
    assert "Strongest correlations with units_sold: sales (+1.000)" in output


def test_format_dataset_labels_mission_relevant_correlation_as_weak_but_relevant():
    computed_insights = {
        "group_insights": [],
        "binary_splits": [],
        "correlations": [
            {
                "metric_column": "Weekly_Sales",
                "top_correlations": [
                    {"column": "Store", "correlation": -0.632},
                    {"column": "Unemployment", "correlation": 0.197},
                    {"column": "Temperature", "correlation": 0.04, "mission_relevant": True},
                    {"column": "Fuel_Price", "correlation": -0.02, "mission_relevant": True},
                ],
            }
        ],
        "notes": [],
    }
    dataset = DatasetContext(**_BASE_KWARGS, computed_insights=computed_insights)

    output = format_dataset(dataset)

    # Strong entries render together, unlabeled, as before.
    assert (
        "Strongest correlations with Weekly_Sales: Store (-0.632), Unemployment (+0.197)"
        in output
    )
    # Mission-relevant-but-weak entries get their own explicitly-labeled
    # line each, distinct from the strong-correlation line, so an agent
    # doesn't cite them with the same confidence as a strong relationship.
    assert "Weak but mission-relevant: Temperature vs Weekly_Sales (+0.040)" in output
    assert "Weak but mission-relevant: Fuel_Price vs Weekly_Sales (-0.020)" in output
    # And they must not also appear folded into the "Strongest" line.
    strongest_line = next(
        line for line in output.splitlines() if line.strip().startswith("- Strongest")
    )
    assert "Temperature" not in strongest_line
    assert "Fuel_Price" not in strongest_line


def test_format_dataset_includes_notes_when_present_with_no_other_sections():
    computed_insights = {"notes": ["Dataset has fewer than 5 rows; skipped aggregate insights."]}
    dataset = DatasetContext(**_BASE_KWARGS, computed_insights=computed_insights)

    output = format_dataset(dataset)

    assert "Computed Insights:" in output
    assert "Note: Dataset has fewer than 5 rows" in output


def test_format_dataset_omits_computed_insights_section_when_empty():
    dataset = DatasetContext(**_BASE_KWARGS, computed_insights={})

    output = format_dataset(dataset)

    assert "Computed Insights" not in output


def test_format_dataset_omits_computed_insights_section_by_default():
    # computed_insights not passed at all -- exercises the field's default_factory.
    dataset = DatasetContext(**_BASE_KWARGS)

    output = format_dataset(dataset)

    assert "Computed Insights" not in output


def test_format_mission_and_datasets_includes_cross_dataset_insights_section_when_present():
    cross_dataset_insights = {
        "join_key": "Store",
        "joined_datasets": ["train.csv", "stores.csv"],
        "joined_row_count": 6435,
        "excluded_datasets": [],
        "insights": {
            "group_insights": [
                {
                    "group_column": "Type",
                    "metric_column": "Weekly_Sales",
                    "top_groups": [{"group": "C", "mean": 1200.0, "sum": 4800.0, "count": 4}],
                    "bottom_groups": [{"group": "A", "mean": 201.67, "sum": 605.0, "count": 3}],
                }
            ],
            "binary_splits": [],
            "correlations": [],
            "notes": [],
        },
    }
    request = AnalysisRequest(
        mission=MissionContext(**_MISSION_KWARGS),
        datasets=[],
        cross_dataset_insights=cross_dataset_insights,
    )

    output = format_mission_and_datasets(request)

    assert "## Cross-Dataset Insights" in output
    assert "joining train.csv, stores.csv on 'Store' (6435 matched rows)" in output
    assert "Top performers by Type (avg Weekly_Sales): C (1200.00)" in output
    assert "Bottom performers by Type (avg Weekly_Sales): A (201.67)" in output
    # The cross-dataset section must be its own heading, never folded into
    # a single dataset's own "Computed Insights:" section.
    assert "Computed Insights:" not in output


def test_format_mission_and_datasets_omits_cross_dataset_insights_section_by_default():
    # cross_dataset_insights not passed at all -- exercises the field's
    # default_factory, the common case (fewer than 2 datasets, or no
    # confident join found).
    request = AnalysisRequest(mission=MissionContext(**_MISSION_KWARGS), datasets=[])

    output = format_mission_and_datasets(request)

    assert "Cross-Dataset Insights" not in output


def test_format_mission_and_datasets_omits_cross_dataset_insights_section_when_insights_empty():
    # A join was found (`cross_dataset_insights` is non-empty), but its own
    # `insights` came back with nothing to report (e.g. the joined result
    # had too few rows) -- still no dangling heading, same convention as a
    # single dataset's own Computed Insights.
    request = AnalysisRequest(
        mission=MissionContext(**_MISSION_KWARGS),
        datasets=[],
        cross_dataset_insights={
            "join_key": "Store",
            "joined_datasets": ["a.csv", "b.csv"],
            "joined_row_count": 3,
            "excluded_datasets": [],
            "insights": {
                "group_insights": [],
                "binary_splits": [],
                "correlations": [],
                "notes": [],
            },
        },
    )

    output = format_mission_and_datasets(request)

    assert "Cross-Dataset Insights" not in output
