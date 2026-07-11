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
    models/           SQLAlchemy ORM models: User, Mission, Dataset, DatasetProfile (+ enums.py)
    schemas/          Pydantic request/response models (health.py, auth.py, mission.py, dataset.py)
    repositories/     Data-access layer, one class per model
    services/         Business logic layer, incl. dataset validation/profiling
    middleware/        Custom ASGI middleware (currently: request logging)
    utils/              Shared helpers (empty)
  alembic/              Migration tooling, wired to app.database.base.Base
    versions/           5f2e04b46f47_create_users_missions_datasets_tables.py
                         2c4d6ce01b9b_add_dataset_profiles_table.py
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
- **dataset_profiles** — `id` (UUID pk), `dataset_id` (FK → datasets, unique, `ON DELETE CASCADE`),
  `row_count`, `column_count`, `columns`/`missing_values`/`numeric_summary`/`categorical_summary`
  (`JSONB`), `duplicate_row_count`, `encoding`, `delimiter`, `validation_errors` (`JSONB`, null
  unless validation failed), `created_at`, `updated_at`. One dataset has at most one profile.

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

## Missions

CRUD for the `missions` table lives in `app/api/missions.py`, `app/services/mission_service.py`,
and `app/repositories/mission_repository.py`. Every route requires `get_current_user`;
`MissionRepository.get_for_user` filters by `mission_id` **and** `user_id` in the same query, so a
mission owned by someone else and a nonexistent mission are indistinguishable — both come back as
`None` from the repository and both surface as a generic 404 from the API. `MissionResponse` omits
`user_id` for the same reason.

## Datasets

Upload/list/delete for the `datasets` table lives in `app/api/datasets.py`,
`app/services/dataset_service.py`, `app/repositories/dataset_repository.py`, and
`app/core/storage.py`. A dataset always belongs to a mission, so ownership is transitive:

- `POST /missions/{mission_id}/datasets` and `GET /missions/{mission_id}/datasets` first resolve
  the mission via `mission_service.get_mission` (owner-scoped, 404 if not owned), then operate on
  its datasets.
- `GET /datasets/{dataset_id}` and `DELETE /datasets/{dataset_id}` aren't nested under a mission
  path, so `DatasetRepository.get_owned` joins `Dataset` to `Mission` and filters on
  `Mission.user_id` directly in the query — same "unowned and nonexistent look identical" pattern
  as missions.

**Storage**: `app/core/storage.py` writes uploaded files to `storage/uploads/` (resolved relative
to the `backend/` directory, not the process's cwd, via `Path(__file__).resolve().parents[2]`)
under a `uuid4()`-derived filename — the original filename is kept only as DB metadata
(`original_filename`) and is never used to build a filesystem path, so there's no overwrite risk
and no path-traversal surface from a hostile filename. `storage/uploads/` is gitignored except for
a `.gitkeep`.

**Validation**: only `.csv`, `.xlsx`, and `.json` extensions are accepted (415 otherwise), and
files over `settings.max_upload_size_bytes` (25 MB) are rejected (413). The size check happens
after Starlette has already spooled the multipart body (there's no cheap way to abort mid-stream
through FastAPI's `UploadFile` dependency), so it caps what gets persisted to permanent storage and
written to the database, not the bytes received per request.

## Dataset validation & profiling

Reading and profiling an uploaded file's *contents* (as opposed to just its extension/size,
covered above) lives in `app/services/dataset_validation_service.py`,
`app/services/dataset_profile_service.py`, `app/services/dataset_profiling_pipeline.py`, and the
`dataset_profiles` table (`app/models/dataset_profile.py`).

**Pipeline**: `POST /missions/{mission_id}/datasets` schedules `run_dataset_profiling` as a
FastAPI `BackgroundTask` after the upload response's DB transaction commits, so the upload request
itself stays fast. The task runs in Starlette's thread pool (it's a plain `def`, not `async def`)
and opens its **own** `SessionLocal()` — the request-scoped session from `get_db` is already closed
by the time it runs. It drives `Dataset.upload_status` through the full lifecycle:
`uploaded` (set at upload time) → `validating` (set the moment the task starts) → `ready` (parsed
successfully — this is "Validated") or `failed` ("Validation Failed"). A catch-all `except
Exception` around the task body guards against `validating` getting stuck forever if profiling
itself has a bug — there's no HTTP response for an unhandled exception to surface through here.

**Validation** (`dataset_validation_service.py`): reads the file at its stored path and parses it
with `pandas`, dispatching on `Dataset.file_type`:
- **CSV** — `chardet` detects the encoding, `csv.Sniffer` detects the delimiter (from `,`/`;`/tab/`|`,
  falling back to `,` if sniffing fails on a small/ambiguous sample), then `pd.read_csv`.
- **Excel** — `pd.read_excel(engine="openpyxl")`.
- **JSON** — `json.loads` then `pd.json_normalize` (accepts a top-level array of objects, or a
  single object treated as a one-row dataset).

An empty file (0 bytes) or a file with zero *columns* raises `DatasetValidationError`
(→ `failed`); a file with headers but zero *data rows* parses fine (→ `ready`, `row_count: 0`) since
that's a structurally valid, if trivial, dataset. Any parse failure (corrupt CSV, non-Excel bytes
in a `.xlsx`, malformed JSON) is caught and turned into a human-readable message in
`validation_errors` rather than propagating.

**Profiling** (`dataset_profile_service.py`): given a parsed `DataFrame`, computes and stores one
`DatasetProfile` row (1:1 with `Dataset`, `ON DELETE CASCADE`):
- `row_count` / `column_count`
- `columns` — per column: `name`, `dtype` (pandas dtype as a string), `category`, `missing_count`
- `missing_values` — missing count by column name
- `duplicate_row_count` — `df.duplicated().sum()`
- `numeric_summary` — per numeric column: `count`/`min`/`max`/`mean`/`median`/`std`
- `categorical_summary` — per categorical column: `unique_count` + top 5 values with counts
- `encoding` / `delimiter` (CSV only; `None` otherwise)

**Column classification** is a simple heuristic, not a schema declaration: a column is `date` if
pandas already parsed it as `datetime64`, or if ≥80% of its non-null values successfully parse via
`pd.to_datetime(..., errors="coerce")`; `numeric` if pandas' dtype says so; everything else is
`categorical`. `_to_jsonable` recursively converts numpy scalars (`int64`, `float64`, `Timestamp`,
...) to native Python and NaN/NaT to `None`, since neither round-trips through the `JSONB` columns
otherwise.

**API surface**: no new endpoints — `DatasetResponse` (used by both the list and single-dataset
routes) now embeds `profile: DatasetProfileResponse | None`, so the existing ownership-scoped
routes are the only way to reach profile data; there's no separate unauthenticated profile lookup
to forget to guard.

## Not implemented yet

Deliberately absent so far:

- Business logic beyond auth, mission CRUD, dataset upload/list/delete, and dataset
  validation/profiling (mission execution, reports, etc.)
- AI / LLM integration, embeddings, RAG — profiling is descriptive statistics only, no model calls
- A job queue — the profiling pipeline is a single in-process `BackgroundTask`; it doesn't survive
  a server restart mid-task, isn't retried on failure, and doesn't scale past one process
- Refresh tokens / token revocation / logout invalidation (logout is client-side only —
  the frontend discards the token; the JWT itself remains valid until it expires)
