"""Backend configuration values."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "microprelegal.db"
FRONTEND_DIST_DIR = BASE_DIR / "static"
MODEL_NAME = "gpt-5-mini"
MODEL_REASONING_EFFORT = "low"
MODEL_EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

dotenv_path = REPO_ROOT / ".env"
if dotenv_path.exists():
    try:
        load_dotenv(dotenv_path=dotenv_path)
    except UnicodeDecodeError:
        load_dotenv(dotenv_path=dotenv_path, encoding="utf-16")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
