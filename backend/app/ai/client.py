from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AIMessage:
    """A single chat turn sent to an AI client — provider-agnostic on purpose."""

    role: str
    content: str


class AIClient(ABC):
    """Reusable interface for any AI/LLM backend.

    Nothing in this module calls a model or makes a network request — it only
    defines the contract a concrete client (OpenAI, Anthropic, a local model,
    a test double, ...) must satisfy, so the rest of `app.ai` never needs to
    know which provider is behind it. Concrete implementations are out of
    scope for this ticket.
    """

    @abstractmethod
    async def complete(self, messages: list[AIMessage], **kwargs: Any) -> str:
        """Send `messages` to the underlying model and return its raw text response."""
        raise NotImplementedError
