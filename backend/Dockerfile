# =============================================================================
# Production multi-stage Docker image for Nexus AI Backend
# =============================================================================

# ---- Stage 1: Build dependencies ----
FROM python:3.12-slim AS builder

WORKDIR /build

# Install uv for fast package resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency manifest
COPY pyproject.toml ./

# Install into a venv (no dev dependencies)
RUN uv sync --frozen --no-dev --no-install-project

# ---- Stage 2: Runtime ----
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="Nexus AI Backend"
LABEL org.opencontainers.image.version="0.1.0"

# Create non-root user
RUN groupadd -r nexus && useradd -r -g nexus -d /app nexus

WORKDIR /app

# Copy venv from builder
COPY --from=builder /build/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application source
COPY src/ /app/src/
COPY alembic/ /app/alembic/
COPY alembic.ini /app/

# Ensure correct ownership
RUN chown -R nexus:nexus /app
USER nexus

EXPOSE 8000

# Default command (can be overridden for worker, etc.)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
