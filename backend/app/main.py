from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, datasets, health, mission_analysis, missions
from app.config.settings import settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging_config import configure_logging
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

configure_logging()

expose_docs = settings.environment != "production"

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    # Always False, deliberately not `settings.debug`: Starlette's debug mode
    # renders a full in-response HTML/text stack trace for any unhandled
    # exception — and takes priority over our own `register_exception_handlers`
    # below, so leaving this tied to `settings.debug` (True by default in
    # dev) would leak tracebacks into HTTP responses whenever DEBUG=true.
    # `settings.debug` still exists for other dev/prod behavior differences;
    # it just must never control this specific Starlette flag.
    debug=False,
    docs_url="/docs" if expose_docs else None,
    redoc_url="/redoc" if expose_docs else None,
    openapi_url="/openapi.json" if expose_docs else None,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    # Only the methods/headers this API actually uses — narrower than the
    # `["*"]` wildcards a dev-only setup can get away with.
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    # Content-Disposition isn't in the CORS default-exposed header set, so
    # without this the frontend's report download can't read the filename
    # the backend chose (app/api/mission_analysis.py's export_report).
    expose_headers=["Content-Disposition"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(missions.router)
app.include_router(datasets.mission_datasets_router)
app.include_router(datasets.dataset_router)
app.include_router(mission_analysis.router)
