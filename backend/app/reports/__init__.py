"""Report generation: assembling a `ReportData` model from a completed
`MissionAnalysis` and rendering it to HTML or PDF.

Nothing in this package calls the AI, imports `AnalysisOrchestrator`, or
touches any agent — `MissionAnalysis` (already persisted, already complete)
is the only input, per Ticket-015's "single source of truth" requirement.
"""
