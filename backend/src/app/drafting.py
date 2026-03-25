"""Generic document drafting schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.nda import CamelModel


class ChatMessage(CamelModel):
    """Single chat message exchanged in the drafting workflow."""

    role: Literal["assistant", "user"]
    content: str = Field(min_length=1)


class DocumentRef(CamelModel):
    """Supported document metadata returned to the frontend."""

    description: str
    filename: str
    name: str


class DraftingState(CamelModel):
    """Current drafting state carried between stateless chat turns."""

    selected_document_filename: str | None = None
    suggested_document_filename: str | None = None
    preview_content: str = ""


class DraftingChatRequest(CamelModel):
    """Stateless generic drafting chat turn request."""

    messages: list[ChatMessage]
    state: DraftingState


class DraftingChatResponse(CamelModel):
    """Generic drafting chat response returned to the frontend."""

    assistant_message: str
    selected_document: DocumentRef | None = None
    suggested_document: DocumentRef | None = None
    preview_content: str
    is_complete: bool
    status_note: str


class DocumentSelectionDecision(CamelModel):
    """Structured model-selection result for choosing a supported document."""

    assistant_message: str = Field(
        description="Assistant reply guiding the user to a supported document or asking the next question."
    )
    selected_document_filename: str | None = Field(
        default=None,
        description="Filename of the supported document selected for drafting, if any.",
    )
    suggested_document_filename: str | None = Field(
        default=None,
        description="Filename of the closest supported document when the user asked for an unsupported one.",
    )
    should_wait_for_confirmation: bool = Field(
        description="True when the assistant has suggested a closest supported document and must wait for confirmation."
    )
    status_note: str = Field(description="Short drafting status note for the UI.")


class DraftingTurnResult(CamelModel):
    """Structured drafting result for the selected supported document."""

    assistant_message: str = Field(
        description="Assistant reply to show the user, asking concise follow-up questions until drafting is complete."
    )
    preview_content: str = Field(
        description="Current markdown preview for the selected document. Use placeholders for unknown values."
    )
    is_complete: bool = Field(
        description="True only when the selected document has enough explicit user-provided details for a coherent first draft."
    )
    status_note: str = Field(description="Short drafting status note for the UI.")
