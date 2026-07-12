import io
import logging

from xhtml2pdf import pisa

from app.reports.exceptions import ReportGenerationError

logger = logging.getLogger("missionos.reports")


def render_pdf(html: str) -> bytes:
    """Converts already-rendered report HTML to PDF bytes. Deliberately
    isolated behind this one function — swapping xhtml2pdf for another
    HTML-to-PDF engine means changing this file only; nothing else in
    `app.reports` or `app.services` knows which library produced the bytes.

    `pisa.CreatePDF` does not wrap its own layout/rendering step
    (`doc.build(...)` inside `xhtml2pdf.pisa.pisaDocument`) in a try/except
    — a real rendering failure (a malformed image, a font issue, a bug in
    xhtml2pdf itself) raises a raw exception straight out of this call,
    which `result.err` (a count of *recoverable* warnings xhtml2pdf logged
    internally, not real failures) would never catch. Both paths are
    handled explicitly below and logged with a full traceback, so a PDF
    failure is diagnosable from the server log instead of surfacing as an
    opaque "Internal server error" with no indication of what broke.
    """
    buffer = io.BytesIO()
    try:
        result = pisa.CreatePDF(io.StringIO(html), dest=buffer)
    except Exception as exc:
        logger.exception("xhtml2pdf raised while rendering the PDF")
        raise ReportGenerationError(f"PDF rendering failed: {exc}") from exc

    if result.err:
        # Each `result.log` entry is a 4-tuple — (level, line_number,
        # message, fragment) — set by `pisaContext.error`/`.warning` in
        # xhtml2pdf/context.py; `level` is the literal string "error" or
        # "warning". Verified directly against the installed xhtml2pdf
        # source rather than assumed, since guessing this shape wrong would
        # make the "detailed" error message silently throw its own
        # (unrelated) AttributeError instead of ever being seen.
        error_entries = [entry for entry in (result.log or []) if entry[0] == "error"]
        details = "; ".join(
            f"line {line}: {message}" for _level, line, message, _fragment in error_entries
        ) or f"{result.err} error(s) reported, no further detail available."
        logger.error("xhtml2pdf reported %d error(s) generating the PDF: %s", result.err, details)
        raise ReportGenerationError(f"Could not generate PDF from the rendered report: {details}")

    return buffer.getvalue()
