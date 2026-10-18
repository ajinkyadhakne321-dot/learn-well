"""
Unit tests for backend health check endpoints and hardware recommendations.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns status, runtime info, and model diagnostics."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "app_name" in data
    assert "ollama_status" in data
    assert "selected_model" in data
    assert "hardware_recommendation" in data
    assert "indexed_documents_count" in data
    assert "voice_stt_status" in data
    assert "voice_tts_status" in data


def test_hardware_endpoint():
    """Verify hardware endpoint detects architecture and recommends suitable model."""
    response = client.get("/api/settings/hardware")
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert "recommended_model" in data


def test_model_switching():
    """Verify switching active model dynamically."""
    response = client.post("/api/settings/model", json={"model_name": "qwen2.5-coder:7b"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["active_model"] == "qwen2.5-coder:7b"

    # Reset back to default
    client.post("/api/settings/model", json={"model_name": "llama3.2:3b"})
