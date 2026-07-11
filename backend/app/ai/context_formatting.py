"""Renders `MissionContext`/`DatasetContext` as plain text for a prompt's user
message. Currently used by `BusinessAgent` — `StrategyAgent` sends the same
data as a structured JSON payload instead (see `strategy_agent.py`), since it
also needs to carry the prior `BusinessAnalysisOutput` in a form the model can
clearly distinguish from instructions. Kept here as a shared module in case a
future agent wants the same plain-text rendering `BusinessAgent` uses."""

import json

from app.ai.models import AnalysisRequest, DatasetContext, MissionContext


def format_mission(mission: MissionContext) -> str:
    return (
        f"Title: {mission.title}\n"
        f"Business Domain: {mission.business_domain}\n"
        f"Objective: {mission.objective}\n"
        f"Problem Statement: {mission.problem_statement}\n"
        f"Expected Output: {mission.expected_output}\n"
    )


def format_dataset(dataset: DatasetContext) -> str:
    columns = (
        "\n".join(
            f"  - {column.name} (type: {column.dtype}, category: {column.category}, "
            f"missing: {column.missing_count})"
            for column in dataset.columns
        )
        or "  (no columns detected)"
    )

    return (
        f"Dataset: {dataset.original_filename}\n"
        f"Rows: {dataset.row_count}, Columns: {dataset.column_count}, "
        f"Duplicate rows: {dataset.duplicate_row_count}\n"
        f"Columns:\n{columns}\n"
        f"Numeric summary: {json.dumps(dataset.numeric_summary)}\n"
        f"Categorical summary: {json.dumps(dataset.categorical_summary)}\n"
    )


def format_mission_and_datasets(request: AnalysisRequest) -> str:
    sections = ["## Mission\n", format_mission(request.mission), "\n## Datasets\n"]
    if request.datasets:
        sections.extend(format_dataset(dataset) for dataset in request.datasets)
    else:
        sections.append("(No datasets attached to this mission.)\n")
    return "".join(sections)
