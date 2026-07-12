import logging
from contextvars import ContextVar

_request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def set_request_id(request_id: str) -> None:
    _request_id_var.set(request_id)


def get_request_id() -> str | None:
    return _request_id_var.get()


class RequestIdLogFilter(logging.Filter):
    """Attaches the current request's ID (if any) to every log record made
    while handling it, so a formatter can include it without every call site
    threading it through explicitly. A no-op outside a request (e.g. the
    dataset-profiling/mission-analysis background tasks, which run after the
    request that triggered them has already finished)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True
