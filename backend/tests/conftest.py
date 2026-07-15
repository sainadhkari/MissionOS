import pytest


@pytest.fixture
def anyio_backend():
    """Runs `@pytest.mark.anyio` async tests on asyncio. Uses anyio's own
    pytest plugin (already installed transitively via fastapi/starlette)
    rather than adding pytest-asyncio as a new dependency."""
    return "asyncio"
