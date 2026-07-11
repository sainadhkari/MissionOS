class AIException(Exception):
    """Base class for every exception raised by app.ai."""


class ModelException(AIException):
    """Raised when the underlying AI client fails to produce a response —
    timeout, network error, provider-side failure, etc."""


class ParsingException(AIException):
    """Raised when a model's response can't be parsed into the expected
    structure — invalid JSON, schema mismatch, missing fields, ..."""
