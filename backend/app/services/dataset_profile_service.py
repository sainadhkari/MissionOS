import math
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.dataset_profile import DatasetProfile
from app.services.dataset_validation_service import ParsedDataset

_DATE_PARSE_SUCCESS_THRESHOLD = 0.8
_TOP_CATEGORICAL_VALUES = 5


def _to_jsonable(value: Any) -> Any:
    """Recursively converts numpy/pandas scalars (not natively JSON-serializable)
    to plain Python values, and NaN/NaT to None."""
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(v) for v in value]
    if value is None:
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _classify_columns(df: pd.DataFrame) -> dict[str, str]:
    categories: dict[str, str] = {}
    for column in df.columns:
        series = df[column]
        if pd.api.types.is_datetime64_any_dtype(series):
            categories[column] = "date"
        elif pd.api.types.is_numeric_dtype(series):
            categories[column] = "numeric"
        elif pd.api.types.is_string_dtype(series) or isinstance(series.dtype, pd.CategoricalDtype):
            non_null = series.dropna()
            is_date = False
            if len(non_null) > 0:
                parsed = pd.to_datetime(non_null, errors="coerce", format="mixed")
                is_date = parsed.notna().mean() >= _DATE_PARSE_SUCCESS_THRESHOLD
            categories[column] = "date" if is_date else "categorical"
        else:
            categories[column] = "categorical"
    return categories


def _numeric_summary(series: pd.Series) -> dict[str, Any]:
    clean = series.dropna()
    if clean.empty:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None, "std": None}
    return {
        "count": int(clean.count()),
        "min": _to_jsonable(clean.min()),
        "max": _to_jsonable(clean.max()),
        "mean": _to_jsonable(clean.mean()),
        "median": _to_jsonable(clean.median()),
        "std": _to_jsonable(clean.std()) if len(clean) > 1 else 0.0,
    }


def _categorical_summary(series: pd.Series) -> dict[str, Any]:
    clean = series.dropna()
    value_counts = clean.value_counts().head(_TOP_CATEGORICAL_VALUES)
    return {
        "unique_count": int(clean.nunique()),
        "top_values": [
            {"value": _to_jsonable(value), "count": int(count)}
            for value, count in value_counts.items()
        ],
    }


def build_profile_payload(parsed: ParsedDataset) -> dict[str, Any]:
    df = parsed.dataframe
    categories = _classify_columns(df)

    columns: list[dict[str, Any]] = []
    numeric_summary: dict[str, Any] = {}
    categorical_summary: dict[str, Any] = {}
    missing_values: dict[str, int] = {}

    for column in df.columns:
        name = str(column)
        category = categories[column]
        missing_count = int(df[column].isna().sum())
        missing_values[name] = missing_count
        columns.append(
            {
                "name": name,
                "dtype": str(df[column].dtype),
                "category": category,
                "missing_count": missing_count,
            }
        )
        if category == "numeric":
            numeric_summary[name] = _numeric_summary(df[column])
        elif category == "categorical":
            categorical_summary[name] = _categorical_summary(df[column])

    return {
        "row_count": int(df.shape[0]),
        "column_count": int(df.shape[1]),
        "columns": columns,
        "missing_values": missing_values,
        "duplicate_row_count": int(df.duplicated().sum()),
        "numeric_summary": numeric_summary,
        "categorical_summary": categorical_summary,
        "encoding": parsed.encoding,
        "delimiter": parsed.delimiter,
    }


def _get_existing(db: Session, dataset_id: Any) -> DatasetProfile | None:
    return db.scalar(select(DatasetProfile).where(DatasetProfile.dataset_id == dataset_id))


def save_profile(db: Session, *, dataset: Dataset, parsed: ParsedDataset) -> DatasetProfile:
    payload = build_profile_payload(parsed)
    existing = _get_existing(db, dataset.id)
    if existing is not None:
        for key, value in payload.items():
            setattr(existing, key, value)
        existing.validation_errors = None
        profile = existing
    else:
        profile = DatasetProfile(dataset_id=dataset.id, validation_errors=None, **payload)
        db.add(profile)
    db.flush()
    return profile


def save_validation_failure(db: Session, *, dataset: Dataset, errors: list[str]) -> DatasetProfile:
    existing = _get_existing(db, dataset.id)
    if existing is not None:
        existing.validation_errors = errors
        profile = existing
    else:
        profile = DatasetProfile(
            dataset_id=dataset.id,
            row_count=0,
            column_count=0,
            columns=[],
            missing_values={},
            duplicate_row_count=0,
            numeric_summary={},
            categorical_summary={},
            encoding=None,
            delimiter=None,
            validation_errors=errors,
        )
        db.add(profile)
    db.flush()
    return profile
