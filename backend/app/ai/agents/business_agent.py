from datetime import UTC, datetime

from app.ai import parser
from app.ai.client import AIClient, AIMessage
from app.ai.context_formatting import format_mission_and_datasets
from app.ai.exceptions import ParsingException
from app.ai.models import AgentName, AnalysisRequest, AnalysisResult, BusinessAnalysisOutput
from app.ai.prompt_loader import PromptLoader

_PROMPT_NAME = "business"


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
        user_message = format_mission_and_datasets(request)

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
                "business_analysis": output,
                "completed_stages": [*base.completed_stages, AgentName.BUSINESS],
                "completed_at": datetime.now(UTC),
            }
        )
