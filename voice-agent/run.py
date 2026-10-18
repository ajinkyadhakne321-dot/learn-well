#!/usr/bin/env python3
"""
Startup and Environment Verification Script for AI Engineering Tutor.
Performs pre-flight checks on hardware, directories, Ollama connectivity,
and launches the FastAPI application server.
"""
import sys
import os
import uvicorn

# Ensure python version compatibility
if sys.version_info < (3, 10):
    print("Error: Python 3.10 or higher is required.")
    sys.exit(1)

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.config import settings
from app.services.llm_service import llm_service


def run_preflight_checks():
    """Verify directories, platform settings, and print hardware recommendations."""
    print("=" * 65)
    print(f"  {settings.APP_NAME} v{settings.VERSION}")
    print("  Local & Voice-Enabled AI Engineering Mentor")
    print("=" * 65)

    # 1. Ensure runtime directories
    settings.ensure_directories()
    print("  ✓ Storage directories verified (data/uploads, data/indexes, data/audio)")

    # 2. Hardware detection & recommendation
    hw = llm_service.get_hardware_recommendation()
    print(f"  ✓ System: {hw.get('system')} | RAM: {hw.get('detected_ram_gb', 'N/A')} GB")
    print(f"  ✓ Recommended Local Model: {hw.get('recommended_model')}")
    print(f"  ✓ Active Configured Model: {settings.OLLAMA_MODEL}")
    print(f"  ✓ Ollama URL: {settings.OLLAMA_BASE_URL}")

    # 3. Check Ollama process
    try:
        import httpx
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = [m.get("name") for m in resp.json().get("models", [])]
                print(f"  ✓ Ollama is ONLINE with {len(models)} model(s) installed: {models}")
            else:
                print(f"  ! Ollama responded with status {resp.status_code}")
    except Exception:
        print("  ! Notice: Ollama service is not currently running.")
        print("    The application will start, and the UI will guide you on running `ollama serve`.")

    print("=" * 65)
    print(f"  Starting server at: http://{settings.HOST}:{settings.PORT}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    run_preflight_checks()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
