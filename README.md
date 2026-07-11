# MissionOS

## Project structure

```
MissionOS/
  docker-compose.yml   Local infrastructure: PostgreSQL + pgAdmin
  backend/             FastAPI backend (see backend/README.md)
  frontend/            React frontend (see frontend/README.md)
```

## Infrastructure (Docker)

`docker-compose.yml` provisions the local database infrastructure:

- **postgres** (`postgres:17`) — primary database, exposed on `localhost:5432`, data persisted in the `postgres_data` volume.
- **pgadmin** (`dpage/pgadmin4`) — web UI for inspecting the database, exposed on `localhost:5050`.

Both services run on a dedicated `missionos-network` bridge network.

### Starting

```bash
docker compose up -d
```

### Stopping

```bash
docker compose down
```

### Viewing logs

```bash
docker compose logs
```

Add `-f` to any of the above to follow a specific service, e.g. `docker compose logs -f postgres`.

### pgAdmin access

1. Open http://localhost:5050
2. Log in with `admin@missionos.local` / `admin123`
3. Register a new server pointing at host `postgres`, port `5432`, database `missionos`, user `missionos`, password `missionos` (use the container/service name `postgres`, not `localhost`, since pgAdmin reaches Postgres over the `missionos-network` Docker network).

### Verifying Postgres is running

```bash
docker compose ps
docker exec missionos-postgres pg_isready -U missionos -d missionos
```
