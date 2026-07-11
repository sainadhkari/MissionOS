from pathlib import Path

from app.ai.exceptions import AIException

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


class PromptLoader:
    """Loads markdown prompt templates from app/ai/prompts/.

    Kept as its own small, injectable class — rather than agents reading
    files directly — so every agent loads prompts the same way, and prompt
    content can be swapped or mocked in tests without touching agent logic.
    """

    def __init__(self, prompts_dir: Path = _PROMPTS_DIR) -> None:
        self._prompts_dir = prompts_dir

    def load(self, name: str) -> str:
        path = self._prompts_dir / f"{name}.md"
        try:
            return path.read_text(encoding="utf-8")
        except FileNotFoundError as exc:
            raise AIException(f"Prompt template not found: {name}") from exc
