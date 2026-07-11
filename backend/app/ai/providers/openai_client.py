import logging
from typing import Any

import openai
from openai import AsyncOpenAI

from app.ai.client import AIClient, AIMessage
from app.ai.exceptions import ModelException, ParsingException
from app.config.settings import Settings

logger = logging.getLogger("missionos.ai.openai_client")

# OpenAI's reasoning-tier models (o1/o3/o4/gpt-5 families) behave differently
# from sampling models in two ways this client compensates for. Both are
# known, maintained exclusion-list facts, not heuristic guesses — the list
# may need updating as new reasoning model families ship. Kept here (not in
# any agent) because these are OpenAI-specific model constraints, not
# something a provider-agnostic agent should know about.
_REASONING_MODEL_PREFIXES = ("o1", "o3", "o4", "gpt-5")


def _is_reasoning_model(model: str) -> bool:
    return model.startswith(_REASONING_MODEL_PREFIXES)


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
        if _is_reasoning_model(self._model):
            if "temperature" in kwargs:
                # Reasoning models reject sampling temperature outright (400
                # Bad Request) rather than ignoring it.
                logger.debug(
                    "Dropping unsupported 'temperature' kwarg for reasoning model %s", self._model
                )
                kwargs = {key: value for key, value in kwargs.items() if key != "temperature"}
            if "reasoning" not in kwargs:
                # Without this, a reasoning model can spend its entire
                # max_output_tokens budget on internal reasoning and return
                # an empty output_text — "low" leaves headroom for the
                # visible response while still reasoning some. Callers that
                # want more depth can still pass their own `reasoning` kwarg.
                kwargs["reasoning"] = {"effort": "low"}

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
