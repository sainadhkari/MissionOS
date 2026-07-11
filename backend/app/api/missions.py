import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.mission import Mission
from app.models.user import User
from app.schemas.mission import MissionCreateRequest, MissionResponse, MissionUpdateRequest
from app.services import mission_service

router = APIRouter(prefix="/missions", tags=["missions"])


@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Mission:
    return mission_service.create_mission(db, user=current_user, **payload.model_dump())


@router.get("", response_model=list[MissionResponse])
def list_missions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Mission]:
    return mission_service.list_missions(db, user=current_user)


@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(
    mission_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Mission:
    try:
        return mission_service.get_mission(db, user=current_user, mission_id=mission_id)
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc


@router.put("/{mission_id}", response_model=MissionResponse)
def update_mission(
    mission_id: uuid.UUID,
    payload: MissionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Mission:
    try:
        return mission_service.update_mission(
            db, user=current_user, mission_id=mission_id, **payload.model_dump()
        )
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(
    mission_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        mission_service.delete_mission(db, user=current_user, mission_id=mission_id)
    except mission_service.MissionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        ) from exc
