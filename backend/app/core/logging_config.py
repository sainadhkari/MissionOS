import json
import logging
from logging.config import dictConfig

from app.config.settings import settings


class JSONFormatter(logging.Formatter):
    """Machine-parseable log output for production log aggregation. Emits one
    JSON object per line — never the raw exception args or request bodies,
    only what's already been rendered into `record.message`, so anything a
    caller didn't explicitly put in a log message (secrets, tokens, request
    bodies) can't end up here by accident.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None)
        if request_id:
            payload["request_id"] = request_id
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging() -> None:
    # JSON in production (log-aggregator friendly); a human-readable line
    # format everywhere else (dev/staging) — same information either way,
    # just formatted for the audience actually reading it.
    formatter = "json" if settings.environment == "production" else "default"

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                },
                "json": {
                    "()": "app.core.logging_config.JSONFormatter",
                },
            },
            "filters": {
                "request_id": {"()": "app.core.request_context.RequestIdLogFilter"},
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": formatter,
                    "filters": ["request_id"],
                },
            },
            "root": {
                "level": settings.log_level,
                "handlers": ["console"],
            },
            "loggers": {
                # RequestLoggingMiddleware already logs every request; without
                # this, uvicorn's own access logger duplicates that line.
                "uvicorn.access": {"level": "WARNING"},
                "sqlalchemy.engine": {"level": "WARNING"},
            },
        }
    )
