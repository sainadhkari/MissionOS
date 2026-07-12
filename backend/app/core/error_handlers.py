import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("missionos.errors")


def register_exception_handlers(app: FastAPI) -> None:
    """Every `HTTPException` raised throughout the app already produces a
    `{"detail": "..."}` JSON body (FastAPI's default handler). This closes
    the one gap that leaves: an *unhandled* exception (a bug) — without it,
    the response shape is inconsistent (and, if `settings.debug` is ever
    True, includes a full HTML stack trace). The traceback still goes
    somewhere useful — the server log, correlated by request ID — just never
    into the HTTP response.
    """

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
