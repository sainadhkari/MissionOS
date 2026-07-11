from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.config.settings import settings
from app.core.logging_config import configure_logging
from app.middleware.logging_middleware import RequestLoggingMiddleware

configure_logging()

expose_docs = settings.environment != "production"

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs" if expose_docs else None,
    redoc_url="/redoc" if expose_docs else None,
    openapi_url="/openapi.json" if expose_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(health.router)
