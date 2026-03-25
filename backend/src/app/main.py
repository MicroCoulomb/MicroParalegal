"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import FRONTEND_DIST_DIR
from app.db import reset_database
from app.drafting import DraftingChatRequest, DraftingChatResponse
from app.drafting_chat import LiteLlmDraftingChatService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialize application state on startup."""
    reset_database()
    application.state.drafting_chat_service = LiteLlmDraftingChatService()
    yield


app = FastAPI(title="MicroPrelegal", lifespan=lifespan)


@app.get("/api/health")
async def healthcheck() -> dict[str, str]:
    """Return a basic service health payload."""
    return {"status": "ok"}


@app.post("/api/drafting/chat")
async def drafting_chat(request: DraftingChatRequest) -> DraftingChatResponse:
    """Run one generic drafting chat turn and return the updated draft."""

    try:
        result = app.state.drafting_chat_service.generate_reply(request.messages, request.state)
    except RuntimeError as exc:
        logger.exception("Drafting chat runtime failure.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Drafting chat request failed.")
        raise HTTPException(status_code=502, detail="Failed to generate drafting chat response.") from exc

    return result


if (FRONTEND_DIST_DIR / "_next").exists():
    app.mount("/_next", StaticFiles(directory=FRONTEND_DIST_DIR / "_next"), name="next-assets")


@app.get("/{full_path:path}")
async def frontend_app(full_path: str) -> FileResponse:
    """Serve static frontend files with HTML fallback for app routes."""

    requested_path = FRONTEND_DIST_DIR / full_path

    if full_path and requested_path.is_file():
        return FileResponse(requested_path)

    nested_index = FRONTEND_DIST_DIR / full_path / "index.html" if full_path else FRONTEND_DIST_DIR / "index.html"
    if nested_index.exists():
        return FileResponse(nested_index)

    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    raise HTTPException(status_code=404, detail=f"Static frontend asset not found for {Path(full_path or '/').as_posix()}.")
