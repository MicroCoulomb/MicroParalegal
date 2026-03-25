"""Catalog-backed supported document definitions."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

from app.config import REPO_ROOT


class SupportedDocument(BaseModel):
    """Single supported legal document loaded from the repo catalog."""

    description: str
    filename: str
    name: str
    template_content: str


@lru_cache(maxsize=1)
def load_supported_documents() -> list[SupportedDocument]:
    """Load the supported document catalog and template contents."""

    catalog_path = REPO_ROOT / "catalog.json"
    templates_dir = REPO_ROOT / "templates"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    documents: list[SupportedDocument] = []
    for item in catalog:
        template_path = templates_dir / item["filename"]
        documents.append(
            SupportedDocument(
                description=item["description"],
                filename=item["filename"],
                name=item["name"],
                template_content=template_path.read_text(encoding="utf-8", errors="replace"),
            )
        )

    return documents


def get_supported_document(filename: str) -> SupportedDocument | None:
    """Return a supported document by filename."""

    return next((document for document in load_supported_documents() if document.filename == filename), None)
