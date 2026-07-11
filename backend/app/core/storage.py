import os
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config.settings import settings

# app/core/storage.py -> app/core -> app -> backend/
BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_ROOT / settings.upload_dir
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class FileTooLargeError(Exception):
    pass


def save_upload(upload: UploadFile, *, extension: str) -> tuple[str, int]:
    """Persists `upload` under a UUID-derived filename so it can never collide
    with or overwrite an existing file. Returns (stored_filename, size_in_bytes)."""
    upload.file.seek(0, os.SEEK_END)
    size = upload.file.tell()
    upload.file.seek(0)

    if size > settings.max_upload_size_bytes:
        raise FileTooLargeError

    stored_filename = f"{uuid.uuid4()}.{extension}"
    destination = UPLOAD_DIR / stored_filename
    with destination.open("wb") as out_file:
        shutil.copyfileobj(upload.file, out_file)

    return stored_filename, size


def delete_upload(stored_filename: str) -> None:
    (UPLOAD_DIR / stored_filename).unlink(missing_ok=True)
