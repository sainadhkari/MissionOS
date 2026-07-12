from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.reports.models import ReportData

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def render_html(data: ReportData, *, is_pdf: bool = False) -> str:
    """Renders `ReportData` through `templates/report.html` — the one place
    report layout lives. `is_pdf` only toggles the paginated footer (page
    numbers only mean something for a paginated PDF); the report *content*
    is identical either way. Autoescaping is on, so free-form agent-authored
    text can't be interpreted as markup in the rendered output.
    """
    template = _env.get_template("report.html")
    return template.render(report=data, is_pdf=is_pdf)
