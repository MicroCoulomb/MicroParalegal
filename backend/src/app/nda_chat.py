"""LLM-backed NDA chat service."""

from __future__ import annotations

import json
import os
from typing import Protocol

os.environ.setdefault("PYTHON_DOTENV_DISABLED", "1")

from litellm import completion
from litellm.exceptions import BadRequestError

from app.config import MODEL_EXTRA_BODY, MODEL_NAME, MODEL_REASONING_EFFORT, OPENAI_API_KEY
from app.nda import ChatMessage, NdaChatTurnResult, NdaDraft


SYSTEM_PROMPT = """You are MicroPrelegal's Mutual NDA drafting assistant.

You are collecting information for a Mutual Non-Disclosure Agreement and must keep a complete structured draft snapshot.

Rules:
- Stay within Mutual NDA drafting only.
- Use the provided current draft as the source of truth for already-known values.
- Update only fields supported by the schema.
- Preserve existing values unless the user clearly changes them.
- Do not assume or invent any user-specific information that the user has not explicitly provided.
- Ask concise follow-up questions for every required field that is still missing.
- If the user gives multiple values in one message, capture all of them.
- If a field is blank and the user has not supplied it, leave it blank in the draft.
- Effective dates must be returned in YYYY-MM-DD format when the user gives a clear calendar date.
- Return a complete draft snapshot, not a partial patch.
"""


class NdaChatService(Protocol):
    """Protocol for generating a single NDA chat turn result."""

    def generate_reply(self, messages: list[ChatMessage], draft: NdaDraft) -> NdaChatTurnResult:
        """Return the assistant reply and updated draft for the next turn."""


class LiteLlmNdaChatService:
    """LiteLLM implementation for NDA chat turns."""

    def generate_reply(self, messages: list[ChatMessage], draft: NdaDraft) -> NdaChatTurnResult:
        """Call the model and parse the structured chat result."""

        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured.")

        payload = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "system",
                "content": (
                    "Current draft JSON:\n"
                    f"{json.dumps(draft.model_dump(mode='json', by_alias=True), indent=2)}"
                ),
            },
            *[message.model_dump(mode="json") for message in messages],
        ]

        response = self._create_completion(payload, use_provider_routing=True)
        content = response.choices[0].message.content
        return NdaChatTurnResult.model_validate_json(content)

    def _create_completion(self, payload: list[dict[str, str]], use_provider_routing: bool):
        """Create a completion, retrying without provider routing if the API rejects it."""

        request_kwargs = {
            "model": MODEL_NAME,
            "messages": payload,
            "response_format": NdaChatTurnResult,
        }
        if use_provider_routing:
            request_kwargs["extra_body"] = MODEL_EXTRA_BODY

        try:
            return completion(**request_kwargs)
        except BadRequestError as exc:
            error_text = str(exc)
            if use_provider_routing and (
                "Unknown parameter: 'provider'" in error_text
                or "Unrecognized request argument supplied: provider" in error_text
            ):
                return self._create_completion(payload, use_provider_routing=False)
            raise
