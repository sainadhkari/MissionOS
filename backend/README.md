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
    models/           SQLAlchemy ORM models: User, Mission, Dataset, DatasetProfile,
                       MissionAnalysis (+ enums.py)
    schemas/          Pydantic request/response models (health.py, auth.py, mission.py,
                       dataset.py, mission_analysis.py)
    repositories/     Data-access layer, one class per model
    services/         Business logic layer, incl. dataset validation/profiling and
                       AI analysis orchestration (mission_analysis_service.py)
    middleware/        Custom ASGI middleware (currently: request logging)
    utils/              Shared helpers (empty)
  alembic/              Migration tooling, wired to app.database.base.Base
    versions/           5f2e04b46f47_create_users_missions_datasets_tables.py
                         2c4d6ce01b9b_add_dataset_profiles_table.py
                         58ae864afad0_add_mission_analyses_table.py
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
- **mission_analyses** — `id` (UUID pk), `mission_id` (FK → missions, unique, `ON DELETE CASCADE`),
  `status` (native enum: pending/running/completed/failed, indexed), `business_analysis`/
  `strategy_analysis`/`risk_analysis`/`executive_analysis` (`JSONB`, null until that stage
  completes), `error_message` (null unless `status = failed`), `started_at`, `completed_at`,
  `created_at`, `updated_at`. One mission has at most one analysis — re-running resets this row
  rather than creating a new one (see "AI Analysis API & Orchestration" below).

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

## AI architecture

`app/ai/` is the mission-analysis pipeline's home. Nothing in the rest of the app calls into it
yet — the orchestrator itself isn't wired into any route or background task — so it can't affect
any existing behavior.

- **`client.py`** — `AIClient` is an `ABC` with one abstract method, `complete(messages,
  **kwargs) -> str`. `AIMessage` (`role`/`content`) is the provider-agnostic input shape. Nothing
  outside `app/ai/providers/` knows or cares which concrete provider is behind it.
- **`models.py`** — `MissionContext`/`DatasetContext` are read-only snapshots shaped for AI
  consumption, deliberately independent of `app.schemas`/`app.models` (so this package never needs
  to know how the rest of the app persists or serves data). `AnalysisResult` accumulates through
  the pipeline — each stage returns an updated copy. `ExecutiveReport` wraps a *completed*
  `AnalysisResult`; nothing constructs one yet (report generation is a later ticket).
- **`orchestrator.py`** — `AnalysisOrchestrator` takes all four agents via constructor injection
  and threads a single `AnalysisResult` through Business → Strategy → Risk → Executive. The control
  flow is real and wired; three of the four agents (`strategy_agent.py`/`risk_agent.py`/
  `executive_agent.py`) still raise `NotImplementedError` from `analyze()` — only `BusinessAgent`
  has real logic (below). Nothing constructs an `AnalysisOrchestrator` yet either.
- **`parser.py`** — `extract_json_block`/`parse_json`/`parse_structured_response` are genuinely
  implemented (JSON parsing and Pydantic validation aren't "AI logic"), reused by every agent that
  needs structured output instead of each hand-rolling response parsing.
- **`prompt_loader.py`** — `PromptLoader.load(name)` reads `prompts/<name>.md`. Kept as its own
  small, injectable class (rather than agents reading files directly) so every agent loads prompts
  the same way and prompt content can be swapped in tests without touching agent logic.
- **`exceptions.py`** — `AIException` (base) → `ModelException` (the client/provider failed) and
  `ParsingException` (a response couldn't be parsed into the expected shape).
- **`prompts/*.md`** — one file per agent. `business.md` has real prompt content (below); the other
  three remain placeholders — no prompt content until their agents are implemented.

### Providers (`app/ai/providers/`)

Two concrete `AIClient` implementations, both constructed via dependency injection — neither is a
singleton or reads global state:

- **`OpenAIClient`** — wraps `openai.AsyncOpenAI` and calls the Responses API
  (`client.responses.create`). Takes a `Settings` instance in its constructor and never reads the
  module-level `settings` singleton directly, so it's swappable/testable without touching env vars.
  `complete()` converts `AIMessage` → `{"role", "content"}` dicts for the SDK's `input` param and
  returns `response.output_text`; it knows nothing about `MissionContext` or prompts. SDK
  exceptions are translated to `ModelException`
  (`AuthenticationError`/`RateLimitError`/`APITimeoutError`/`APIConnectionError`, plus a catch-all
  for other `APIError` subclasses); an empty `output_text` (e.g. a reasoning model that exhausted
  its token budget on reasoning and never emitted visible text — reproduced live during
  verification) raises `ParsingException` rather than silently returning `""`.
- **`MockAIClient`** — returns a fixed, constructor-injected string, touches no network. For local
  development and future automated tests that need an `AIClient` without cost or credentials.

### Configuration

`OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_TIMEOUT` are `Settings` fields like everything else —
`OPENAI_API_KEY` defaults to `""` (never a real secret in code), so a misconfigured environment
fails fast inside `OpenAIClient.__init__` (translated to `ModelException`) rather than attempting a
request that was never going to authenticate. `.env.example` documents all three with placeholder
values only.

### Business Agent (`app/ai/agents/business_agent.py`)

The first pipeline stage with real logic. `BusinessAgent.__init__` takes an `AIClient` and a
`PromptLoader` — both injected, never constructed internally, so it works identically against
`OpenAIClient` or `MockAIClient`.

`analyze()`: loads `prompts/business.md` as the system prompt, renders the mission/dataset context
via `context_formatting.format_mission_and_datasets` (title/business_domain/objective/
problem_statement/expected_output, and per dataset: row/column counts, per-column
name/dtype/category/missing_count, duplicate_row_count, numeric/categorical summaries — never raw
rows) as the user message, and calls `client.complete([system, user])`. The response is validated
against `BusinessAnalysisOutput` (`business_problem`, `key_opportunities`, `important_metrics`,
`recommended_next_steps`, `confidence: float` bounded `[0, 1]`) via
`parser.parse_structured_response`, which already raises `ParsingException` on invalid JSON or a
schema mismatch — `BusinessAgent` adds one more check on top (an empty/whitespace-only response
also raises `ParsingException`) since not every `AIClient` implementation is guaranteed to catch
that itself. On success, it returns an updated `AnalysisResult` with `business_analysis` set to the
full validated output and `AgentName.BUSINESS` appended to `completed_stages`.

`DatasetContext` gained a `duplicate_row_count` field in Ticket-012C — the 012A skeleton didn't
have it, but the Business Agent's prompt requires it as one of its explicit inputs.

### Strategy Agent (`app/ai/agents/strategy_agent.py`)

The second pipeline stage. Same DI shape as `BusinessAgent` (`AIClient` + `PromptLoader`,
constructor-injected). It refuses to run without a completed `BusinessAnalysisOutput`: if `prior`
is `None` or `prior.business_analysis` is `None`, `analyze()` raises `AIException` immediately,
before calling the model — "do not recompute the business analysis" enforced structurally, not
just by convention. On success it returns `prior.model_copy(...)` with `strategy_analysis` set
(validated against `StrategyAnalysisOutput`: `strategic_objectives`, `recommended_initiatives`,
`implementation_roadmap`, `kpis`, `business_impact`, `priority`, `confidence` bounded `[0, 1]`) and
`AgentName.STRATEGY` appended — `business_analysis` passes through byte-for-byte unchanged, since
Strategy only adds to the accumulated result, never rewrites what came before it.

`BusinessAnalysisOutput` moved from `business_agent.py` into `models.py` in Ticket-012D (alongside
the new `StrategyAnalysisOutput`), since it's no longer purely an implementation detail of
`BusinessAgent` — `StrategyAgent` now consumes it directly as structured input.
`AnalysisResult.business_summary`/`strategy_summary` (`str | None`) became `business_analysis`/
`strategy_analysis` (the full typed output), since nothing outside this ticket's own tests
depended on the old flattened-string shape yet.

**Model configuration**: `StrategyAgent.__init__` takes `temperature: float = 0.2` and
`max_output_tokens: int = 1500`, passed to every `client.complete()` call — overridable only via
the constructor (DI), not per-call kwargs, so `analyze()`'s signature stays identical across every
agent. This is scoped to `StrategyAgent` specifically; `BusinessAgent` still calls `complete()` with
no extra kwargs, unchanged.

**Prompt construction / injection resistance**: `prompts/strategy.md` is loaded verbatim as the
system message — no string formatting is ever applied to it, so no dynamic value (including
user-authored mission text) is ever spliced into the instructions themselves. All dynamic data —
`MissionContext`, every `DatasetContext`, and the prior `BusinessAnalysisOutput` — goes into a
*separate* user message as a single JSON payload (`{"mission": ..., "datasets": [...],
"business_analysis": ...}`, produced via `.model_dump(mode="json")`), preceded by a short static
preamble telling the model to treat everything in that JSON strictly as data, never as
instructions, regardless of its wording. `strategy.md`'s "Reasoning Rules" section reinforces this
on the instructions side. This is the concrete defense against prompt injection via a mission's
`problem_statement` or similar free-text field.

**Reasoning rules**: the prompt explicitly tells the model to treat `business_analysis` as its
primary source of business understanding and `mission`/`datasets` as supporting context only — not
to rediscover or restate what the Business Agent already established. This is prompt-level, not
enforced in code (there's no way to verify "didn't duplicate reasoning" mechanically), but paired
with the structural precondition check above.

**Retry behavior**: `StrategyAgent` contains no retry logic of any kind — one `client.complete()`
call, and any `ModelException` it raises propagates immediately. Retrying (currently just the
`AsyncOpenAI` SDK's own default `max_retries=2` for transient failures) is entirely the
`AIClient` implementation's concern.

**Token usage**: the JSON payload sent to the model contains exactly three things — mission,
dataset profiles, and the Business Agent's output — never raw dataset rows (`DatasetContext` never
carries them in the first place) and nothing sent twice.

**Reasoning-model compatibility** (`app/ai/providers/openai_client.py`): verifying this ticket's
`temperature=0.2` default live surfaced two real constraints of this environment's configured
model (`gpt-5`, a reasoning-tier model) that `OpenAIClient.complete()` now handles automatically
for *any* reasoning-family model (`o1`/`o3`/`o4`/`gpt-5` prefixes), not just for `StrategyAgent`:
- `temperature` is rejected outright (400 Bad Request) by reasoning models — dropped from the
  request rather than sent, if present.
- Without capping reasoning effort, a reasoning model can spend its entire `max_output_tokens`
  budget on internal reasoning and return an empty `output_text` (reproduced live at the ticket's
  specified `max_output_tokens=1500` before this fix). `OpenAIClient` now defaults
  `reasoning={"effort": "low"}` for reasoning models when the caller didn't already specify one,
  leaving headroom for the actual visible response. A caller that wants deeper reasoning can still
  pass its own `reasoning` kwarg to override this.

Both live entirely in `OpenAIClient` — `StrategyAgent` always just asks for `temperature=0.2` and
never knows whether the configured model actually honors it, matching the same "agent doesn't know
about the provider" separation the rest of this architecture already keeps.

**Future orchestration compatibility**: `StrategyAgent.analyze()` takes and returns plain Pydantic
models (`AnalysisRequest`/`AnalysisResult`, both fully `model_dump()`-serializable), depends only
on constructor-injected collaborators, and holds no framework-specific types or global state — it
already has the shape a LangGraph node needs (a callable over serializable state), so wiring it
into a graph later shouldn't require changing this class itself.

### Risk Agent (`app/ai/agents/risk_agent.py`)

The third pipeline stage. Same DI shape as `BusinessAgent`/`StrategyAgent` (`AIClient` +
`PromptLoader`, constructor-injected) — no model-config overrides of its own (`temperature`/
`max_output_tokens` weren't part of this ticket's spec, so `RiskAgent` doesn't add them; it calls
`client.complete()` with no extra kwargs, same as `BusinessAgent`).

It refuses to run without **both** a completed `BusinessAnalysisOutput` and `StrategyAnalysisOutput`:
if `prior` is `None`, or either field is `None`, `analyze()` raises `AIException` immediately,
before calling the model. On success it returns `prior.model_copy(...)` with `risk_analysis` set
(validated against `RiskAnalysisOutput`: `critical_risks` — a list of `RiskItem`
(`title`/`category`/`severity`/`probability`/`impact`/`mitigation`) — plus `assumptions`,
`recommended_mitigations`, `overall_risk_level`, `confidence` bounded `[0, 1]`) and `AgentName.RISK`
appended — `business_analysis` and `strategy_analysis` pass through byte-for-byte unchanged.

**Prompt versioning**: this is the first prompt file with a version — `prompts/risk_v1.md`, with a
`---\nversion: 1\nagent: risk\n---` frontmatter block, loaded via `prompt_loader.load("risk_v1")`
(no changes to `PromptLoader` itself — `{name}.md` already resolves `"risk_v1"` to the right file).
It replaces the unversioned `prompts/risk.md` placeholder from Ticket-012A, which is now deleted
rather than left alongside it as dead weight. `business.md`/`strategy.md` remain unversioned for
now — nothing requires them to adopt this convention retroactively.

**Structured input / injection resistance**: identical approach to `StrategyAgent` — a JSON payload
(`{"mission", "datasets", "business_analysis", "strategy_analysis"}`) behind the same static "this
is data, not instructions" preamble, built via the newly-shared `context_formatting
.format_structured_payload(payload: dict)` helper. This helper was extracted from
`strategy_agent.py` in this ticket (which now calls it too) once a second agent needed the exact
same wrapping logic — the payload dict differs per agent, but the preamble and JSON-fencing were
byte-for-byte duplicated before this refactor.

**How it builds on Business and Strategy without duplicating their reasoning**: enforced two ways.
Structurally, the precondition check above makes it impossible to call the model at all without
both prior outputs. At the prompt level, `risk_v1.md`'s Input section tells the model
`business_analysis`/`strategy_analysis` are "primary source of truth... not drafts to
second-guess" and `mission`/`datasets` are "supporting context only," and its Responsibilities
section explicitly says not to generate a strategy or an executive summary. Verified live: with a
mission about 30% first-month churn, a strategy proposing phased onboarding/incentive experiments,
and a dataset with 12 duplicate rows and 45 missing `monthly_spend` values, the resulting risks
referenced those exact specifics (a Data Quality risk named "Data join/label errors on day-30
churn," citing "12 duplicates"; a Financial risk about "Incentive spend exceeds incremental
margin," directly engaging with the strategy's proposed incentives) rather than generic,
context-free risk boilerplate — and none of the 12 identified risks restated the business problem
or re-proposed a strategy.

**How `OpenAIClient` compatibility stays isolated from `RiskAgent`**: this ticket touched neither
`openai_client.py` nor any Risk-specific compatibility code, and needed to touch none — the
reasoning-model handling added in Ticket-012D (dropping `temperature`, defaulting
`reasoning={"effort": "low"}`) lives entirely inside `OpenAIClient.complete()`, keyed only on the
configured model name, not on which agent is calling it. `RiskAgent` never passes `temperature` at
all (it has no such config), so only the reasoning-effort default applies to its calls — and it
applied automatically, with zero Risk-specific code, confirmed by the live round-trip succeeding
against the same `gpt-5` model on the first attempt.

### Executive Agent (`app/ai/agents/executive_agent.py`)

The fourth and final pipeline stage — the same DI shape as the other three, no model-config
overrides (not part of this ticket's brief, same reasoning as `RiskAgent`).

It refuses to run without **all three** prior outputs: `prior.business_analysis`,
`prior.strategy_analysis`, and `prior.risk_analysis` must all be non-`None`, or `analyze()` raises
`AIException` before calling the model. On success it returns `prior.model_copy(...)` with
`executive_analysis` set (validated against `ExecutiveAnalysisOutput`: `executive_summary`,
`key_findings`, `trade_offs`, `final_recommendation`, `confidence` bounded `[0, 1]`) and
`AgentName.EXECUTIVE` appended — the three prior analyses pass through unchanged, as always.

`ExecutiveAnalysisOutput` is distinct from the pre-existing `ExecutiveReport` model (from
Ticket-012A): `ExecutiveAnalysisOutput` is this agent's structured output, threaded through the
pipeline exactly like `BusinessAnalysisOutput`/`StrategyAnalysisOutput`/`RiskAnalysisOutput`.
`ExecutiveReport` remains a separate, still-unbuilt, further-polished artifact — nothing
constructs one; that's still a later capability, not this ticket.

**Prompt**: `prompts/executive_v1.md`, versioned like `risk_v1.md` (`--- version: 1 / agent:
executive ---`), replacing the unversioned `executive.md` placeholder from Ticket-012A (deleted,
not left alongside it). Same structured-JSON-payload / static-preamble approach as Strategy and
Risk, via the shared `context_formatting.format_structured_payload` — the payload here carries
five keys: `mission`, `datasets`, `business_analysis`, `strategy_analysis`, `risk_analysis`.

**Synthesis, not repetition**: enforced the same two ways as Risk's "don't rediscover" rule — the
precondition check makes it structurally impossible to run without all three prior analyses, and
`executive_v1.md`'s "Executive Reasoning Rules" section explicitly says not to regenerate the
business analysis, not to regenerate the strategy, not to perform a new risk assessment, and to
prefer synthesis over repetition. Verified live end-to-end via `AnalysisOrchestrator.run()` — the
first time the full four-agent pipeline has run as a whole, not stage-by-stage — with a churn
mission: `trade_offs` explicitly connected Strategy's proposed incentives to Risk's financial-risk
finding ("Aggressive incentives can reduce churn but risk margin erosion...") and Strategy's
timeline ambition to Risk's data-quality finding ("Speed to intervene by day 7 vs. data rigor...
depends on clean, timely labels"), rather than restating either stage's output verbatim.

`orchestrator.py` needed no changes — it already called `executive_agent.analyze(request, result)`
as the last step since Ticket-012A; this ticket only had to make that call succeed.

## AI Analysis API & Orchestration (Ticket-013)

This is the ticket that finally calls `AnalysisOrchestrator` from somewhere real. Everything
described in the "AI architecture" section above was correct and tested in isolation, but nothing
in the app triggered it — this ticket is the wiring, not new AI logic. None of `BusinessAgent`,
`StrategyAgent`, `RiskAgent`, `ExecutiveAgent`, `OpenAIClient`, `PromptLoader`, `parser.py`, or
`orchestrator.py` were touched.

**Endpoints** (`app/api/mission_analysis.py`, router prefix `/missions/{mission_id}`):
- **`POST /analyze`** — validates ownership (`mission_service.get_mission`, 404 if not owned/
  doesn't exist — same pattern as every other mission-scoped route) and that at least one dataset
  has `upload_status = ready` (409 if none). Creates or resets a `PENDING` `MissionAnalysis` row,
  schedules `run_analysis_pipeline` as a `BackgroundTask`, and returns immediately —
  **202 Accepted**, matching the async `BackgroundTasks` pattern already established by dataset
  upload/profiling (Ticket-010/011), not a new execution model.
- **`GET /analysis`** — returns the current `MissionAnalysis` row (200), or 404 if the mission
  doesn't exist/isn't owned, or if `POST /analyze` was never called for it. This wasn't explicitly
  listed in the ticket's "Create" section, but a `POST` with no way to ever observe its result
  wouldn't be a usable feature — same reasoning that produced `GET /datasets/{id}` for polling
  dataset validation status in Ticket-010.

**Context-building** (`app/services/mission_analysis_service.py`): `build_mission_context`/
`build_dataset_context` map `Mission`/`Dataset`+`DatasetProfile` ORM rows to the AI module's
`MissionContext`/`DatasetContext` Pydantic models — the same adapter role `app.ai.models`'
docstrings always described as a future ticket's job. Only datasets with `upload_status = ready`
are included (`_ready_datasets`, reused both at request time for the precondition check and again
inside the background task, so a dataset that changed state between the two can't cause a stale
read). Verified directly against real DB rows, not just implicitly through the pipeline working.

**Persistence**: `MissionAnalysisRepository.upsert_pending` resets all four analysis columns plus
`error_message`/timestamps to a clean `PENDING` state — since `mission_analyses` is 1:1 with a
mission (like `dataset_profiles` is 1:1 with a dataset), re-running analysis starts fresh rather
than mixing old and new results if a re-run only partially completes.

**Background execution** (`run_analysis_pipeline`): owns its own `SessionLocal()` session, same
reason as `run_dataset_profiling` — the request-scoped session is already closed by the time a
`BackgroundTask` runs. It's a plain `def`, not `async def`, so Starlette dispatches it to the
thread pool (again matching `run_dataset_profiling`) rather than the request event loop; since
`AnalysisOrchestrator.run()` is itself `async`, `asyncio.run()` bridges into it from inside that
thread. Status moves `pending` (set at `POST /analyze`) → `running` (set the instant the task
starts) → `completed` or `failed`. `MissionRepository` gained a `get_by_id` (unfiltered, internal-
only) for this task's use, mirroring `DatasetRepository.get_by_id` from Ticket-011 — the exact same
need (a background task can't use an owner-scoped lookup because it has no request/user).

**Error handling**: `AIException` (and any of its subclasses — `ModelException`, `ParsingException`
— raised by the agents or `OpenAIClient`) is caught inside the background task and persisted as
`status = failed` with `error_message` set to the exception's message — never re-raised, since
there's no HTTP response left to raise it into. A bare `except Exception` beneath that is a safety
net (logged via `logger.exception`, same pattern as `run_dataset_profiling`) so a bug in this
ticket's own glue code still resolves to a persisted failure instead of a `MissionAnalysis` stuck
at `running` forever. Verified directly (not just by inspection) by monkeypatching the orchestrator
factory to raise `ModelException` and confirming the row lands on `failed` with the message intact,
`started_at`/`completed_at` both set — without touching the real OpenAI configuration to do it.

**Typed response**: `MissionAnalysisResponse` (`app/schemas/mission_analysis.py`) declares
`business_analysis`/`strategy_analysis`/`risk_analysis`/`executive_analysis` as
`BusinessAnalysisOutput | None` etc. — the AI module's own types, imported directly rather than
redeclared — so the API response is typed all the way through, not typed-as-a-dict. This is the
one place `app/schemas` reaches into `app.ai.models`; the dependency runs one direction only,
`app.ai` still knows nothing about `app.schemas` or FastAPI.

**Verified live end-to-end**: registered a user, created a mission, uploaded and validated a real
CSV, called `POST /analyze` (202, `status: pending`), polled `GET /analysis` through `running` to
`completed` (~70s for all four sequential agent calls), and confirmed all four analysis fields
were persisted with the exact shapes `BusinessAnalysisOutput`/`StrategyAnalysisOutput`/
`RiskAnalysisOutput`/`ExecutiveAnalysisOutput` define. Also verified: a second user gets 404 on
both endpoints for a mission they don't own; a mission with no validated datasets gets 409;
`GET /analysis` before any `POST /analyze` gets 404.

**How this prepares MissionOS for future dashboards and reporting**: any UI that wants to show
analysis progress or results now has exactly one thing to poll — `GET /missions/{id}/analysis` —
returning a status machine (`pending`/`running`/`completed`/`failed`) plus fully typed, structured
data for each stage, not prose to re-parse. A future report-generation ticket (the still-unbuilt
`ExecutiveReport`) can read a `completed` `MissionAnalysis` row directly instead of re-running the
pipeline or re-deriving structure from free text. A future dashboard can show per-mission analysis
status across many missions with one query (`status`, indexed) without touching `app.ai` at all.

## Not implemented yet

Deliberately absent so far:

- Business logic beyond auth, mission CRUD, dataset upload/list/delete, dataset
  validation/profiling, and AI mission analysis (reports, etc.)
- The `ExecutiveReport` artifact (title/summary/recommendations derived from a completed
  `AnalysisResult`) — still just a data contract, nothing constructs one
- Embeddings, RAG, LangGraph
- A job queue — the profiling pipeline is a single in-process `BackgroundTask`; it doesn't survive
  a server restart mid-task, isn't retried on failure, and doesn't scale past one process
- Refresh tokens / token revocation / logout invalidation (logout is client-side only —
  the frontend discards the token; the JWT itself remains valid until it expires)
