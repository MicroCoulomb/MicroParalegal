FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend-runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /uvx /bin/
COPY backend/pyproject.toml ./backend/pyproject.toml
COPY backend/uv.lock ./backend/uv.lock
COPY backend/src ./backend/src
COPY catalog.json ./catalog.json
COPY templates ./templates
RUN uv sync --project ./backend --no-dev --frozen

COPY --from=frontend-builder /app/frontend/out ./backend/static

EXPOSE 8000

CMD ["/app/backend/.venv/bin/uvicorn", "app.main:app", "--app-dir", "/app/backend/src", "--host", "0.0.0.0", "--port", "8000"]
