from app.ai.agents.business_agent import BusinessAgent
from app.ai.agents.executive_agent import ExecutiveAgent
from app.ai.agents.risk_agent import RiskAgent
from app.ai.agents.strategy_agent import StrategyAgent
from app.ai.models import AnalysisRequest, AnalysisResult


class AnalysisOrchestrator:
    """Wires the four-agent pipeline together:

        Mission -> Business -> Strategy -> Risk -> Executive -> AnalysisResult

    Every agent is constructor-injected, so this class has no knowledge of
    *how* analysis happens — only the order in which agents run and how
    results are threaded between them. Swapping an agent's implementation,
    or inserting a new stage, never requires touching `run()`'s control flow,
    only the wiring at the call site that constructs the orchestrator — that
    call site doesn't exist yet either; nothing in this ticket instantiates
    `AnalysisOrchestrator` or wires it into an API route.

    Agent logic is not implemented yet (Ticket-012A is infrastructure only) —
    calling `run()` will raise whatever `NotImplementedError` the first
    agent's `analyze()` raises.
    """

    def __init__(
        self,
        business_agent: BusinessAgent,
        strategy_agent: StrategyAgent,
        risk_agent: RiskAgent,
        executive_agent: ExecutiveAgent,
    ) -> None:
        self._business_agent = business_agent
        self._strategy_agent = strategy_agent
        self._risk_agent = risk_agent
        self._executive_agent = executive_agent

    async def run(self, request: AnalysisRequest) -> AnalysisResult:
        result = await self._business_agent.analyze(request)
        result = await self._strategy_agent.analyze(request, result)
        result = await self._risk_agent.analyze(request, result)
        result = await self._executive_agent.analyze(request, result)
        return result
