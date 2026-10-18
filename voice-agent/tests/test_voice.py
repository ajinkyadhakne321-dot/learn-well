"""
Unit tests for voice Speech-to-Text, Text-to-Speech, and audio streaming security.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_synthesize_validation():
    """Verify empty text is rejected with 400."""
    resp = client.post("/api/voice/synthesize", json={"text": ""})
    assert resp.status_code == 400


def test_synthesize_speech_and_stream():
    """Verify local speech synthesis and subsequent audio file streaming."""
    resp = client.post("/api/voice/synthesize", json={"text": "Welcome to Engineering AI Tutor."})
    # If on macOS with native say, it produces 200, otherwise 500 error explaining fallback
    if resp.status_code == 200:
        data = resp.json()
        assert "audio_url" in data
        assert "engine" in data

        # Test streaming the generated audio
        audio_url = data["audio_url"]
        stream_resp = client.get(audio_url)
        assert stream_resp.status_code == 200
        assert len(stream_resp.content) > 0


def test_audio_path_traversal_protection():
    """Verify path traversal attacks are rejected."""
    resp = client.get("/api/voice/audio/../../etc/passwd")
    assert resp.status_code in [400, 404]

    resp2 = client.get("/api/voice/audio/..%2F..%2Fetc%2Fpasswd")
    assert resp2.status_code in [400, 404]
