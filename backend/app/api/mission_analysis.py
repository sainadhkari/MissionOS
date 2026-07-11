import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.mission_analysis import MissionAnalysis
from app.models.user import User
from app.schemas.mission_analysis import MissionAnalysisResponse
from app.services import mission_analysis_service, mission_service

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
