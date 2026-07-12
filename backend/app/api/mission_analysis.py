import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.mission_analysis import MissionAnalysis
from app.models.user import User
from app.reports.exceptions import ReportGenerationError
from app.reports.models import ReportFormat
from app.schemas.mission_analysis import MissionAnalysisResponse
from app.services import mission_analysis_service, mission_service, report_service

logger = logging.getLogger("missionos.reports")

router = APIRouter(prefix="/missions/{mission_id}", tags=["analysis"])


@router.post(
    "/analyze", response_model=MissionAnalysisResponse, status_code=status.HTTP_202_ACCEPTED
)
def start_analysis(
    mission_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MissionAnalysis:
    try:
        analysis = mission_analysis_service.start_analysis(
            db, user=current_user, mission_id=mission_id
        )
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc
    except mission_analysis_service.NoValidatedDatasetsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mission has no successfully validated datasets",
        ) from exc

    background_tasks.add_task(mission_analysis_service.run_analysis_pipeline, mission_id)
    return analysis


@router.get("/analysis", response_model=MissionAnalysisResponse)
def get_analysis(
    mission_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MissionAnalysis:
    try:
        return mission_analysis_service.get_analysis(db, user=current_user, mission_id=mission_id)
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc
    except mission_analysis_service.AnalysisNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No analysis found for this mission"
        ) from exc


@router.get("/analysis/report")
def export_report(
    mission_id: uuid.UUID,
    report_format: ReportFormat = Query(..., alias="format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    service = report_service.ReportService()
    try:
        data = service.build_report_data(db, user=current_user, mission_id=mission_id)
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc
    except mission_analysis_service.AnalysisNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No analysis found for this mission"
        ) from exc
    except report_service.AnalysisNotCompletedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Analysis has not completed yet — a report can only be generated from a "
            "completed analysis",
        ) from exc

    try:
        content, media_type = service.render(data, report_format)
    except ReportGenerationError as exc:
        # Not `.exception()` in the sense of "unexpected" — `render_pdf`
        # already logged the real underlying cause (xhtml2pdf's own error
        # detail, or a full traceback if xhtml2pdf raised outright) at the
        # point of failure. This log line exists so the *request* that
        # failed (mission/format) is correlated with that cause in one
        # place, without re-dumping the same traceback twice.
        logger.error(
            "Report export failed for mission %s (format=%s): %s",
            mission_id,
            report_format.value,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not generate the {report_format.value} report: {exc}",
        ) from exc

    filename = f"mission-{mission_id}-report.{report_format.value}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
