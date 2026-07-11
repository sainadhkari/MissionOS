import csv
import io
import json
from dataclasses import dataclass
from pathlib import Path

import chardet
import pandas as pd

from app.core.storage import UPLOAD_DIR
from app.models.dataset import Dataset


class DatasetValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


@dataclass
class ParsedDataset:
    dataframe: pd.DataFrame
    encoding: str | None = None
    delimiter: str | None = None


def validate_and_read(dataset: Dataset) -> ParsedDataset:
    """Reads and parses the file backing `dataset`, raising DatasetValidationError
    with human-readable messages if the file is missing, corrupt, or empty."""
    path = UPLOAD_DIR / dataset.stored_filename
    if not path.exists():
        raise DatasetValidationError(["Stored file is missing."])

    if dataset.file_type == "csv":
        parsed = _read_csv(path)
    elif dataset.file_type == "xlsx":
        parsed = _read_excel(path)
    elif dataset.file_type == "json":
        parsed = _read_json(path)
    else:
        raise DatasetValidationError([f"Unsupported file type: {dataset.file_type}"])

    if parsed.dataframe.shape[1] == 0:
        raise DatasetValidationError(["No columns detected."])

    return parsed


def _detect_encoding(raw: bytes) -> str:
    detected = chardet.detect(raw).get("encoding")
    return detected or "utf-8"


def _read_csv(path: Path) -> ParsedDataset:
    raw = path.read_bytes()
    if not raw.strip():
        raise DatasetValidationError(["File is empty."])

    encoding = _detect_encoding(raw)
    try:
        text = raw.decode(encoding, errors="replace")
    except LookupError:
        encoding = "utf-8"
        text = raw.decode(encoding, errors="replace")

    try:
        delimiter = csv.Sniffer().sniff(text[:8192], delimiters=",;\t|").delimiter
    except csv.Error:
        delimiter = ","

    try:
        df = pd.read_csv(io.StringIO(text), sep=delimiter)
    except Exception as exc:
        raise DatasetValidationError([f"Could not parse CSV: {exc}"]) from exc

    return ParsedDataset(dataframe=df, encoding=encoding, delimiter=delimiter)


def _read_excel(path: Path) -> ParsedDataset:
    try:
        df = pd.read_excel(path, engine="openpyxl")
    except Exception as exc:
        raise DatasetValidationError([f"Could not parse Excel file: {exc}"]) from exc

    return ParsedDataset(dataframe=df)


def _read_json(path: Path) -> ParsedDataset:
    raw = path.read_bytes()
    if not raw.strip():
        raise DatasetValidationError(["File is empty."])

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DatasetValidationError([f"Could not parse JSON: {exc}"]) from exc

    if isinstance(data, list):
        records = data
    elif isinstance(data, dict):
        records = [data]
    else:
        raise DatasetValidationError(["JSON must be an object or an array of objects."])

    try:
        df = pd.json_normalize(records)
    except Exception as exc:
        raise DatasetValidationError([f"Could not normalize JSON: {exc}"]) from exc

    return ParsedDataset(dataframe=df)
