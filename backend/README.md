# MissionOS Backend

FastAPI backend for MissionOS: infrastructure, database models, and JWT authentication
are implemented — see [Not implemented yet](#not-implemented-yet) below for the explicit
scope boundary.

## Structure

```
backend/
  app/
    main.py          FastAPI() instance: CORS, logging, middleware, router registration
    api/              Route modules (currently: health.py -> GET /health)
    core/             Cross-cutting app bootstrap (currently: logging_config.py)
    config/           Settings (pydantic-settings), get_settings() DI dependency
    database/         SQLAlchemy Base, engine, SessionLocal, get_db() dependency
    models/           SQLAlchemy ORM models: User, Mission, Dataset (+ enums.py for status/priority)
    schemas/          Pydantic request/response models (health.py, auth.py)
    repositories/     Data-access layer, one class per model (currently: UserRepository)
    services/         Business logic layer (currently: auth_service.py)
    middleware/        Custom ASGI middleware (currently: request logging)
    utils/              Shared helpers (empty)
  alembic/              Migration tooling, wired to app.database.base.Base
    versions/           5f2e04b46f47_create_users_missions_datasets_tables.py
  alembic.ini
  requirements.txt      Runtime dependencies
  requirements-dev.txt   + ruff (lint/format), for local dev and CI
  ruff.toml
  .env.example
  README.md (this file)
```

The `utils/` layer is still empty; it exists now so later tickets add files to an
established structure instead of inventing one mid-feature.

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

Local Postgres is provisioned via Docker Compose — see the [root README](../README.md#infrastructure-docker)
for `docker compose up -d` / pgAdmin instructions. `.env.example`'s `DATABASE_URL` uses
`localhost:5432` because the backend currently runs directly on the host via `uvicorn`,
not inside Docker — only Postgres and pgAdmin are containerized. The `postgres` hostname
(the Compose service name) only resolves for containers on the `missionos-network`
network, so it would only be correct once the backend itself is containerized and joins
that same network.

`DATABASE_URL` in `.env` points at Postgres, and the schema now has three tables —
`users`, `missions`, `datasets` — defined as SQLAlchemy ORM models under `app/models/`.
`app/database/base.py`'s `Base` uses SQLAlchemy 2.0's `DeclarativeBase` class pattern
(the current recommended form, over the legacy `declarative_base()` factory).
`app/models/__init__.py` imports all three so `Base.metadata` is fully populated, and
`alembic/env.py` imports `app.models` for the same reason before autogenerating.

### Schema

- **users** — `id` (UUID pk), `full_name`, `email` (unique), `password_hash`, `created_at`,
  `updated_at`. One user has many missions (`ON DELETE CASCADE`).
- **missions** — `id` (UUID pk), `user_id` (FK → users, indexed), `title`, `business_domain`,
  `priority` (native enum: low/medium/high/critical, indexed), `problem_statement`,
  `objective`, `expected_output`, `status` (native enum: draft/ready/processing/completed/failed,
  indexed), `created_at`, `updated_at`. One mission has many datasets (`ON DELETE CASCADE`).
- **datasets** — `id` (UUID pk), `mission_id` (FK → missions, indexed), `original_filename`,
  `stored_filename`, `file_type`, `file_size`, `upload_status` (native enum:
  uploaded/validating/ready/failed, indexed), `created_at`.

All primary keys are `UUID`, generated client-side (`default=uuid.uuid4`). All timestamps
are `TIMESTAMP WITH TIME ZONE` with `server_default=now()`.

Alembic is initialized and `alembic/env.py` is wired to `Base.metadata` and
`settings.database_url`. The initial migration (`5f2e04b46f47_create_users_missions_datasets_tables.py`)
was generated with `alembic revision --autogenerate` and applied with `alembic upgrade head`.
Commands that need a live connection (`alembic current`, `alembic upgrade head`) require a
running Postgres instance matching `DATABASE_URL`. To check the wiring without a database
running, use offline mode:

```bash
alembic upgrade head --sql
```

## Authentication

JWT-based auth lives in `app/api/auth.py`, `app/api/deps.py`, `app/core/security.py`,
`app/services/auth_service.py`, and `app/repositories/user_repository.py`.

- **`POST /auth/register`** — validates the request with `UserRegisterRequest` (Pydantic
  `EmailStr` for format, `Field(min_length=8)` for password), 409s if the email is already
  taken, hashes the password with `pwdlib`'s recommended hasher (Argon2), and returns
  `UserResponse` — `id`/`full_name`/`email`/`created_at` only, never `password_hash`.
- **`POST /auth/login`** — takes an `OAuth2PasswordRequestForm` (form-encoded
  `username`/`password`; `username` holds the email), verifies the password hash, and
  returns a JWT `{access_token, token_type: "bearer"}`. Wrong credentials → 401.
- **`GET /auth/me`** — protected; returns the authenticated `UserResponse`.

`app/core/security.py` holds the two independent primitives: `hash_password` /
`verify_password` (pwdlib/Argon2) and `create_access_token` / `decode_access_token`
(python-jose, `HS256`, expiry from `settings.access_token_expire_minutes`). The JWT's
`sub` claim is the user's UUID as a string.

`app/api/deps.py`'s `get_current_user` is the reusable dependency for protecting any
route: it decodes the bearer token via `OAuth2PasswordBearer(tokenUrl="auth/login")`,
loads the user by the `sub` claim, and raises `401` (with a `WWW-Authenticate: Bearer`
header) if the token is missing, invalid, expired, or the user no longer exists.

`JWT_SECRET_KEY` has a dev-only default in `settings.py` (`dev-secret-change-me`) —
`.env` and `.env.example` both override it with a real random value
(`.env`'s is generated via `secrets.token_urlsafe`); every deployed environment must set
its own.

## Not implemented yet

Deliberately absent so far:

- Mission CRUD or any other domain endpoints
- Business logic beyond authentication (mission workflow, AI orchestration, etc.)
- AI / LLM integration
- File upload handling
- Refresh tokens / token revocation / logout invalidation (logout is client-side only —
  the frontend discards the token; the JWT itself remains valid until it expires)
