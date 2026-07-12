class RagException(Exception):
    """Base class for every exception raised by app.rag."""


class ChunkingException(RagException):
    """Raised when a dataset can't be split into chunks."""


class EmbeddingException(RagException):
    """Raised when the embedding client fails to produce vectors — timeout,
    network error, provider-side failure, etc."""


class VectorStoreException(RagException):
    """Raised when the vector store fails to persist or query chunks."""
