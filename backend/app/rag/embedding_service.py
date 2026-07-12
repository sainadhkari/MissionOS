import hashlib
from abc import ABC, abstractmethod

import openai
from openai import AsyncOpenAI

from app.config.settings import Settings
from app.rag.exceptions import EmbeddingException

# OpenAI's embeddings endpoint accepts a batch per call; kept well under its
# per-request item limit so one oversized dataset can't blow past it.
_BATCH_SIZE = 100


class EmbeddingClient(ABC):
    """Reusable interface for any text-embedding backend — mirrors
    `app.ai.client.AIClient`'s provider-agnostic shape, so `app.rag` never
    hardcodes a specific embeddings provider outside this module."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Returns one embedding vector per input text, in the same order."""
        raise NotImplementedError


class OpenAIEmbeddingClient(EmbeddingClient):
    """EmbeddingClient implementation backed by OpenAI's embeddings API.

    Configuration is read from an injected `Settings` instance, never module
    -level state — construct one per use, same convention as `OpenAIClient`.
    """

    def __init__(self, settings: Settings) -> None:
        self._model = settings.openai_embedding_model
        try:
            self._client = AsyncOpenAI(
                api_key=settings.openai_api_key or None,
                timeout=settings.openai_timeout,
            )
        except openai.OpenAIError as exc:
            raise EmbeddingException(f"Could not initialize OpenAI client: {exc}") from exc

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        vectors: list[list[float]] = []
        for start in range(0, len(texts), _BATCH_SIZE):
            batch = texts[start : start + _BATCH_SIZE]
            try:
                response = await self._client.embeddings.create(model=self._model, input=batch)
            except openai.AuthenticationError as exc:
                raise EmbeddingException(
                    "OpenAI authentication failed — check OPENAI_API_KEY."
                ) from exc
            except openai.RateLimitError as exc:
                raise EmbeddingException("OpenAI rate limit exceeded.") from exc
            except openai.APITimeoutError as exc:
                raise EmbeddingException("OpenAI embedding request timed out.") from exc
            except openai.APIConnectionError as exc:
                raise EmbeddingException("Could not connect to OpenAI.") from exc
            except openai.APIError as exc:
                raise EmbeddingException(f"OpenAI embedding request failed: {exc}") from exc

            vectors.extend(item.embedding for item in response.data)
        return vectors


class MockEmbeddingClient(EmbeddingClient):
    """Deterministic, no-network EmbeddingClient — mirrors
    `app.ai.providers.mock_client.MockAIClient`. Produces a small, stable
    pseudo-embedding per text via hashing, so chunking/retrieval logic can be
    exercised without an OpenAI key or network access."""

    _DIMENSIONS = 32

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [(byte / 255.0) * 2 - 1 for byte in digest[: self._DIMENSIONS]]
