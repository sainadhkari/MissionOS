from pathlib import Path

from app.config.settings import settings

# app/core/vector_storage.py -> app/core -> app -> backend/
BACKEND_ROOT = Path(__file__).resolve().parents[2]
VECTOR_STORE_DIR = BACKEND_ROOT / settings.vector_store_dir
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
