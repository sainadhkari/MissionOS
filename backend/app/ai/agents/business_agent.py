import json
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.ai import parser
from app.ai.client import AIClient, AIMessage
from app.ai.exceptions import ParsingException
from app.ai.models import (
    AgentName,
    AnalysisRequest,
    AnalysisResult,
    DatasetContext,
    MissionContext,
)
from app.ai.prompt_loader import PromptLoader

_PROMPT_NAME = "business"


class BusinessAnalysisOutput(BaseModel):
    """The strict JSON shape `prompts/business.md` requires the model to
    return — validated via `parser.parse_structured_response`."""

    business_problem: str
    key_opportunities: list[str]
    important_metrics: list[str]
    recommended_next_steps: list[str]
    confidence: float = Field(ge=0.0, le=1.0)


def _format_mission(mission: MissionContext) -> str:
    return (
        f"Title: {mission.title}\n"
        f"Business Domain: {mission.business_domain}\n"
        f"Objective: {mission.objective}\n"
        f"Problem Statement: {mission.problem_statement}\n"
        f"Expected Output: {mission.expected_output}\n"
    )


def _format_dataset(dataset: DatasetContext) -> str:
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


def _build_user_message(request: AnalysisRequest) -> str:
    sections = ["## Mission\n", _format_mission(request.mission), "\n## Datasets\n"]
    if request.datasets:
        sections.extend(_format_dataset(dataset) for dataset in request.datasets)
    else:
        sections.append("(No datasets attached to this mission.)\n")
    return "".join(sections)


class BusinessAgent:
    """First stage of the analysis pipeline: business-context interpretation.

    Depends only on an `AIClient` and a `PromptLoader`, both injected — it
    never instantiates `OpenAIClient` (or any concrete client) itself, so it
    behaves identically against `MockAIClient` or any other implementation.
    """

    def __init__(self, client: AIClient, prompt_loader: PromptLoader) -> None:
        self._client = client
        self._prompt_loader = prompt_loader

    async def analyze(
        self, request: AnalysisRequest, prior: AnalysisResult | None = None
    ) -> AnalysisResult:
        system_prompt = self._prompt_loader.load(_PROMPT_NAME)
        user_message = _build_user_message(request)

        raw_response = await self._client.complete(
            [
                AIMessage(role="system", content=system_prompt),
                AIMessage(role="user", content=user_message),
            ]
        )
        if not raw_response or not raw_response.strip():
            raise ParsingException("Business Agent received an empty response from the model.")

        output = parser.parse_structured_response(raw_response, BusinessAnalysisOutput)

        base = prior or AnalysisResult(mission_id=request.mission.mission_id)
        return base.model_copy(
            update={
                "business_summary": output.business_problem,
                "completed_stages": [*base.completed_stages, AgentName.BUSINESS],
                "completed_at": datetime.now(UTC),
            }
        )
