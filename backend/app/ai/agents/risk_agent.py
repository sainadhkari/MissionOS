from app.ai.client import AIClient
from app.ai.models import AnalysisRequest, AnalysisResult


class RiskAgent:
    """Third stage of the analysis pipeline: risk interpretation, building on
    the Strategy Agent's output.

    Logic is intentionally not implemented yet — see Ticket-012A's scope
    ("Do NOT analyze datasets"). This class exists so the orchestrator has a
    concrete, dependency-injected collaborator to call; the `AIClient` is
    accepted but never invoked here.
    """

    def __init__(self, client: AIClient) -> None:
        self._client = client

    async def analyze(
        self, request: AnalysisRequest, prior: AnalysisResult | None = None
    ) -> AnalysisResult:
        raise NotImplementedError
