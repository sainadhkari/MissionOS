# MissionOS

AI-powered mission analysis platform: FastAPI backend, React/Vite frontend, PostgreSQL.

## Project structure

```
MissionOS/
  docker-compose.yml        Dev infrastructure: PostgreSQL + pgAdmin (app runs on the host)
  docker-compose.prod.yml   Full production stack: PostgreSQL + backend + frontend, all containerized
  backend/                  FastAPI backend (see backend/README.md)
  frontend/                 React frontend (see frontend/README.md)
```

## Prerequisites

- Docker (with Compose v2)
- For local (non-Docker) backend/frontend development: Python 3.12+, Node.js 20+
- An OpenAI API key with access to the model configured in `OPENAI_MODEL` (AI analysis fails
  without one — everything else in the app works fine with it unset)

## Local development

This is the day-to-day workflow: Postgres runs in Docker, the backend and frontend run directly on
the host with hot reload.

```bash
# 1. Start Postgres + pgAdmin
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv && .venv/Scripts/activate     # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env        # fill in JWT_SECRET_KEY / OPENAI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for
per-service detail (schema, architecture, AI pipeline, report export, etc.).

### Dev infrastructure (`docker-compose.yml`)

- **postgres** (`postgres:17`) — exposed on `localhost:5432`, data in the `postgres_data` volume.
- **pgadmin** (`dpage/pgadmin4`) — web UI on `localhost:5050` (`admin@missionos.local` / `admin123`;
  register a server with host `postgres`, not `localhost` — pgAdmin reaches Postgres over the
  `missionos-network` Docker network, not the host's).

```bash
docker compose up -d
docker compose ps
docker exec missionos-postgres pg_isready -U missionos -d missionos
docker compose logs -f postgres   # -f to follow; drop it for a one-shot dump
docker compose down
```

## Production deployment (`docker-compose.prod.yml`)

A standalone compose file (not an override of the dev one) that containerizes everything:
**postgres** (internal-only, no host port exposed), **backend** (Dockerized FastAPI, runs
`alembic upgrade head` automatically before starting, so a container never serves traffic against an
unmigrated schema), and **frontend** (a multi-stage build — Vite compiles the production bundle,
then nginx serves the static files with SPA routing and asset caching).

### 1. Configure environment variables

Two separate files are involved:

**`backend/.env`** — read by the backend container (`env_file: ./backend/.env` in the compose file).
Copy `backend/.env.production.example` and fill in real values:

| Variable | Notes |
|---|---|
| `ENVIRONMENT` | Must be `production` — enables fail-fast config validation, JSON logs, and hides `/docs`/`/redoc`/`/openapi.json`. |
| `DEBUG` | Must be `false` in production — `Settings` refuses to start otherwise. |
| `JWT_SECRET_KEY` | At least 32 characters, not the dev default. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `OPENAI_API_KEY` | Required — AI analysis calls fail without it, and the config validator refuses to boot with it empty in production. |
| `CORS_ORIGINS` | Comma-separated list of your real frontend origin(s), e.g. `https://app.your-domain.example`. Must **not** contain `http://localhost`/`http://127.0.0.1` — the app refuses to start if it does. |
| `DATABASE_URL` | Use the Compose service name as host: `postgresql+psycopg://missionos:<password>@postgres:5432/missionos` (matching whatever you set for `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` below). |

If any of these are wrong, the backend container will exit immediately on startup with every problem
listed in one error message — check `docker compose -f docker-compose.prod.yml logs backend` for the
`Invalid production configuration:` block rather than assuming a hang or crash is unrelated.

**Root `.env`** (or pass `--env-file`) — read by Compose itself for values interpolated into
`docker-compose.prod.yml`:

```bash
POSTGRES_DB=missionos
POSTGRES_USER=missionos
POSTGRES_PASSWORD=<a real password — must match the one in backend/.env's DATABASE_URL>
VITE_API_URL=https://api.your-domain.example   # baked into the frontend bundle at build time
```

`VITE_API_URL` is a **build-time** value (Vite compiles it into the static JS bundle) — changing it
means rebuilding the frontend image, not just restarting the container.

### 2. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

### 3. Verify

```bash
docker compose -f docker-compose.prod.yml ps            # all three should show (healthy)
curl http://localhost:8000/health                        # {"status":"healthy",...}
curl http://localhost:8000/ready                          # {"status":"ready","database":"connected"}
curl -I http://localhost:8000/docs                        # 404 — API docs are hidden in production
```

### Stopping

```bash
docker compose -f docker-compose.prod.yml --env-file .env down
```

(Omit `-v` — that flag would also delete the `postgres_data` volume, which is exactly the data you
don't want to lose.)

## Database migrations

Alembic manages the schema (`backend/alembic/`). The production backend container runs
`alembic upgrade head` automatically on every startup, before `uvicorn` starts — a fresh deployment
or a redeploy after a schema change both migrate themselves with no manual step. For local/host
development, or to run a migration by hand:

```bash
cd backend
alembic upgrade head          # apply all pending migrations
alembic current                # show the currently applied revision
alembic upgrade head --sql     # preview the SQL without a live DB connection or applying it
```

## AI configuration

AI analysis (`POST /missions/{id}/analyze`) calls OpenAI's Responses API via `OPENAI_API_KEY` /
`OPENAI_MODEL` / `OPENAI_TIMEOUT` in `backend/.env`. Reasoning-tier models (the `o1`/`o3`/`o4`/`gpt-5`
families) are handled transparently by `OpenAIClient` — `temperature` is dropped and reasoning effort
is capped automatically, no configuration needed. A missing or invalid key fails the specific
analysis request (visible in `MissionAnalysis.error_message` and in the backend logs), not the
whole application — every other feature works without one configured.

## Report export

`GET /missions/{id}/analysis/report?format=pdf|html` requires the mission's analysis to already be
`completed`. No separate configuration — PDF rendering (`xhtml2pdf`) is a pure-Python dependency
already in `requirements.txt`, nothing extra to install in the Docker image.

## Backup & restore

`postgres_data` (dev) / the equivalent volume under `docker-compose.prod.yml` is the only stateful
data that matters — uploaded dataset files live in a separate volume (`backend_uploads` in
production) and should be backed up alongside the database.

**Backup:**

```bash
docker exec missionos-postgres pg_dump -U missionos -d missionos -F c -f /tmp/backup.dump
docker cp missionos-postgres:/tmp/backup.dump ./backup-$(date +%Y%m%d).dump
```

**Restore** (into a running, empty database):

```bash
docker cp ./backup-20260101.dump missionos-postgres:/tmp/backup.dump
docker exec missionos-postgres pg_restore -U missionos -d missionos --clean --if-exists /tmp/backup.dump
```

Uploaded files (production `backend_uploads` volume):

```bash
docker run --rm -v missionos_backend_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

Neither is scheduled automatically — run these manually or wire them into your own cron/scheduled-job
infrastructure.

## Troubleshooting

- **Backend container exits immediately on startup** — check
  `docker compose -f docker-compose.prod.yml logs backend` for an `Invalid production configuration:`
  block; it lists every problem with `backend/.env` at once (see the table above).
- **`/ready` returns 503** — the database is unreachable from the backend container. Check
  `docker compose -f docker-compose.prod.yml ps postgres` is `healthy`, and that `DATABASE_URL` in
  `backend/.env` uses `postgres` (the Compose service name) as the host, not `localhost`.
- **Frontend loads but every request fails / CORS error in the browser console** — `CORS_ORIGINS` in
  `backend/.env` doesn't include the origin the frontend is actually served from. It must be the
  exact scheme+host+port the browser sees (e.g. `https://app.your-domain.example`, no trailing
  slash).
  Frontend shows a "Configuration error" screen instead of the app — `VITE_API_URL` wasn't set (or
  was empty) at **build time**; rebuild the frontend image with it set, restarting alone won't help.
- **A request that should work returns a generic `{"detail": "Internal server error"}`** — this is
  intentional (Ticket-016: no stack traces ever reach the client in production). The real error and
  full traceback are in `docker compose -f docker-compose.prod.yml logs backend`, tagged with a
  `request_id` that also comes back as the response's `X-Request-ID` header — use it to find the
  matching log line.
- **AI analysis always fails** — check `OPENAI_API_KEY` is set and valid; the specific error lands in
  `GET /missions/{id}/analysis`'s `error_message` field and in the backend logs (search for
  `AI analysis failed for mission`).
