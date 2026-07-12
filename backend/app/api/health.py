from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Liveness: is the process up at all? No dependencies checked — this
    should stay cheap and never fail just because the database is briefly
    unreachable (that's what /ready is for, and a container orchestrator
    that restarts on /health failures would flap the whole app every time
    Postgres has a moment of trouble)."""
    return HealthResponse(status="healthy", service="MissionOS Backend")


@router.get("/ready", response_model=ReadinessResponse)
def readiness_check(db: Session = Depends(get_db)) -> ReadinessResponse:
    """Readiness: can this instance actually serve traffic? Checks the one
    hard dependency every request needs — the database."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not reachable",
        ) from exc
    return ReadinessResponse(status="ready", database="connected")
