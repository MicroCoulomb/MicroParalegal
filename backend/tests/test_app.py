import sqlite3
from types import SimpleNamespace

from fastapi.testclient import TestClient
import pytest

from app.config import DATABASE_PATH
from app.main import app
from app.nda import ChatMessage, NdaChatTurnResult, NdaDraft, get_missing_fields
from app.nda_chat import LiteLlmNdaChatService


class StubChatService:
    def generate_reply(self, messages, draft):
        updated_draft = draft.model_copy(
            update={
                "party_one_company": "Northstar Labs, Inc.",
                "party_one_signer": "Avery Stone",
                "party_one_title": "Chief Executive Officer",
                "party_one_address": "legal@northstarlabs.com",
                "party_two_company": "Harbor Peak LLC",
                "party_two_signer": "Jordan Lee",
                "party_two_title": "Managing Director",
                "party_two_address": "contracts@harborpeak.co",
                "purpose": "Evaluating a strategic partnership.",
                "effective_date": "2026-03-25",
            }
        )
        assert messages[-1].content == "We are evaluating a partnership."
        return NdaChatTurnResult(
            assistant_message="What governing law and jurisdiction should the agreement use?",
            draft=updated_draft,
        )


def test_healthcheck_returns_ok():
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_startup_resets_database_with_users_table():
    with TestClient(app):
        pass

    assert DATABASE_PATH.exists()

    with sqlite3.connect(DATABASE_PATH) as connection:
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
        ).fetchone()

    assert row == ("users",)


def test_workspace_route_falls_back_to_frontend_html_when_static_build_exists(tmp_path, monkeypatch):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<html><body>workspace shell</body></html>", encoding="utf-8")

    monkeypatch.setattr("app.main.FRONTEND_DIST_DIR", static_dir)

    with TestClient(app) as client:
        response = client.get("/workspace")

    assert response.status_code == 200
    assert "workspace shell" in response.text


def test_nda_chat_returns_updated_draft_and_missing_fields():
    with TestClient(app) as client:
        client.app.state.nda_chat_service = StubChatService()
        response = client.post(
            "/api/nda/chat",
            json={
                "draft": {
                    "partyOneCompany": "",
                    "partyOneSigner": "",
                    "partyOneTitle": "",
                    "partyOneAddress": "",
                    "partyTwoCompany": "",
                    "partyTwoSigner": "",
                    "partyTwoTitle": "",
                    "partyTwoAddress": "",
                    "purpose": "",
                    "effectiveDate": "",
                    "governingLaw": "California",
                    "jurisdiction": "courts located in San Francisco County, California",
                    "ndaTermYears": "1",
                    "confidentialityTermYears": "1",
                    "modifications": "None.",
                },
                "messages": [
                    {
                        "role": "assistant",
                        "content": "Tell me who the parties are and what the NDA is for.",
                    },
                    {
                        "role": "user",
                        "content": "We are evaluating a partnership.",
                    },
                ],
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "assistantMessage": "What governing law and jurisdiction should the agreement use?",
        "draft": {
            "partyOneCompany": "Northstar Labs, Inc.",
            "partyOneSigner": "Avery Stone",
            "partyOneTitle": "Chief Executive Officer",
            "partyOneAddress": "legal@northstarlabs.com",
            "partyTwoCompany": "Harbor Peak LLC",
            "partyTwoSigner": "Jordan Lee",
            "partyTwoTitle": "Managing Director",
            "partyTwoAddress": "contracts@harborpeak.co",
            "purpose": "Evaluating a strategic partnership.",
            "effectiveDate": "2026-03-25",
            "governingLaw": "California",
            "jurisdiction": "courts located in San Francisco County, California",
            "ndaTermYears": "1",
            "confidentialityTermYears": "1",
            "modifications": "None.",
        },
        "missingFields": [],
        "isComplete": True,
    }


def test_nda_chat_rejects_invalid_payload():
    with TestClient(app) as client:
        response = client.post(
            "/api/nda/chat",
            json={
                "draft": DEFAULT_DRAFT_PAYLOAD,
                "messages": [{"role": "system", "content": "invalid"}],
            },
        )

    assert response.status_code == 422


def test_get_missing_fields_lists_required_labels():
    draft = NdaDraft()

    assert get_missing_fields(draft) == [
        "Party 1 company",
        "Party 1 signer",
        "Party 1 title",
        "Party 1 notice address",
        "Party 2 company",
        "Party 2 signer",
        "Party 2 title",
        "Party 2 notice address",
        "Purpose",
        "Effective date",
    ]


def test_litellm_service_retries_without_provider_when_api_rejects_it(monkeypatch):
    calls: list[dict] = []

    class FakeBadRequestError(Exception):
        pass

    def fake_completion(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            raise FakeBadRequestError("Unknown parameter: 'provider'")
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=NdaChatTurnResult(
                            assistant_message="What governing law should apply?",
                            draft=NdaDraft(purpose="Evaluating a partnership."),
                        ).model_dump_json(by_alias=True)
                    )
                )
            ]
        )

    monkeypatch.setattr("app.nda_chat.completion", fake_completion)
    monkeypatch.setattr("app.nda_chat.BadRequestError", FakeBadRequestError)

    service = LiteLlmNdaChatService()
    result = service.generate_reply(
        [
            ChatMessage(role="assistant", content="Tell me about the NDA."),
            ChatMessage(role="user", content="It is for evaluating a partnership."),
        ],
        NdaDraft(),
    )

    assert result.assistant_message == "What governing law should apply?"
    assert len(calls) == 2
    assert calls[0]["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert "extra_body" not in calls[1]


DEFAULT_DRAFT_PAYLOAD = {
    "partyOneCompany": "",
    "partyOneSigner": "",
    "partyOneTitle": "",
    "partyOneAddress": "",
    "partyTwoCompany": "",
    "partyTwoSigner": "",
    "partyTwoTitle": "",
    "partyTwoAddress": "",
    "purpose": "",
    "effectiveDate": "",
    "governingLaw": "California",
    "jurisdiction": "courts located in San Francisco County, California",
    "ndaTermYears": "1",
    "confidentialityTermYears": "1",
    "modifications": "None.",
}
