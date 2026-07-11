"""AI pipeline: orchestrator, agents, and supporting infrastructure for
mission analysis — see app/ai/orchestrator.py for the pipeline shape.

Nothing in this package calls a model yet. This ticket (012A) only builds the
architecture: a client interface with no implementation, Pydantic data
contracts, a wired-but-empty orchestrator, generic response-parsing
utilities, exception types, and placeholder prompt files.
"""
