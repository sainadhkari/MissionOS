"""Repeatable analysis-quality eval.

Drives a real mission analysis end-to-end through the actual running API
(real Postgres, real OpenAI calls, real RAG indexing) against the
`walmart_macro_drivers` fixture (see fixtures.py for its hand-verified
ground truth), then checks the result against concrete, automatable
assertions -- each one written to catch a specific regression this project
has actually shipped before:

  - a flat ~0.85 self-reported confidence across every agent
    (confidence_service.py's grounded-scoring fix)
  - all four agents sharing one retrieval result instead of their own
    per-stage query (orchestrator.py's per-agent retrieval fix)
  - a mission-relevant-but-weak correlation silently dropped instead of
    cited (dataset_insights_service.py's mission-relevance fix)

This is deliberately NOT a pytest module: it needs a live backend (real DB,
real OPENAI_API_KEY) already running, makes real paid API calls, and takes
minutes -- none of which belong in the fast, free, offline suite under
tests/. Run it directly once the stack is up:

    python tests/eval/run_eval.py

See README.md for cost, prerequisites, and how to read a failure.
"""

import dataclasses
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).parent))
import fixtures  # noqa: E402

BASE_URL = "http://localhost:8000"
# Real per-stage timings measured live (see README.md): Business ~27s,
# Strategy ~48s, Risk ~69s, Executive ~15s -- ~160s of model time alone, plus
# RAG indexing/retrieval and normal request overhead. Generous multiples,
# not the raw measured time, so a run isn't flagged as "failed" for being
# merely slower than the one time it was measured.
DATASET_READY_TIMEOUT_SECONDS = 120
ANALYSIS_TIMEOUT_SECONDS = 600
POLL_INTERVAL_SECONDS = 5


@dataclasses.dataclass
class Check:
    name: str
    passed: bool
    expected: str
    actual: str
    detail: str = ""


class EvalError(Exception):
    """Something about driving the pipeline itself failed (not an assertion
    failure) -- e.g. the analysis errored out, or timed out waiting."""


def _random_credentials() -> tuple[str, str, str]:
    token = uuid.uuid4().hex[:12]
    return f"eval-{token}@example.com", f"Eval-{token}-Pw1", f"Eval Bot {token}"


def register_and_login(client: httpx.Client) -> str:
    email, password, full_name = _random_credentials()
    register = client.post(
        "/auth/register",
        json={"full_name": full_name, "email": email, "password": password},
    )
    register.raise_for_status()

    login = client.post("/auth/login", data={"username": email, "password": password})
    login.raise_for_status()
    return login.json()["access_token"]


def create_mission(client: httpx.Client, headers: dict[str, str]) -> str:
    response = client.post(
        "/missions",
        headers=headers,
        json={
            "title": fixtures.MISSION_TITLE,
            "business_domain": fixtures.MISSION_BUSINESS_DOMAIN,
            "priority": fixtures.MISSION_PRIORITY,
            "problem_statement": fixtures.MISSION_PROBLEM_STATEMENT,
            "objective": fixtures.MISSION_OBJECTIVE,
            "expected_output": fixtures.MISSION_EXPECTED_OUTPUT,
        },
    )
    response.raise_for_status()
    return response.json()["id"]


def upload_dataset(client: httpx.Client, headers: dict[str, str], mission_id: str) -> str:
    with fixtures.FIXTURE_CSV_PATH.open("rb") as csv_file:
        response = client.post(
            f"/missions/{mission_id}/datasets",
            headers=headers,
            files={"file": (fixtures.FIXTURE_CSV_PATH.name, csv_file, "text/csv")},
        )
    response.raise_for_status()
    return response.json()["id"]


def wait_for_dataset_ready(
    client: httpx.Client, headers: dict[str, str], dataset_id: str
) -> dict[str, Any]:
    """Polls until profiling AND RAG indexing both finish -- both run
    sequentially in the same upload background task (see
    dataset_profiling_pipeline.run_dataset_profiling), so waiting for
    `index.status` to leave PENDING/INDEXING covers profiling too."""
    deadline = time.monotonic() + DATASET_READY_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        response = client.get(f"/datasets/{dataset_id}", headers=headers)
        response.raise_for_status()
        dataset = response.json()
        if dataset["upload_status"] == "failed":
            errors = (dataset.get("profile") or {}).get("validation_errors")
            raise EvalError(f"Dataset validation failed: {errors}")
        index = dataset.get("index")
        if dataset["upload_status"] == "ready" and index and index["status"] in (
            "indexed",
            "failed",
        ):
            return dataset
        time.sleep(POLL_INTERVAL_SECONDS)
    raise EvalError(
        f"Dataset {dataset_id} did not finish profiling/indexing within "
        f"{DATASET_READY_TIMEOUT_SECONDS}s."
    )


def run_analysis(client: httpx.Client, headers: dict[str, str], mission_id: str) -> dict[str, Any]:
    start = client.post(f"/missions/{mission_id}/analyze", headers=headers)
    start.raise_for_status()

    deadline = time.monotonic() + ANALYSIS_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        response = client.get(f"/missions/{mission_id}/analysis", headers=headers)
        response.raise_for_status()
        analysis = response.json()
        if analysis["status"] == "completed":
            return analysis
        if analysis["status"] == "failed":
            raise EvalError(f"Analysis failed: {analysis.get('error_message')}")
        time.sleep(POLL_INTERVAL_SECONDS)
    raise EvalError(f"Analysis did not complete within {ANALYSIS_TIMEOUT_SECONDS}s.")


# --- Assertions --------------------------------------------------------------
# Each takes the full MissionAnalysisResponse JSON and returns one Check.
# Every check reads defensively (`.get(...)`, `or {}` / `or []`) since a
# structural regression (a field silently dropped) should surface as a
# failed Check with a clear message, not a crash that hides which
# assertion never got to run.


def _agent_output(analysis: dict[str, Any], stage: str) -> dict[str, Any]:
    return analysis.get(f"{stage}_analysis") or {}


def _agent_text_items(analysis: dict[str, Any]) -> list[str]:
    """Every individual string value the four agents produced, kept as
    separate items (not concatenated) -- so a check that needs two things to
    co-occur (e.g. a column name *and* a number) can require them to appear
    in the same sentence/field, not merely somewhere in the same document,
    which a full-document join would allow to match by pure coincidence."""
    items: list[str] = []
    for stage in ("business", "strategy", "risk", "executive"):
        output = _agent_output(analysis, stage)
        for value in output.values():
            if isinstance(value, str):
                items.append(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, str):
                        items.append(item)
                    elif isinstance(item, dict):
                        items.extend(v for v in item.values() if isinstance(v, str))
    return items


def _all_agent_text(analysis: dict[str, Any]) -> str:
    """Every string the four agents produced, concatenated and lowercased,
    for simple substring/regex scanning -- deliberately not per-field, since
    these checks care whether a fact was cited *anywhere*, not which exact
    field it landed in (a reasonable prompt tweak could move it)."""
    return " ".join(_agent_text_items(analysis)).lower()


def check_lowest_store_cited(analysis: dict[str, Any]) -> Check:
    business = _agent_output(analysis, "business")
    text = " ".join(
        [business.get("business_problem", ""), *business.get("evidence_used", [])]
    ).lower()
    store_named = bool(re.search(r"store\D{0,4}1\b", text))
    mean_cited = bool(re.search(r"\b201\.?4?3?\b", text))
    passed = store_named or mean_cited
    return Check(
        name="lowest-performing store (Store 1) cited in Business output",
        passed=passed,
        expected=f"'Store {fixtures.LOWEST_PERFORMING_STORE}' or its mean "
        f"({fixtures.LOWEST_PERFORMING_STORE_MEAN_WEEKLY_SALES}) mentioned in "
        "business_problem/evidence_used",
        actual=business.get("business_problem", "(missing)"),
    )


def check_strong_correlation_cited(analysis: dict[str, Any]) -> Check:
    text = _all_agent_text(analysis)
    passed = "0.97" in text or bool(re.search(r"\bstore\b.{0,40}\bsales\b", text))
    return Check(
        name="strong Store/Weekly_Sales correlation (0.970) cited somewhere",
        passed=passed,
        expected="'0.97' or a Store-vs-sales relationship mentioned in some agent's output",
        actual="(not found in any agent output)" if not passed else "found",
    )


_DECIMAL_PATTERN = re.compile(r"[-+]?0\.\d{2,3}")


def check_weak_relevant_columns_cited(analysis: dict[str, Any]) -> Check:
    """The core regression this eval exists to catch: a mission-relevant
    but weak correlation (Temperature/Fuel_Price/CPI vs Weekly_Sales) getting
    silently dropped instead of surfaced -- see fixtures.
    WEAK_RELEVANT_CORRELATIONS and the mission-relevance fix in
    dataset_insights_service.py.

    Deliberately narrower than a bare column-name substring match: a
    fabricated regression test (test_checks.py) caught that a bare-name
    check gives a false PASS on exactly the bug this exists to catch --
    "Temperature's correlation should be computed" still contains the word
    "Temperature". Requires the column name AND a correlation-shaped decimal
    (e.g. "+0.018") to co-occur in the *same field/sentence* -- a live run
    against gpt-5 then caught a second, opposite mistake in an earlier
    version of this check: it only scanned `evidence_used`, on the
    assumption that's where a genuine citation would land. But
    `prompts/business.md` scopes `evidence_used` explicitly to *Retrieved
    Evidence* excerpts, not `computed_insights` figures -- nothing commits
    the model to putting a computed-insights citation there specifically,
    and a real, healthy run cited these same weak correlations correctly
    inside `important_metrics`/`key_findings` instead, which the
    evidence_used-only version wrongly failed. Scans every field now, not
    just evidence_used, so this doesn't depend on which field the model
    happens to choose.
    """
    matched_columns: set[str] = set()
    for item in _agent_text_items(analysis):
        if not _DECIMAL_PATTERN.search(item):
            continue
        item_lower = item.lower()
        for column in fixtures.WEAK_RELEVANT_CORRELATIONS:
            if column.lower() in item_lower or column.lower().replace("_", " ") in item_lower:
                matched_columns.add(column)
    passed = len(matched_columns) > 0
    return Check(
        name="at least one weak-but-mission-relevant column "
        "(Temperature/Fuel_Price/CPI) cited with its actual figure",
        passed=passed,
        expected=(
            f"at least one of {list(fixtures.WEAK_RELEVANT_CORRELATIONS)} named "
            "alongside a correlation figure somewhere in some agent's output"
        ),
        actual=str(sorted(matched_columns)) if matched_columns else "(none cited with a figure)",
    )


def check_no_uncomputed_metric_phrase(analysis: dict[str, Any]) -> Check:
    text = _all_agent_text(analysis)
    hits = [phrase for phrase in fixtures.UNCOMPUTED_METRIC_PHRASES if phrase in text]
    return Check(
        name="no agent claims a mission-relevant metric wasn't computed",
        passed=not hits,
        expected="none of the 'not computed' phrases present in any agent output",
        actual=f"found: {hits}" if hits else "none found",
    )


def check_confidence_varies(analysis: dict[str, Any]) -> Check:
    confidences = {
        stage: _agent_output(analysis, stage).get("confidence")
        for stage in ("business", "strategy", "risk", "executive")
    }
    distinct = {v for v in confidences.values() if v is not None}
    passed = len(distinct) > 1
    return Check(
        name="confidence differs across agents (not a flat ~0.85)",
        passed=passed,
        expected="more than 1 distinct confidence value across the 4 agents",
        actual=str(confidences),
    )


def check_evidence_varies(analysis: dict[str, Any]) -> Check:
    evidence = {
        stage: tuple(sorted(_agent_output(analysis, stage).get("evidence_used") or []))
        for stage in ("business", "strategy", "risk", "executive")
    }
    distinct = set(evidence.values())
    passed = len(distinct) > 1
    return Check(
        name="evidence_used differs across agents (not identical/shared evidence)",
        passed=passed,
        expected="more than 1 distinct evidence_used set across the 4 agents",
        actual=str({stage: list(v) for stage, v in evidence.items()}),
    )


def check_per_agent_chunks_distinct(analysis: dict[str, Any]) -> Check:
    retrieval_stats = analysis.get("retrieval_stats")
    if not retrieval_stats:
        return Check(
            name="per_agent_chunks has at least 2 distinct values",
            passed=False,
            expected="retrieval_stats present with per_agent_chunks",
            actual="retrieval_stats is null (retrieval failed or never ran)",
        )
    per_agent = retrieval_stats.get("per_agent_chunks") or {}
    distinct_values = set(per_agent.values())
    passed = len(distinct_values) >= 2
    return Check(
        name="per_agent_chunks has at least 2 distinct values (not one shared retrieval)",
        passed=passed,
        expected=">=2 distinct chunk counts across agents",
        actual=str(per_agent),
    )


CHECKS = [
    check_lowest_store_cited,
    check_strong_correlation_cited,
    check_weak_relevant_columns_cited,
    check_no_uncomputed_metric_phrase,
    check_confidence_varies,
    check_evidence_varies,
    check_per_agent_chunks_distinct,
]


def _print_report(checks: list[Check]) -> bool:
    print("\n" + "=" * 78)
    print("EVAL REPORT")
    print("=" * 78)
    all_passed = True
    for check in checks:
        status = "PASS" if check.passed else "FAIL"
        print(f"[{status}] {check.name}")
        if not check.passed:
            all_passed = False
            print(f"       expected: {check.expected}")
            print(f"       actual:   {check.actual}")
            if check.detail:
                print(f"       detail:   {check.detail}")
    print("=" * 78)
    passed_count = sum(1 for c in checks if c.passed)
    print(f"{passed_count}/{len(checks)} checks passed")
    print("=" * 78 + "\n")
    return all_passed


def main() -> int:
    print(f"Running eval against {BASE_URL} using {fixtures.FIXTURE_CSV_PATH.name}...")
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        token = register_and_login(client)
        headers = {"Authorization": f"Bearer {token}"}

        mission_id = create_mission(client, headers)
        print(f"Created mission {mission_id}")

        dataset_id = upload_dataset(client, headers, mission_id)
        print(f"Uploaded dataset {dataset_id}, waiting for profiling + RAG indexing...")
        wait_for_dataset_ready(client, headers, dataset_id)

        print("Dataset ready. Running real mission analysis (real model calls, costs money)...")
        analysis = run_analysis(client, headers, mission_id)
        print("Analysis completed.")

    checks = [check(analysis) for check in CHECKS]
    all_passed = _print_report(checks)
    return 0 if all_passed else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except EvalError as exc:
        print(f"\nEVAL ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)
    except httpx.HTTPStatusError as exc:
        print(
            f"\nEVAL ABORTED: {exc.request.method} {exc.request.url} -> "
            f"{exc.response.status_code}: {exc.response.text}",
            file=sys.stderr,
        )
        sys.exit(2)
