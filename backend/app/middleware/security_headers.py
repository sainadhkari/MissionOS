from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# This API serves JSON and file downloads only — it never renders HTML of
# its own (the report endpoint returns a *downloadable* HTML document, not
# a page this app serves itself), so there's no meaningful Content-Security-
# Policy to add without knowing what's hosting it. These headers are the
# ones that are unconditionally correct for any JSON/file API regardless of
# deployment.
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # A no-op unless served over HTTPS (typically terminated by a reverse
    # proxy in front of this app, not by this app itself) — harmless either
    # way, since browsers ignore it on a plain HTTP response.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        for name, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        return response
