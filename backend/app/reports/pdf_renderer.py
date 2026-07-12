import io

from xhtml2pdf import pisa

from app.reports.exceptions import ReportGenerationError


def render_pdf(html: str) -> bytes:
    """Converts already-rendered report HTML to PDF bytes. Deliberately
    isolated behind this one function — swapping xhtml2pdf for another
    HTML-to-PDF engine means changing this file only; nothing else in
    `app.reports` or `app.services` knows which library produced the bytes.
    """
    buffer = io.BytesIO()
    result = pisa.CreatePDF(io.StringIO(html), dest=buffer)
    if result.err:
        raise ReportGenerationError("Could not generate PDF from the rendered report.")
    return buffer.getvalue()
