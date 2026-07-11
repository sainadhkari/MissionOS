from app.ai.client import AIClient
from app.ai.models import AnalysisRequest, AnalysisResult


class ExecutiveAgent:
    """Fourth and final stage of the analysis pipeline: synthesizes the
    Business, Strategy, and Risk agents' output into the completed
    `AnalysisResult`. Producing the polished `ExecutiveReport` from that
    result is a separate, later capability — see "Do NOT generate reports".

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
