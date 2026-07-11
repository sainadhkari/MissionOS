import uuid

from sqlalchemy.orm import Session

from app.models.enums import MissionPriority, MissionStatus
from app.models.mission import Mission
from app.models.user import User
from app.repositories.mission_repository import MissionRepository


class MissionNotFoundError(Exception):
    pass


def list_missions(db: Session, *, user: User) -> list[Mission]:
    return MissionRepository(db).list_for_user(user.id)


def get_mission(db: Session, *, user: User, mission_id: uuid.UUID) -> Mission:
    mission = MissionRepository(db).get_for_user(mission_id, user.id)
    if mission is None:
        raise MissionNotFoundError(mission_id)
    return mission


def create_mission(
    db: Session,
    *,
    user: User,
    title: str,
    business_domain: str,
    priority: MissionPriority,
    problem_statement: str,
    objective: str,
    expected_output: str,
) -> Mission:
    mission = MissionRepository(db).create(
        user_id=user.id,
        title=title,
        business_domain=business_domain,
        priority=priority,
        problem_statement=problem_statement,
        objective=objective,
        expected_output=expected_output,
    )
    db.commit()
    db.refresh(mission)
    return mission


def update_mission(
    db: Session,
    *,
    user: User,
    mission_id: uuid.UUID,
    title: str,
    business_domain: str,
    priority: MissionPriority,
    problem_statement: str,
    objective: str,
    expected_output: str,
    status: MissionStatus,
) -> Mission:
    repo = MissionRepository(db)
    mission = repo.get_for_user(mission_id, user.id)
    if mission is None:
        raise MissionNotFoundError(mission_id)

    repo.update(
        mission,
        title=title,
        business_domain=business_domain,
        priority=priority,
        problem_statement=problem_statement,
        objective=objective,
        expected_output=expected_output,
        status=status,
    )
    db.commit()
    db.refresh(mission)
    return mission


def delete_mission(db: Session, *, user: User, mission_id: uuid.UUID) -> None:
    repo = MissionRepository(db)
    mission = repo.get_for_user(mission_id, user.id)
    if mission is None:
        raise MissionNotFoundError(mission_id)

    repo.delete(mission)
    db.commit()
