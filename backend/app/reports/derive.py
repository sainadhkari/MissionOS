"""Pure presentation-layer derivations for the exported report: KPI labels,
top-5 slicing, dataset quality scoring, roadmap phase formatting.

Everything here reads already-computed fields off a completed
`MissionAnalysis` and its datasets' `DatasetProfile`s — nothing here calls
the AI, re-parses model output, or invents a number the analysis didn't
already produce. This intentionally mirrors what
`frontend/src/utils/executiveDashboard.ts` computes for the Executive
Dashboard (Ticket-017): same source data, same kind of derivation, applied
independently on the server for the export path so neither the frontend
nor the backend has to reach into the other to build its own view.
"""

import re

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    RiskItem,
    StrategyAnalysisOutput,
)
from app.models.dataset import Dataset
from app.models.enums import MissionPriority
from app.reports.models import ReportDatasetSummary, ReportKpi, ReportRoadmapPhase

_TOP_N = 5


def confidence_label(value: float) -> str:
    if value >= 0.8:
        return "High"
    if value >= 0.5:
        return "Moderate"
    return "Low"


def confidence_variant(value: float) -> str:
    if value >= 0.8:
        return "success"
    if value >= 0.5:
        return "warning"
    return "danger"


def severity_rank(value: str) -> int:
    normalized = value.strip().lower()
    if "critical" in normalized:
        return 4
    if "high" in normalized:
        return 3
    if "medium" in normalized or "moderate" in normalized:
        return 2
    if "low" in normalized:
        return 1
    return 0


def severity_variant(value: str) -> str:
    normalized = value.strip().lower()
    if "critical" in normalized:
        return "danger"
    if "high" in normalized:
        return "warning"
    if "medium" in normalized or "moderate" in normalized:
        return "info"
    if "low" in normalized:
        return "neutral"
    return "neutral"


def average_confidence(
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
) -> float:
    values = [business.confidence, strategy.confidence, risk.confidence, executive.confidence]
    return sum(values) / len(values)


def top_risks(risks: list[RiskItem], limit: int = _TOP_N) -> list[RiskItem]:
    return sorted(risks, key=lambda risk: severity_rank(risk.severity), reverse=True)[:limit]


def top_recommendations(strategy: StrategyAnalysisOutput, limit: int = _TOP_N) -> list[str]:
    return strategy.recommended_initiatives[:limit]


_PHASE_PREFIX_RE = re.compile(r"^\s*phase\s+(\d+)\s*[:\-—]?\s*(.*)$", re.IGNORECASE)


def parse_roadmap(items: list[str]) -> list[ReportRoadmapPhase]:
    """Turns `implementation_roadmap` strings into labeled phase cards. If
    an item already starts with "Phase N: ..." (the strategy prompt
    encourages this), that number and the remaining text are reused as-is;
    otherwise it's numbered by its position in the list. Text formatting
    only -- the roadmap's content and order are never changed."""
    phases = []
    for index, item in enumerate(items):
        match = _PHASE_PREFIX_RE.match(item)
        if match and match.group(2):
            phases.append(
                ReportRoadmapPhase(label=f"Phase {match.group(1)}", description=match.group(2))
            )
        else:
            phases.append(ReportRoadmapPhase(label=f"Phase {index + 1}", description=item))
    return phases


def _dataset_quality(datasets: list[Dataset]) -> tuple[int, str, str]:
    """Same completeness-minus-duplicate-rate scoring
    `computeDatasetQuality` uses on the frontend, applied here to the same
    `DatasetProfile` fields."""
    profiled = [d for d in datasets if d.profile is not None]
    if not profiled:
        return 0, "Unknown", "neutral"

    total_cells = missing_cells = total_rows = duplicate_rows = 0
    for dataset in profiled:
        profile = dataset.profile
        total_cells += profile.row_count * profile.column_count
        missing_cells += sum(profile.missing_values.values())
        total_rows += profile.row_count
        duplicate_rows += profile.duplicate_row_count

    completeness = 1.0 if total_cells == 0 else 1 - missing_cells / total_cells
    duplicate_rate = 0.0 if total_rows == 0 else duplicate_rows / total_rows
    score = max(0.0, min(1.0, completeness - duplicate_rate * 0.5))
    percent = round(score * 100)

    if percent >= 90:
        return percent, "Excellent", "success"
    if percent >= 75:
        return percent, "Good", "info"
    if percent >= 50:
        return percent, "Fair", "warning"
    return percent, "Poor", "danger"


_VALIDATION_LABELS: dict[str, tuple[str, str]] = {
    "ready": ("Validated", "success"),
    "validating": ("Validating", "warning"),
    "uploaded": ("Uploaded", "neutral"),
    "failed": ("Validation Failed", "danger"),
}


def build_dataset_summaries(datasets: list[Dataset]) -> list[ReportDatasetSummary]:
    summaries = []
    for dataset in datasets:
        label, variant = _VALIDATION_LABELS.get(dataset.upload_status.value, ("Unknown", "neutral"))
        profile = dataset.profile
        if profile is None:
            summaries.append(
                ReportDatasetSummary(
                    filename=dataset.original_filename,
                    row_count=0,
                    column_count=0,
                    missing_value_count=0,
                    duplicate_row_count=0,
                    validation_status_label=label,
                    validation_status_variant=variant,
                    numeric_column_count=0,
                    categorical_column_count=0,
                    date_column_count=0,
                    quality_percent=0,
                    quality_label="Unknown",
                    quality_variant="neutral",
                )
            )
            continue

        quality_percent, quality_label, quality_variant = _dataset_quality([dataset])
        summaries.append(
            ReportDatasetSummary(
                filename=dataset.original_filename,
                row_count=profile.row_count,
                column_count=profile.column_count,
                missing_value_count=sum(profile.missing_values.values()),
                duplicate_row_count=profile.duplicate_row_count,
                validation_status_label=label,
                validation_status_variant=variant,
                numeric_column_count=sum(
                    1 for c in profile.columns if c.get("category") == "numeric"
                ),
                categorical_column_count=sum(
                    1 for c in profile.columns if c.get("category") == "categorical"
                ),
                date_column_count=sum(1 for c in profile.columns if c.get("category") == "date"),
                quality_percent=quality_percent,
                quality_label=quality_label,
                quality_variant=quality_variant,
            )
        )
    return summaries


def dataset_column_breakdown(datasets: list[Dataset]) -> list[tuple[str, str, int]]:
    """Aggregate numeric/categorical/date column counts across every
    dataset used in the analysis -- the same aggregation
    `DatasetSummaryChart` performs on the frontend. Returns
    (category_key, label, count) triples, filtered to non-zero counts, in a
    fixed category order -- the key is kept alongside the label so the
    caller can look up each slice's color by category rather than by list
    position (which shifts whenever a category is empty and dropped)."""
    counts = {"numeric": 0, "categorical": 0, "date": 0}
    for dataset in datasets:
        if dataset.profile is None:
            continue
        for column in dataset.profile.columns:
            category = column.get("category")
            if category in counts:
                counts[category] += 1
    labels = {"numeric": "Numeric", "categorical": "Categorical", "date": "Date"}
    return [(key, labels[key], value) for key, value in counts.items() if value > 0]


def risk_category_breakdown(risks: list[RiskItem]) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for risk in risks:
        counts[risk.category] = counts.get(risk.category, 0) + 1
    return list(counts.items())


_PRIORITY_VARIANTS: dict[MissionPriority, str] = {
    MissionPriority.LOW: "neutral",
    MissionPriority.MEDIUM: "info",
    MissionPriority.HIGH: "warning",
    MissionPriority.CRITICAL: "danger",
}


def build_kpis(
    *,
    business: BusinessAnalysisOutput,
    strategy: StrategyAnalysisOutput,
    risk: RiskAnalysisOutput,
    executive: ExecutiveAnalysisOutput,
    mission_priority: MissionPriority,
    business_domain: str,
    datasets: list[Dataset],
) -> list[ReportKpi]:
    ai_confidence = average_confidence(business, strategy, risk, executive)
    quality_percent, quality_label, quality_variant = _dataset_quality(datasets)
    priority_label = mission_priority.value.capitalize()

    return [
        ReportKpi(
            label="Business Health",
            value=f"{round(business.confidence * 100)}%",
            badge_label=confidence_label(business.confidence),
            variant=confidence_variant(business.confidence),
            caption="Business analysis confidence",
        ),
        ReportKpi(
            label="AI Confidence",
            value=f"{round(ai_confidence * 100)}%",
            badge_label=confidence_label(ai_confidence),
            variant=confidence_variant(ai_confidence),
            caption="Average across all four analyses",
        ),
        ReportKpi(
            label="Overall Risk Level",
            value=risk.overall_risk_level.capitalize(),
            badge_label=f"{len(risk.critical_risks)} risks",
            variant=severity_variant(risk.overall_risk_level),
            caption="Overall assessed risk",
        ),
        ReportKpi(
            label="Dataset Quality",
            value=f"{quality_percent}%",
            badge_label=quality_label,
            variant=quality_variant,
            caption=f"{len(datasets)} dataset(s) validated",
        ),
        ReportKpi(
            label="Mission Priority",
            value=priority_label,
            badge_label=priority_label,
            variant=_PRIORITY_VARIANTS.get(mission_priority, "neutral"),
            caption="Assigned mission priority",
        ),
        ReportKpi(
            label="Business Domain",
            value=business_domain,
            badge_label=business_domain,
            variant="primary",
            caption="Mission's business domain",
        ),
    ]


def biggest_opportunity(business: BusinessAnalysisOutput) -> str:
    return business.key_opportunities[0] if business.key_opportunities else "Not identified."


def highest_risk_summary(risk: RiskAnalysisOutput) -> str:
    top = top_risks(risk.critical_risks, limit=1)
    if not top:
        return "No critical risks identified."
    item = top[0]
    return f"{item.title} ({item.severity} severity)"
