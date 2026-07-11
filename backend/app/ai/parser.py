import json
from typing import Any

from pydantic import BaseModel, ValidationError

from app.ai.exceptions import ParsingException


def extract_json_block(text: str) -> str:
    """Strips a surrounding ```json ... ``` (or bare ``` ... ```) fence if
    present, so callers don't have to special-case fenced model output."""
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def parse_json(text: str) -> Any:
    """Parses `text` as JSON, tolerating a markdown code fence around it."""
    try:
        return json.loads(extract_json_block(text))
    except json.JSONDecodeError as exc:
        raise ParsingException(f"Could not parse JSON: {exc}") from exc


def parse_structured_response[T: BaseModel](text: str, model: type[T]) -> T:
    """Parses `text` as JSON and validates it against `model`."""
    data = parse_json(text)
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        raise ParsingException(f"Response did not match {model.__name__}: {exc}") from exc
