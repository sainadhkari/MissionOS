from typing import Any

from app.ai.client import AIClient, AIMessage


class MockAIClient(AIClient):
    """Deterministic, no-network `AIClient` for local development and tests.

    Always returns the response it was constructed with — never inspects
    `messages`, never makes a network call. Useful anywhere the pipeline
    needs an `AIClient` but a real provider (cost, network, credentials)
    isn't appropriate, e.g. future automated tests.
    """

    def __init__(self, response: str = "OK") -> None:
        self._response = response

    async def complete(self, messages: list[AIMessage], **kwargs: Any) -> str:
        return self._response
