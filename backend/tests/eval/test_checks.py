"""Regression tests for run_eval.py's own assertion logic.

An eval harness that always passes is worse than no eval at all -- it looks
like protection while providing none. These tests are the "red before
green" step for the harness itself: each of the three checks that guard a
bug this project has actually shipped (flat confidence, shared evidence,
one shared retrieval) is exercised against a hand-built analysis dict that
reproduces that exact bug, and must genuinely FAIL with the real (wrong)
values visible -- not just pass on a healthy pipeline by accident.

Free and fast (no live server, no API key, no network) -- these run as part
of the normal pytest suite. They test run_eval.py's `check_*` functions
directly against fabricated `MissionAnalysisResponse`-shaped dicts, not the
live pipeline itself; catching a real pipeline regression still requires an
actual run of `run_eval.py` against a live backend (see README.md).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from run_eval import (  # noqa: E402
    check_confidence_varies,
    check_evidence_varies,
    check_lowest_store_cited,
    check_no_uncomputed_metric_phrase,
    check_per_agent_chunks_distinct,
    check_strong_correlation_cited,
    check_weak_relevant_columns_cited,
)

_ALL_CHECKS = [
    check_lowest_store_cited,
    check_strong_correlation_cited,
    check_weak_relevant_columns_cited,
    check_no_uncomputed_metric_phrase,
    check_confidence_varies,
    check_evidence_varies,
    check_per_agent_chunks_distinct,
]


def _healthy_analysis() -> dict:
    """A fabricated but internally-consistent analysis where every check
    should genuinely pass -- grounds the "break it" tests below against a
    known-good baseline, so a check failing there would mean the check
    itself is broken, not that the fabricated bug worked."""
    return {
        "business_analysis": {
            "business_problem": (
                "Store 1 is the weakest performer, averaging 201.43 in weekly sales "
                "versus Store 3's 1192.40. Store correlates with Weekly_Sales at 0.97."
            ),
            "evidence_used": ["Store 1 rows show consistently low Weekly_Sales."],
            "confidence": 0.62,
        },
        "strategy_analysis": {
            "recommended_initiatives": [
                "Weak-but-relevant: Temperature and Fuel_Price both show small "
                "correlations with Weekly_Sales worth monitoring."
            ],
            "evidence_used": ["Temperature vs Weekly_Sales correlation is weak (+0.018)."],
            "confidence": 0.74,
        },
        "risk_analysis": {
            "assumptions": ["CPI's correlation with Weekly_Sales remains weak but present."],
            "evidence_used": ["CPI shows a weak relationship with Weekly_Sales."],
            "confidence": 0.55,
        },
        "executive_analysis": {
            "executive_summary": "Store 1 underperforms; macro factors are secondary.",
            "evidence_used": ["Executive synthesis of Store 1 and macro correlations."],
            "confidence": 0.68,
        },
        "retrieval_stats": {
            "per_agent_chunks": {"business": 6, "strategy": 4, "risk": 6, "executive": 11}
        },
    }


def _broken_analysis() -> dict:
    """Reproduces three real bugs this eval exists to catch, deliberately:
    a flat self-reported confidence (the pre-grounded-scoring bug), every
    agent sharing identical evidence (the pre-per-agent-retrieval bug), and
    an agent explicitly claiming a metric wasn't computed (the original
    mission-relevance bug) -- plus no mention of the store gap or any
    correlation at all, so the citation checks fail too."""
    shared_evidence = ["Generic retrieved context shared across every stage."]
    return {
        "business_analysis": {
            "business_problem": "Sales vary across stores for unclear reasons.",
            "evidence_used": shared_evidence,
            "confidence": 0.85,
        },
        "strategy_analysis": {
            "recommended_initiatives": [
                "Temperature/Fuel_Price/CPI correlation with Weekly_Sales should be "
                "computed once more data is available."
            ],
            "evidence_used": shared_evidence,
            "confidence": 0.85,
        },
        "risk_analysis": {
            "assumptions": ["Assumes macro data quality is sufficient."],
            "evidence_used": shared_evidence,
            "confidence": 0.85,
        },
        "executive_analysis": {
            "executive_summary": "Overall sales performance requires further review.",
            "evidence_used": shared_evidence,
            "confidence": 0.85,
        },
        "retrieval_stats": {
            "per_agent_chunks": {"business": 3, "strategy": 3, "risk": 3, "executive": 3}
        },
    }


def test_all_checks_pass_on_a_healthy_analysis():
    results = [check(_healthy_analysis()) for check in _ALL_CHECKS]
    failed = [r.name for r in results if not r.passed]
    assert not failed, f"expected every check to pass on a healthy analysis, but failed: {failed}"


def test_confidence_check_fails_on_flat_085_confidence():
    result = check_confidence_varies(_broken_analysis())
    assert not result.passed
    assert result.actual == str(
        {"business": 0.85, "strategy": 0.85, "risk": 0.85, "executive": 0.85}
    )


def test_evidence_check_fails_when_every_agent_shares_identical_evidence():
    result = check_evidence_varies(_broken_analysis())
    assert not result.passed


def test_per_agent_chunks_check_fails_when_every_stage_shares_one_count():
    result = check_per_agent_chunks_distinct(_broken_analysis())
    assert not result.passed
    assert result.actual == str({"business": 3, "strategy": 3, "risk": 3, "executive": 3})


def test_uncomputed_metric_phrase_check_fails_on_the_original_bugs_own_wording():
    result = check_no_uncomputed_metric_phrase(_broken_analysis())
    assert not result.passed
    assert "should be computed" in result.actual


def test_citation_checks_fail_when_nothing_is_actually_cited():
    broken = _broken_analysis()
    assert not check_lowest_store_cited(broken).passed
    assert not check_strong_correlation_cited(broken).passed
    assert not check_weak_relevant_columns_cited(broken).passed


def test_weak_relevant_columns_check_passes_when_cited_outside_evidence_used():
    # Reproduces a real live-run finding: a genuinely healthy gpt-5 analysis
    # cited "Temperature (+0.018) and CPI (+0.005) are de minimis" inside
    # executive_analysis.key_findings, not evidence_used -- prompts/
    # business.md scopes evidence_used to Retrieved Evidence excerpts only,
    # so nothing commits the model to putting a computed-insights citation
    # there specifically. An earlier version of this check only scanned
    # evidence_used and wrongly failed this healthy run; it must pass now.
    analysis = {
        "business_analysis": {
            "business_problem": "Store 1 underperforms.",
            "evidence_used": ["Store 1 rows show low Weekly_Sales."],
            "confidence": 0.7,
        },
        "strategy_analysis": {
            "recommended_initiatives": ["Turn around Store 1."],
            "confidence": 0.8,
        },
        "risk_analysis": {"assumptions": ["Data is representative."], "confidence": 0.6},
        "executive_analysis": {
            "key_findings": [
                "Macro sensitivity: Temperature (+0.018) and CPI (+0.005) are de minimis."
            ],
            "confidence": 0.75,
        },
    }

    result = check_weak_relevant_columns_cited(analysis)

    assert result.passed
    assert "Temperature" in result.actual
    assert "CPI" in result.actual
