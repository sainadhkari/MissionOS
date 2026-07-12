import uuid

from sqlalchemy.orm import Session

from app.ai.models import (
    BusinessAnalysisOutput,
    ExecutiveAnalysisOutput,
    RiskAnalysisOutput,
    StrategyAnalysisOutput,
)
from app.models.enums import AnalysisStatus
from app.models.user import User
from app.reports import charts, derive
from app.reports.exceptions import UnsupportedReportFormatError
from app.reports.html_renderer import render_html
from app.reports.models import ReportCharts, ReportData, ReportFormat, ReportMissionInfo
from app.reports.pdf_renderer import render_pdf
from app.services import mission_analysis_service, mission_service

# format -> media type. Adding DOCX/Markdown later means adding one more
# entry here, a new renderer module under app/reports/, and one more branch
# in ReportService.render() — nothing else (the API route, the report model,
# the template) needs to change.
_CONTENT_TYPES: dict[ReportFormat, str] = {
    ReportFormat.HTML: "text/html",
    ReportFormat.PDF: "application/pdf",
}


class AnalysisNotCompletedError(Exception):
    pass


class ReportService:
    """Builds and renders reports entirely from a persisted, completed
    `MissionAnalysis` — never calls the AI or re-runs `AnalysisOrchestrator`.
    `MissionAnalysis` is the single source of truth for report content.
    """

    def build_report_data(self, db: Session, *, user: User, mission_id: uuid.UUID) -> ReportData:
        mission = mission_service.get_mission(db, user=user, mission_id=mission_id)
        analysis = mission_analysis_service.get_analysis(db, user=user, mission_id=mission_id)

        if (
            analysis.status != AnalysisStatus.COMPLETED
            or analysis.business_analysis is None
            or analysis.strategy_analysis is None
            or analysis.risk_analysis is None
            or analysis.executive_analysis is None
        ):
            raise AnalysisNotCompletedError(mission_id)

        business = BusinessAnalysisOutput.model_validate(analysis.business_analysis)
        strategy = StrategyAnalysisOutput.model_validate(analysis.strategy_analysis)
        risk = RiskAnalysisOutput.model_validate(analysis.risk_analysis)
        executive = ExecutiveAnalysisOutput.model_validate(analysis.executive_analysis)

        # Same datasets the analysis itself ran against — reused, not
        # requeried with different criteria, so the report's dataset
        # section can never show a dataset the analysis didn't actually see.
        datasets = mission_analysis_service._ready_datasets(db, mission.id)
        dataset_breakdown = derive.dataset_column_breakdown(datasets)

        return ReportData(
            mission_id=mission.id,
            mission=ReportMissionInfo(
                title=mission.title,
                business_domain=mission.business_domain,
                objective=mission.objective,
                priority=mission.priority.value,
                status=mission.status.value,
            ),
            analysis_status=analysis.status.value,
            business_analysis=business,
            strategy_analysis=strategy,
            risk_analysis=risk,
            executive_analysis=executive,
            kpis=derive.build_kpis(
                business=business,
                strategy=strategy,
                risk=risk,
                executive=executive,
                mission_priority=mission.priority,
                business_domain=mission.business_domain,
                datasets=datasets,
            ),
            datasets=derive.build_dataset_summaries(datasets),
            charts=ReportCharts(
                business_breakdown=charts.horizontal_bar_chart(
                    [
                        ("Opportunities", len(business.key_opportunities)),
                        ("Metrics", len(business.important_metrics)),
                        ("Next Steps", len(business.recommended_next_steps)),
                    ]
                ),
                risk_categories=charts.pie_chart(
                    derive.risk_category_breakdown(risk.critical_risks), size=200
                ),
                dataset_summary=charts.pie_chart(
                    [(label, count) for _key, label, count in dataset_breakdown],
                    colors=[
                        charts.DATASET_CATEGORY_COLORS[key]
                        for key, _label, _count in dataset_breakdown
                    ],
                    donut=True,
                    size=200,
                ),
            ),
            top_recommendations=derive.top_recommendations(strategy),
            top_risks=derive.top_risks(risk.critical_risks),
            roadmap=derive.parse_roadmap(strategy.implementation_roadmap),
            biggest_opportunity=derive.biggest_opportunity(business),
            highest_risk_summary=derive.highest_risk_summary(risk),
        )

    def render(self, data: ReportData, report_format: ReportFormat) -> tuple[bytes, str]:
        """Returns (content_bytes, content_type). Both formats start from
        `render_html` — PDF is the HTML rendered a second time with
        `is_pdf=True` (for the paginated footer) and converted, so the two
        formats can never show different content, only different pagination.
        """
        if report_format == ReportFormat.HTML:
            html = render_html(data, is_pdf=False)
            return html.encode("utf-8"), _CONTENT_TYPES[ReportFormat.HTML]
        if report_format == ReportFormat.PDF:
            html = render_html(data, is_pdf=True)
            return render_pdf(html), _CONTENT_TYPES[ReportFormat.PDF]
        raise UnsupportedReportFormatError(report_format)
