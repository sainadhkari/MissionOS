from datetime import UTC, datetime

from app.ai import parser
from app.ai.client import AIClient, AIMessage
from app.ai.context_formatting import format_retrieved_context, format_structured_payload
from app.ai.exceptions import AIException, ParsingException
from app.ai.models import AgentName, AnalysisRequest, AnalysisResult, RiskAnalysisOutput
from app.ai.prompt_loader import PromptLoader

_PROMPT_NAME = "risk_v1"


def _build_user_message(request: AnalysisRequest, prior: AnalysisResult) -> str:
    """Serializes the mission, its datasets, and the prior Business/Strategy
    analyses as a single structured JSON payload via `format_structured_payload`
    — never spliced into the (static, file-loaded) prompt template, so
    mission/dataset text a user typed can never be mistaken for instructions.
    """
    payload = {
        "mission": request.mission.model_dump(mode="json"),
        "datasets": [dataset.model_dump(mode="json") for dataset in request.datasets],
        "cross_dataset_insights": request.cross_dataset_insights,
        "business_analysis": prior.business_analysis.model_dump(mode="json"),
        "strategy_analysis": prior.strategy_analysis.model_dump(mode="json"),
    }
    return format_structured_payload(payload) + format_retrieved_context(request.retrieved_context)


class RiskAgent:
    """Third stage of the analysis pipeline: identifies risks, assumptions,
    and mitigations on top of the Business and Strategy agents' completed
    analyses.

    Depends only on an `AIClient` and a `PromptLoader`, both injected — it
    never instantiates `OpenAIClient` (or any concrete client) itself, and
    holds no model-compatibility logic of its own (temperature/reasoning-
    effort handling for specific model families lives entirely in
    `OpenAIClient`, untouched by this ticket). It implements no retry logic:
    a model failure surfaces as `ModelException` from `client.complete()`
    and propagates immediately.

    Inputs and outputs are plain Pydantic models (`AnalysisRequest` in,
    `AnalysisResult` out) with no framework-specific types or global state,
    so this class can become a LangGraph node later without modification.
    """

    def __init__(self, client: AIClient, prompt_loader: PromptLoader) -> None:
        self._client = client
        self._prompt_loader = prompt_loader

    async def analyze(
        self, request: AnalysisRequest, prior: AnalysisResult | None = None
    ) -> AnalysisResult:
        if prior is None or prior.business_analysis is None or prior.strategy_analysis is None:
            raise AIException(
                "RiskAgent requires completed BusinessAnalysisOutput and "
                "StrategyAnalysisOutput from prior stages."
            )

        system_prompt = self._prompt_loader.load(_PROMPT_NAME)
        user_message = _build_user_message(request, prior)

        raw_response = await self._client.complete(
            [
                AIMessage(role="system", content=system_prompt),
                AIMessage(role="user", content=user_message),
            ]
        )
        if not raw_response or not raw_response.strip():
            raise ParsingException("Risk Agent received an empty response from the model.")

        output = parser.parse_structured_response(raw_response, RiskAnalysisOutput)

        return prior.model_copy(
            update={
                "risk_analysis": output,
                "completed_stages": [*prior.completed_stages, AgentName.RISK],
                "completed_at": datetime.now(UTC),
            }
        )
