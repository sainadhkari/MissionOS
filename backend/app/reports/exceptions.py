class ReportError(Exception):
    """Base class for every exception raised by app.reports."""


class UnsupportedReportFormatError(ReportError):
    pass


class ReportGenerationError(ReportError):
    pass
