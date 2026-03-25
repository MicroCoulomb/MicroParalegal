"""LLM-backed catalog-driven drafting chat service."""

from __future__ import annotations

import json
import os
import re
from typing import Protocol

os.environ.setdefault("PYTHON_DOTENV_DISABLED", "1")

from litellm import completion
from litellm.exceptions import BadRequestError

from app.config import MODEL_EXTRA_BODY, MODEL_NAME, MODEL_REASONING_EFFORT, OPENAI_API_KEY
from app.documents import get_supported_document, load_supported_documents
from app.drafting import (
    ChatMessage,
    DocumentRef,
    DocumentSelectionDecision,
    DraftingChatResponse,
    DraftingState,
    DraftingTurnResult,
)


SELECTION_PROMPT = """You are MicroPrelegal's legal document drafting assistant.

You help users identify which supported document they need from the provided catalog.

Rules:
- Only select documents from the supported catalog.
- If the user's request is unsupported, explain that it is unsupported, suggest the closest supported document, and wait for explicit confirmation before switching.
- If there is already a pending suggested document and the user clearly confirms it, select that suggested document.
- If there is already a selected document, keep it unless the user clearly asks to switch.
- Ask concise follow-up questions if the request is ambiguous.
- Do not invent support for documents outside the catalog.
- Return only filenames that exist in the provided catalog.
"""


DRAFTING_PROMPT = """You are MicroPrelegal's legal document drafting assistant.

You are drafting the selected supported document using the provided Common Paper template.

Rules:
- Use only explicit user-provided facts. Do not invent party names, business terms, dates, prices, jurisdictions, or legal details.
- Keep unknown details as obvious placeholders in square brackets.
- Preserve previously captured explicit facts unless the user clearly changes them.
- Ask concise follow-up questions until the draft is coherent enough for a first-pass review.
- `preview_content` should be readable markdown for the current draft, not raw notes.
- Adapt the selected template into a draft preview. Keep the document title and meaningful section structure, but you do not need to reproduce every line verbatim.
- Preserve the section hierarchy and numbering pattern from the selected template.
- Top-level sections must increment correctly, for example `1.`, `2.`, `3.`.
- Nested sections must stay under the correct parent, for example `2.1`, `2.2`, `3.1`, and must not restart at `1.` unless the source template itself does.
- Do not replace legal section numbering with generic or inconsistent numbering.
- `is_complete` should be true only when the user has supplied enough explicit detail for a coherent first draft of the selected document.
"""


class DraftingChatService(Protocol):
    """Protocol for generating one generic drafting chat turn."""

    def generate_reply(self, messages: list[ChatMessage], state: DraftingState) -> DraftingChatResponse:
        """Return the assistant reply and updated drafting state for the next turn."""


class LiteLlmDraftingChatService:
    """LiteLLM implementation for catalog-driven drafting chat turns."""

    def generate_reply(self, messages: list[ChatMessage], state: DraftingState) -> DraftingChatResponse:
        """Select a supported document and generate the next draft preview."""

        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured.")

        documents = load_supported_documents()
        selection = self._resolve_document_selection(messages, state, documents)
        selected_document = get_supported_document(selection.selected_document_filename or "")
        suggested_document = get_supported_document(selection.suggested_document_filename or "")

        if not selected_document or selection.should_wait_for_confirmation:
            return DraftingChatResponse(
                assistant_message=selection.assistant_message,
                selected_document=self._to_ref(selected_document),
                suggested_document=self._to_ref(suggested_document),
                preview_content=state.preview_content,
                is_complete=False,
                status_note=selection.status_note,
            )

        drafting_result = self._draft_document(messages, state, selected_document)
        return DraftingChatResponse(
            assistant_message=drafting_result.assistant_message,
            selected_document=self._to_ref(selected_document),
            suggested_document=None,
            preview_content=drafting_result.preview_content,
            is_complete=drafting_result.is_complete,
            status_note=drafting_result.status_note,
        )

    def _resolve_document_selection(
        self,
        messages: list[ChatMessage],
        state: DraftingState,
        documents,
    ) -> DocumentSelectionDecision:
        """Reuse the current selection when the user is clearly continuing the same draft."""

        if state.selected_document_filename and not self._should_reselect_document(messages, state, documents):
            selected_document = get_supported_document(state.selected_document_filename)
            if selected_document:
                return DocumentSelectionDecision(
                    assistant_message="",
                    selected_document_filename=selected_document.filename,
                    suggested_document_filename=None,
                    should_wait_for_confirmation=False,
                    status_note=f"Continuing {selected_document.name}.",
                )

        return self._select_document(messages, state, documents)

    def _should_reselect_document(self, messages: list[ChatMessage], state: DraftingState, documents) -> bool:
        """Detect whether the latest user message is trying to switch document types."""

        last_user_message = next((message.content.lower() for message in reversed(messages) if message.role == "user"), "")
        if not last_user_message:
            return False

        switch_markers = ("instead", "switch", "different", "another", "not this", "change document")
        selected_document = get_supported_document(state.selected_document_filename or "")
        if selected_document and selected_document.name.lower() in last_user_message:
            return False

        if any(marker in last_user_message for marker in switch_markers):
            return True

        supported_names = [document.name.lower() for document in documents]
        return any(name in last_user_message for name in supported_names)

    def _select_document(
        self,
        messages: list[ChatMessage],
        state: DraftingState,
        documents,
    ) -> DocumentSelectionDecision:
        """Choose the current supported document or suggest the closest supported one."""

        catalog_payload = [
            {"filename": document.filename, "name": document.name, "description": document.description}
            for document in documents
        ]
        payload = [
            {"role": "system", "content": SELECTION_PROMPT},
            {"role": "system", "content": f"Supported catalog JSON:\n{json.dumps(catalog_payload, indent=2)}"},
            {
                "role": "system",
                "content": (
                    "Current drafting state JSON:\n"
                    f"{json.dumps(state.model_dump(mode='json', by_alias=True), indent=2)}"
                ),
            },
            *[message.model_dump(mode="json") for message in messages],
        ]

        response = self._create_completion(payload, DocumentSelectionDecision)
        return DocumentSelectionDecision.model_validate_json(response.choices[0].message.content)

    def _draft_document(
        self,
        messages: list[ChatMessage],
        state: DraftingState,
        document,
    ) -> DraftingTurnResult:
        """Draft the selected document against its template."""

        payload = [
            {"role": "system", "content": DRAFTING_PROMPT},
            {
                "role": "system",
                "content": (
                    "Selected supported document JSON:\n"
                    f"{json.dumps({'filename': document.filename, 'name': document.name, 'description': document.description}, indent=2)}"
                ),
            },
            {
                "role": "system",
                "content": (
                    "Current drafting state JSON:\n"
                    f"{json.dumps(state.model_dump(mode='json', by_alias=True), indent=2)}"
                ),
            },
            {
                "role": "system",
                "content": self._build_template_context(document, include_full_template=not bool(state.preview_content.strip())),
            },
            *[message.model_dump(mode="json") for message in messages],
        ]

        response = self._create_completion(payload, DraftingTurnResult)
        return DraftingTurnResult.model_validate_json(response.choices[0].message.content)

    def _create_completion(self, payload: list[dict[str, str]], response_format):
        """Create a completion, retrying without provider routing if the API rejects it."""

        request_kwargs = {
            "model": MODEL_NAME,
            "messages": payload,
            "response_format": response_format,
        }
        return self._call_completion(request_kwargs, use_provider_routing=True)

    def _call_completion(self, request_kwargs: dict, use_provider_routing: bool):
        """Call LiteLLM with optional provider routing retry."""

        final_request_kwargs = dict(request_kwargs)
        if use_provider_routing:
            final_request_kwargs["extra_body"] = MODEL_EXTRA_BODY

        try:
            return completion(**final_request_kwargs)
        except BadRequestError as exc:
            error_text = str(exc)
            if use_provider_routing and (
                "Unknown parameter: 'provider'" in error_text
                or "Unrecognized request argument supplied: provider" in error_text
            ):
                return self._call_completion(request_kwargs, use_provider_routing=False)
            raise

    @staticmethod
    def _to_ref(document) -> DocumentRef | None:
        """Convert an internal supported document into response metadata."""

        if not document:
            return None

        return DocumentRef(
            description=document.description,
            filename=document.filename,
            name=document.name,
        )

    @staticmethod
    def _build_template_context(document, include_full_template: bool) -> str:
        """Return a compact template context for the drafting model."""

        headings = re.findall(r"(?m)^(#+\s+.+)$", document.template_content)
        if not headings:
            headings = re.findall(r'(?m)^\s*\d+\.\s+<span class="header_[23]".*?>([^<]+)</span>', document.template_content)

        heading_text = "\n".join(f"- {heading.strip()}" for heading in headings[:40])
        if include_full_template:
            return (
                "Template outline:\n"
                f"{heading_text or '- No explicit headings extracted.'}\n\n"
                "Selected template markdown:\n"
                f"{document.template_content}"
            )

        return (
            "Template outline for reference:\n"
            f"{heading_text or '- No explicit headings extracted.'}\n\n"
            "Use the current preview content as the primary draft source and preserve its structure while applying the latest user changes."
        )
