"""
Unit tests for Chat API endpoint, learning modes, and error handling.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_validation_error():
    """Verify empty message triggers Pydantic 422 validation error."""
    resp = client.post("/api/chat", json={"message": "", "mode": "Academic Learning"})
    assert resp.status_code == 422


def test_chat_modes_handling():
    """Verify chat handles all six learning modes safely."""
    modes = [
        "Academic Learning",
        "Programming & Coding",
        "Engineering Mathematics",
        "Exam Preparation",
        "Practical & Viva",
        "Project Guidance"
    ]

    for mode in modes:
        resp = client.post("/api/chat", json={
            "message": "Explain the concept of Kirchhoff's Current Law (KCL).",
            "mode": mode,
            "use_retrieval": False
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == mode
        assert "response" in data
        assert "conversation_id" in data


def test_chat_math_equation_detection():
    """Verify mathematical equation triggers SymPy verification."""
    resp = client.post("/api/chat", json={
        "message": "solve x^2 - 9 = 0",
        "mode": "Engineering Mathematics",
        "use_retrieval": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["math_verification"] is not None
    assert data["math_verification"]["verified"] is True
    assert "-3" in data["math_verification"]["result"] and "3" in data["math_verification"]["result"]


def test_clear_chat_endpoint():
    """Verify clearing conversation sessions."""
    resp = client.post("/api/chat/clear", json={"conversation_id": "test_session_123"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True
