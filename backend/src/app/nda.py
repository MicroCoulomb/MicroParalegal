"""Mutual NDA chat schemas and helpers."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    """Convert snake_case field names to camelCase aliases."""

    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class CamelModel(BaseModel):
    """Base model that accepts and emits camelCase field names."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ChatMessage(CamelModel):
    """Single chat message exchanged in the drafting workflow."""

    role: Literal["assistant", "user"]
    content: str = Field(min_length=1)


class NdaDraft(CamelModel):
    """Structured Mutual NDA draft values."""

    confidentiality_term_years: str = ""
    effective_date: str = ""
    governing_law: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    nda_term_years: str = ""
    party_one_address: str = ""
    party_one_company: str = ""
    party_one_signer: str = ""
    party_one_title: str = ""
    party_two_address: str = ""
    party_two_company: str = ""
    party_two_signer: str = ""
    party_two_title: str = ""
    purpose: str = ""


class NdaChatRequest(CamelModel):
    """Stateless NDA chat turn request."""

    draft: NdaDraft
    messages: list[ChatMessage]


class NdaChatResponse(CamelModel):
    """NDA chat turn response returned to the frontend."""

    assistant_message: str
    draft: NdaDraft
    missing_fields: list[str]
    is_complete: bool


class NdaChatTurnResult(CamelModel):
    """Structured LLM response for a single chat turn."""

    assistant_message: str = Field(
        description="Assistant reply to show to the user. Ask concise follow-up questions when data is missing."
    )
    draft: NdaDraft = Field(
        description="Complete NDA draft snapshot after applying the user's latest message."
    )


REQUIRED_DRAFT_FIELDS = {
    "party_one_company": "Party 1 company",
    "party_one_signer": "Party 1 signer",
    "party_one_title": "Party 1 title",
    "party_one_address": "Party 1 notice address",
    "party_two_company": "Party 2 company",
    "party_two_signer": "Party 2 signer",
    "party_two_title": "Party 2 title",
    "party_two_address": "Party 2 notice address",
    "purpose": "Purpose",
    "effective_date": "Effective date",
    "governing_law": "Governing law",
    "jurisdiction": "Jurisdiction",
}


def get_missing_fields(draft: NdaDraft) -> list[str]:
    """Return the labels for required NDA fields that are still blank."""

    missing_fields: list[str] = []

    for field_name, label in REQUIRED_DRAFT_FIELDS.items():
        value = getattr(draft, field_name).strip()
        if not value:
            missing_fields.append(label)

    return missing_fields
