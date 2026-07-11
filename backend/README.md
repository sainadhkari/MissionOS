# MissionOS Backend

FastAPI backend foundation for MissionOS. This is infrastructure only — see
[Not implemented yet](#not-implemented-yet) below for the explicit scope boundary.

## Structure

```
backend/
  app/
    main.py          FastAPI() instance: CORS, logging, middleware, router registration
    api/              Route modules (currently: health.py -> GET /health)
    core/             Cross-cutting app bootstrap (currently: logging_config.py)
    config/           Settings (pydantic-settings), get_settings() DI dependency
    database/         SQLAlchemy Base, engine, SessionLocal, get_db() dependency — no tables yet
    models/           SQLAlchemy ORM models (empty — none defined yet)
    schemas/          Pydantic request/response models (currently: health.py)
    repositories/     Data-access layer, one class per model (empty — no models yet)
    services/         Business logic layer (empty — none yet)
    middleware/        Custom ASGI middleware (currently: request logging)
    utils/              Shared helpers (empty)
  alembic/              Migration tooling, wired to app.database.base.Base — no migrations generated yet
  alembic.ini
  requirements.txt      Runtime dependencies
  requirements-dev.txt   + ruff (lint/format), for local dev and CI
  ruff.toml
  .env.example
  README.md (this file)
```

Each empty layer (`models/`, `repositories/`, `services/`, `utils/`) exists now so later
tickets add files to an established structure instead of inventing one mid-feature.

## Setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt   # runtime deps + ruff; use requirements.txt alone for prod
cp .env.example .env          # edit values if needed
```

## Run

```bash
uvicorn app.main:app --reload
```

Then:

```bash
curl http://127.0.0.1:8000/health
# {"status":"healthy","service":"MissionOS Backend"}
```

## Lint / format

```bash
ruff check .
ruff format .
```

## Configuration

`app/config/settings.py` is a `pydantic_settings.BaseSettings` subclass — fields are read
from environment variables (or `.env`, via `SettingsConfigDict(env_file=".env")`) and
validated at startup, so a malformed value fails fast with a clear error instead of being
silently accepted. `environment` is constrained to `Literal["development", "staging",
"production"]` for the same reason.

Two ways to access settings exist on purpose:
- `settings` — a plain module-level singleton, for contexts outside FastAPI's dependency
  graph (e.g. `alembic/env.py`, which runs standalone and can't receive `Depends()`).
- `get_settings()` — an `lru_cache`-wrapped function, the `Depends()`-compatible form,
  overridable in tests later.

## Logging

`app/core/logging_config.py` configures logging via `logging.config.dictConfig` (not
`basicConfig`) so per-logger overrides are explicit and it's easy to extend (e.g. add a
JSON formatter later) without restructuring. Two loggers are deliberately quieted to
`WARNING`:
- `uvicorn.access` — `app/middleware/logging_middleware.py`'s `RequestLoggingMiddleware`
  already logs every request (method, path, status, duration); leaving uvicorn's own
  access logger at its default level would log each request twice.
- `sqlalchemy.engine` — pre-emptively quiet; gets noisy once real queries exist.

## Database

`DATABASE_URL` in `.env` points at Postgres, but the SQLAlchemy `engine` is lazy — it is
never actually connected to by `/health` or app startup. No tables exist and none are
created by this ticket. `app/database/base.py`'s `Base` uses SQLAlchemy 2.0's
`DeclarativeBase` class pattern (the current recommended form, over the legacy
`declarative_base()` factory).

Alembic is initialized and `alembic/env.py` is wired to `Base.metadata` and
`settings.database_url`, so `alembic revision --autogenerate` will work once models are
added. Commands that need a live connection (`alembic current`, `alembic upgrade head`)
require a running Postgres instance matching `DATABASE_URL`. To check the wiring without
a database running, use offline mode:

```bash
alembic upgrade head --sql
```

## Not implemented yet

This ticket is backend infrastructure only. Deliberately absent:

- Authentication / authorization
- Business logic (mission workflow, AI orchestration, etc.)
- AI / LLM integration
- Mission CRUD or any other domain endpoints
- A live database connection or any tables/migrations
