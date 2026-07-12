# MissionOS Frontend

React 19 + TypeScript + Vite + Tailwind CSS frontend for MissionOS — an enterprise
AI decision-intelligence platform. Renders the public landing page and the
authenticated app shell (mission management, dataset library, the four-agent
AI analysis pipeline's results, explainability, scenario simulation, and
executive reporting). See the [root README](../README.md) for full-stack setup
(backend, database, Docker) and the [backend README](../backend/README.md) for
API/AI/RAG details.

## Structure

```
frontend/
  src/
    pages/          Route-level components (Landing, Login, Dashboard,
                     MissionDetails, ExecutiveDashboard, ExecutiveReport,
                     AICollaborationCenter, ScenarioSimulator, DataLibrary, ...)
    components/      Shared/reusable UI (Button, Card, Sidebar, Navbar, Charts,
                     and one subfolder per landing-page section)
    layouts/         DashboardLayout (fixed sidebar + navbar, scrollable content)
                     and AuthLayout (login/register split panel)
    hooks/           Data-fetching and polling hooks (useMissions, useAnalysisPolling, ...)
    services/        Axios-based API clients, one per backend resource
    contexts/        React context providers (auth, toast notifications)
    types/           Shared TypeScript interfaces, one file per domain concept
    utils/           Pure helper functions (formatting, chart data derivation, ...)
    constants/       Route paths and other app-wide constants
    config.ts        Reads VITE_API_URL and validates it's set before the app renders
  public/            Static assets, incl. landing-page screenshots
```

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # edit VITE_API_URL if your backend isn't on localhost:8000
```

## Run

```bash
npm run dev       # dev server with HMR, http://localhost:5173
npm run build     # type-checks (tsc -b) then production build to dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

The backend must be running (see the [root README](../README.md)) and its
`CORS_ORIGINS` must include this dev server's origin (`http://localhost:5173`
by default) for API calls to succeed.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API. `main.tsx` checks this is set before rendering the app — a missing value shows a clear "Configuration error" screen instead of every API call silently failing. |

## Deployment

`Dockerfile` builds a multi-stage image (Node build → nginx serve) with
`VITE_API_URL` baked in as a build argument, since Vite env vars are resolved
at build time, not runtime. See `docker-compose.prod.yml` at the repo root.
