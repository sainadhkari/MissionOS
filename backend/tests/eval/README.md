# Analysis-quality eval

Every prior verification of MissionOS's analysis quality was a human (or an
agent, prompted by a human) manually generating a report and reading it
against known facts about a test dataset. That caught real bugs — a flat
~0.85 self-reported confidence, all four agents sharing one retrieval
result, a mission-relevant-but-weak correlation silently dropped — but
nothing stopped a future code change from silently reintroducing one of
them. This directory is a repeatable, on-demand replacement for that manual
check: a script and a fixture set, not CI/CD infrastructure.

## What this is not

- **Not part of the fast test suite.** `run_eval.py` doesn't match pytest's
  `test_*.py` collection pattern on purpose — it needs a live backend (real
  Postgres, a real `OPENAI_API_KEY`), makes real paid model calls, and takes
  several minutes. Running it on every commit would make the fast suite slow
  and expensive for no benefit; run it deliberately instead (see below).
- **Not wired into CI.** There is no CI pipeline in this repo yet (no
  `.github/workflows/` or equivalent) — wiring this into one is a follow-up
  once CI exists, not part of this eval itself. When that happens, budget for
  a cheaper model override (see Cost below) rather than running gpt-5-tier
  calls on every push.

## When to run it

Before a release, and after any change to:

- an agent prompt (`app/ai/prompts/*.md`)
- `dataset_insights_service.py` (computed insights / mission relevance)
- `confidence_service.py` (grounded confidence scoring)
- `orchestrator.py` or `mission_analysis_service.py` (retrieval wiring,
  pipeline sequencing)

Not on every commit.

## Prerequisites

1. The full stack running locally: Postgres (`docker-compose up -d`), the
   backend (`uvicorn app.main:app --reload`), and a real `OPENAI_API_KEY` set
   in `backend/.env` — this eval makes genuine OpenAI API calls, it does not
   use `MockAIClient`. That's deliberate: `MockAIClient` returns canned
   output and structurally cannot surface the class of bug this eval exists
   to catch (a prompt no longer citing real numbers, a scoring change that
   rewards a retrieval failure, a JSON truncation from too small a token
   budget — none of these can happen against a mock).
2. `OPENAI_TIMEOUT` set generously if `OPENAI_MODEL` is a reasoning-tier
   model (see `app/config/settings.py`'s comment on `openai_timeout`) — Risk
   alone has been observed to take ~69s.

## Running it

```bash
cd backend
python tests/eval/run_eval.py
```

Optionally point it at a non-default backend with `BASE_URL` edited at the
top of `run_eval.py` (default `http://localhost:8000`).

It registers a fresh throwaway user, creates a mission from
`fixtures.py`'s documented problem statement/objective, uploads
`fixtures/walmart_macro_drivers.csv`, waits for profiling and RAG indexing,
triggers a real analysis, waits for it to complete, then checks the result
against the assertions below and prints a pass/fail report with actual vs.
expected values for anything that failed. Exit code is `0` if every check
passed, `1` if any failed, `2` if the run itself couldn't complete (analysis
errored, timed out, or an API call failed outright).

## Cost and time

Based on real per-stage timings measured live against a reasoning-tier model
during this project's own smoke testing:

| Stage     | ~Time  |
|-----------|--------|
| Business  | ~27s   |
| Strategy  | ~48s   |
| Risk      | ~69s   |
| Executive | ~15s   |
| **Total** | **~160s**, plus embedding/indexing and normal request overhead — budget ~5 minutes per run. |

Dollar cost depends entirely on `OPENAI_MODEL` — a reasoning-tier model
(gpt-5 family) costs meaningfully more per run than `gpt-4o-mini`
(the settings default). This is a handful of API calls (4 agent calls + a
handful of embedding calls for a 360-row dataset), not a load test, so a
single run is inexpensive in absolute terms either way — but it is not free,
and it is real spend against your OpenAI account, which is the whole reason
this isn't wired into CI to run on every push.

If this ever needs to run more frequently (e.g. once CI exists), the
cheapest fix is substituting a cheaper model for eval purposes specifically
(override `OPENAI_MODEL` for the eval run only) rather than running the
production-tier model on every check.

## The fixture: `walmart_macro_drivers.csv`

A checked-in, static dataset (not generated at run time): the exact 60-row
synthetic dataset introduced in `tests/test_dataset_insights_service.py` to
reproduce the original mission-relevance production bug, tiled back-to-back
6x (360 rows) so there are enough RAG row-chunks for per-agent retrieval to
actually differ (see `fixtures.py`'s module docstring — a live run against
the untiled 60 rows found `per_agent_chunks` failing every time for exactly
this reason, before this fixture was enlarged). Tiling an exact block leaves
every mean/correlation/binary-split identical. Its ground truth (documented
precisely, with how each number was derived, in `fixtures.py`) is:

- **Known store gap**: Store 1 is the clear worst performer (mean Weekly_Sales
  ≈ 201.4 across 28 rows per tile-block), Store 3 the best (≈ 1192.4 across 15 rows per tile-block).
- **Known holiday uplift**: mean Weekly_Sales is ≈ 736.3 on holiday weeks vs.
  ≈ 557.7 otherwise (+178.6).
- **Known strong correlation**: Store correlates with Weekly_Sales at 0.970
  by magnitude — the strongest relationship in the dataset, always surfaced
  regardless of mission wording.
- **Known weak-but-relevant correlations**: Temperature (0.018), Fuel_Price
  (0.087), and CPI (0.005) all correlate weakly with Weekly_Sales — too
  weakly to survive a magnitude-only cutoff, but directly named in the
  mission's problem statement, so the mission-relevance fix guarantees they
  still get surfaced and flagged (see `dataset_insights_service.py`'s
  `_is_mission_relevant`/`_prioritize_relevant`).

The mission text in `fixtures.py` deliberately names "store", "weekly
sales", "temperature", "fuel price", "CPI", and "unemployment" — the exact
wording controls which columns win the group/metric-column priority slot
(see `fixtures.py`'s module docstring for why word choice here isn't
arbitrary).

## The checks

Each check in `run_eval.py`'s `CHECKS` list targets one specific regression
this project has actually shipped and fixed before, not a vague "does this
look reasonable":

| Check | Regression it catches |
|---|---|
| Lowest-performing store cited | A group-comparison insight computed but never reaching the model's context or being ignored |
| Strong correlation cited | Baseline sanity — magnitude-based correlations still surfaced at all |
| Weak-but-relevant column cited | The mission-relevance fix regressing — a weak but mission-named column silently dropped again |
| No "not computed" phrase | The original production bug this eval is named after — an agent saying a mission-relevant metric couldn't be computed when it actually was |
| Confidence varies across agents | The flat ~0.85 self-reported confidence bug `confidence_service.py` replaced |
| Evidence varies across agents | All four agents silently sharing one shared evidence set instead of their own retrieval |
| `per_agent_chunks` has ≥2 distinct values | The per-agent retrieval fix in `orchestrator.py` regressing back to one shared retrieval call |

A failure prints the check's name, what was expected, and what was actually
found (the real agent text, the real confidence values, the real
`per_agent_chunks` dict) — enough to diagnose without having been in the
room when the bug it's checking for was first found.
