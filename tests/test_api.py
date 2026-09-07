"""Endpoint tests for the Task 4 API.

Run: .venv/bin/python -m pytest tests/ -v
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_reports_a_loaded_pipeline(client):
    body = client.get("/health").json()
    assert body["status"] in {"ok", "degraded"}
    assert body["pipeline_ready"] is True
    assert body["standards_loaded"] > 200
    assert body["allied_mappings"] == 15
    assert body["flagship_products"] == 54


def test_recommend_returns_ranked_results(client):
    response = client.post(
        "/recommend", json={"query": "TMT reinforcement bars Fe 500D for RCC", "top_k": 3}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 3
    assert body["strong_match"] is True
    assert [r["rank"] for r in body["results"]] == [1, 2, 3]
    for result in body["results"]:
        assert result["match_reasons"], "every result must explain itself"
        assert 0.0 <= result["score"] <= 1.0
        assert "canonical_key" in result


def test_recommend_can_inline_allied_standards(client):
    body = client.post(
        "/recommend", json={"query": "TMT rebar Fe500", "top_k": 3, "include_allied": True}
    ).json()
    with_allied = [r for r in body["results"] if r["has_allied"]]
    assert with_allied, "expected at least one result with an allied mapping"
    assert with_allied[0]["allied"]["mapped"] is True
    assert with_allied[0]["allied"]["groups"]


def test_recommend_rejects_an_empty_query(client):
    response = client.post("/recommend", json={"query": "   "})
    assert response.status_code == 422
    assert response.json()["error"] == "empty_query"


@pytest.mark.parametrize("top_k", [0, 51, -1])
def test_recommend_validates_top_k(client, top_k):
    assert client.post("/recommend", json={"query": "cement", "top_k": top_k}).status_code == 422


def test_recommend_translates_hindi_input(client):
    body = client.post(
        "/recommend", json={"query": "विद्यालय के लिए पेयजल की बोतल", "top_k": 3}
    ).json()
    assert body["translation"] is not None
    assert body["translation"]["applied"] is True
    assert body["query"] != body["original_query"]
    numbers = [r["standard_number"] for r in body["results"]]
    assert any("10500" in n or "14543" in n for n in numbers), numbers


@pytest.mark.parametrize(
    "number", ["IS 1786", "IS 1786:2008", "IS%201786", "IS 456", "IS 383-2016"]
)
def test_allied_accepts_any_number_format(client, number):
    body = client.get(f"/allied/{number}").json()
    assert body["mapped"] is True
    assert body["total"] > 0
    assert body["groups"]


def test_allied_returns_200_for_an_unmapped_standard(client):
    response = client.get("/allied/IS 99999")
    assert response.status_code == 200
    body = response.json()
    assert body["mapped"] is False
    assert body["groups"] == []
    assert body["message"]


def test_allied_groups_are_labelled_for_the_ui(client):
    body = client.get("/allied/IS 456").json()
    for group in body["groups"]:
        assert group["label"]
        assert group["count"] == len(group["standards"])
        for standard in group["standards"]:
            assert standard["standard_number"]
            assert standard["confidence"] in {"high", "medium", "low"}


def test_translate_never_fails(client):
    body = client.post(
        "/translate", json={"text": "सीमेंट की आपूर्ति", "target_lang": "en"}
    ).json()
    assert body["provider"]
    assert body["text"]
    assert body["original_text"] == "सीमेंट की आपूर्ति"


def test_languages_and_demo_queries(client):
    languages = client.get("/languages").json()
    assert {"en", "hi"} <= {item["code"] for item in languages["languages"]}
    demo = client.get("/demo-queries").json()
    assert len(demo["queries"]) >= 5
    assert demo["multilingual_examples"]


def test_standard_lookup(client):
    body = client.get("/standards/IS 456").json()
    assert body["standard"]["standard_number"].startswith("IS 456")
    assert body["allied"]["mapped"] is True


def test_standard_lookup_404s_cleanly(client):
    response = client.get("/standards/IS 99999")
    assert response.status_code == 404
    assert response.json()["error"] == "standard_not_found"


def test_cors_preflight_allows_the_frontend(client):
    response = client.options(
        "/recommend",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
