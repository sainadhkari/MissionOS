from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def register_user(db: Session, *, full_name: str, email: str, password: str) -> User:
    repo = UserRepository(db)
    if repo.get_by_email(email) is not None:
        raise EmailAlreadyRegisteredError(email)

    user = repo.create(full_name=full_name, email=email, password_hash=hash_password(password))
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = UserRepository(db).get_by_email(email)
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    return user


def create_user_access_token(user: User) -> str:
    return create_access_token(subject=str(user.id))
