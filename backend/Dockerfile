FROM python:3.14-slim

WORKDIR /app

# Copied and installed before the rest of the source so this layer is only
# rebuilt when dependencies actually change, not on every code edit.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p storage/uploads

RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# No curl in this image on purpose — a stdlib-only check keeps the image
# from needing an extra apt-get layer just for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Migrations run on every container start, before the app accepts traffic —
# the standard, idempotent way to keep schema and code in lockstep for a
# single-instance deployment. `alembic upgrade head` is a no-op if the
# schema's already current.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
