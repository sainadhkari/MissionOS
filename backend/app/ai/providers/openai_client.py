from typing import Any

import openai
from openai import AsyncOpenAI

from app.ai.client import AIClient, AIMessage
from app.ai.exceptions import ModelException, ParsingException
from app.config.settings import Settings


class OpenAIClient(AIClient):
    """AIClient implementation backed by the OpenAI Responses API.

    Configuration is read from an injected `Settings` instance, never from
    module-level state — construct one per use (or once, via DI, in whatever
    later ticket wires an orchestrator together). This class knows nothing
    about `MissionContext`, prompts, or business logic: it only converts
    `AIMessage` objects into SDK input and returns plain text.
    """

    def __init__(self, settings: Settings) -> None:
        self._model = settings.openai_model
        try:
            self._client = AsyncOpenAI(
                api_key=settings.openai_api_key or None,
                timeout=settings.openai_timeout,
            )
        except openai.OpenAIError as exc:
            raise ModelException(f"Could not initialize OpenAI client: {exc}") from exc

    async def complete(self, messages: list[AIMessage], **kwargs: Any) -> str:
        try:
            response = await self._client.responses.create(
                model=self._model,
                input=[{"role": message.role, "content": message.content} for message in messages],
                **kwargs,
            )
        except openai.AuthenticationError as exc:
            raise ModelException(
                "OpenAI authentication failed — check OPENAI_API_KEY."
            ) from exc
        except openai.RateLimitError as exc:
            raise ModelException("OpenAI rate limit exceeded.") from exc
        except openai.APITimeoutError as exc:
            raise ModelException("OpenAI request timed out.") from exc
        except openai.APIConnectionError as exc:
            raise ModelException("Could not connect to OpenAI.") from exc
        except openai.APIError as exc:
            raise ModelException(f"OpenAI request failed: {exc}") from exc

        text = response.output_text
        if not text:
            raise ParsingException("OpenAI response contained no text output.")
        return text
