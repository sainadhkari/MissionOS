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
from app.reports.exceptions import UnsupportedReportFormatError
from app.reports.html_renderer import render_html
from app.reports.models import ReportData, ReportFormat, ReportMissionInfo
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

        return ReportData(
            mission_id=mission.id,
            mission=ReportMissionInfo(
                title=mission.title,
                business_domain=mission.business_domain,
                objective=mission.objective,
            ),
            business_analysis=BusinessAnalysisOutput.model_validate(analysis.business_analysis),
            strategy_analysis=StrategyAnalysisOutput.model_validate(analysis.strategy_analysis),
            risk_analysis=RiskAnalysisOutput.model_validate(analysis.risk_analysis),
            executive_analysis=ExecutiveAnalysisOutput.model_validate(analysis.executive_analysis),
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
